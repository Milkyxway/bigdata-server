// A/B 测试：RAG-lite 筛选表 vs 全量表，对比耗时和效果
const fs = require("fs");
const path = require("path");

const BASE_DIR = __dirname;
const SKILL_PATH = path.join(BASE_DIR, "app", "sql-skill.md");
const RULES_PATH = path.join(BASE_DIR, "app", "skill-rules.json");

// ===== parseSchema =====
function parseSchema() {
	const raw = fs.readFileSync(SKILL_PATH, "utf-8");
	const relIdx = raw.indexOf("## 表关联关系");
	const structIdx = raw.indexOf("## 表结构");
	let relationships = "";
	let tableSection = "";
	if (relIdx !== -1 && structIdx !== -1) {
		relationships = raw.substring(relIdx, structIdx).trim();
		tableSection = raw.substring(structIdx).trim();
	} else if (relIdx !== -1) {
		relationships = raw.substring(relIdx).trim();
	} else {
		relationships = raw;
	}

	const tables = [];
	const directoryLines = [];
	if (tableSection) {
		const blocks = tableSection.split(/(?=^###\s)/m);
		for (const block of blocks) {
			const trimmed = block.trim();
			if (!trimmed.startsWith("###")) continue;
			const headerMatch = trimmed.match(/^###\s+(\S+)\s*[（(]([^)）]*)/);
			if (!headerMatch) continue;
			const name = headerMatch[1].trim();
			const description = headerMatch[2] ? headerMatch[2].trim() : "";
			const keywords = new Set();
			description.split(/[，,、\s/()（）]+/).forEach(kw => {
				const k = kw.trim().toLowerCase();
				if (k.length >= 2) keywords.add(k);
			});
			const fieldMatches = trimmed.matchAll(/\|[^|]*\|[^|]*\|([^|]*)\|/g);
			for (const fm of fieldMatches) {
				const fieldDesc = fm[1].trim();
				fieldDesc.split(/[，,、=；;:\s()（）]+/).forEach(kw => {
					const k = kw.trim().toLowerCase();
					if (k.length >= 2 && !/^\d+$/.test(k)) keywords.add(k);
				});
			}
			tables.push({ name, description, keywords: [...keywords], schema: trimmed });
			directoryLines.push(`- ${name}（${description}）`);
		}
	}

	const adjacency = {};
	if (relationships) {
		for (const line of relationships.split("\n")) {
			if (!line.includes("|")) continue;
			const cells = line.split("|").map(c => c.trim()).filter(c => c.length > 0);
			if (cells.length < 4) continue;
			const mainTable = cells[0];
			const subTable = cells[2];
			if (!mainTable || !subTable) continue;
			if (mainTable === "主表" || subTable === "从表") continue;
			const mk = mainTable.toLowerCase();
			const sk = subTable.toLowerCase();
			if (!adjacency[mk]) adjacency[mk] = new Set();
			if (!adjacency[sk]) adjacency[sk] = new Set();
			adjacency[mk].add(sk);
			adjacency[sk].add(mk);
		}
	}

	return { relationships, tables, directory: directoryLines.join("\n"), adjacency };
}

// ===== selectTables =====
function selectTables(requirement, tables, adjacency) {
	const reqLower = (requirement || "").toLowerCase();
	const matchedNames = new Set();
	for (const table of tables) {
		for (const kw of table.keywords) {
			if (reqLower.includes(kw)) {
				matchedNames.add(table.name.toLowerCase());
				break;
			}
		}
	}
	const expandedNames = new Set(matchedNames);
	for (const name of matchedNames) {
		if (adjacency[name]) {
			for (const related of adjacency[name]) {
				expandedNames.add(related);
			}
		}
	}
	const result = expandedNames.size > 0
		? tables.filter(t => expandedNames.has(t.name.toLowerCase()))
		: tables;
	console.log(`  关键词匹配: ${[...matchedNames].join(", ") || "无"}`);
	console.log(`  最终选中 ${result.length} 张表 / 共 ${tables.length} 张`);
	return result.map(t => t.schema).join("\n\n");
}

// ===== 构建 system prompt =====
function buildSystemPrompt(requirement, useAllTables = false) {
	const parsed = parseSchema();
	let selectedSchemas;
	let tableSectionLabel;

	if (useAllTables) {
		selectedSchemas = parsed.tables.map(t => t.schema).join("\n\n");
		tableSectionLabel = "## 表结构（全量）";
	} else {
		selectedSchemas = selectTables(requirement, parsed.tables, parsed.adjacency);
		tableSectionLabel = "## 匹配表结构（根据需求自动筛选）";
	}

	let businessRules = "";
	if (fs.existsSync(RULES_PATH)) {
		const { rules, fewShotExamples } = JSON.parse(fs.readFileSync(RULES_PATH, "utf-8"));
		if (rules.length > 0) {
			businessRules = "\n# 业务口径（重要！）\n";
			rules.forEach((r, i) => {
				businessRules += `${i + 1}. ${r.description}\n`;
				(r.details || []).forEach(d => { businessRules += `   ${d}\n`; });
			});
		}
		if (fewShotExamples.length > 0) {
			businessRules += "\n## Few-Shot 示例\n";
			fewShotExamples.forEach(ex => {
				businessRules += `\n**需求**：${ex.requirement}\n\n**返回**：\n\`\`\`sql\n${ex.sql}\n\`\`\`\n`;
			});
		}
	}

	const STATIC_RULES = `
# 核心工作原则
1. 安全第一：绝不猜测敏感字段含义
2. 性能优先：默认使用最优写法，避免全表扫描
3. 结果可读：列名使用中文别名（双引号包裹），金额/小数格式化

# SQL 书写铁律（必须遵守）
1. 严禁臆想字段：SQL 中用到的所有字段名必须来自表结构定义
2. 严禁 SELECT *，必须显式列出字段
3. 时间过滤：WHERE 条件中涉及时间的，必须命中索引字段
4. NULL 处理：数值计算（SUM/AVG）前必须用 NVL(COLUMN, 0) 包裹
5. 严禁使用 WITH 语句（CTE），必须用子查询或临时表替代
6. 查询 files2.um_subscriber 表时，必须加条件 EXPIRE_DATE > SYSDATE

# 金额处理
- 所有金额字段以分为单位，必须 /100 并保留两位小数

# 分区表处理（关键！）
1. 日分区表（以 yyyymmdd 结尾）：大多数表取 T-1 日期
   - 严禁硬编码日期，必须根据当前日期和表规则动态计算
   - 但如果用户明确指定了日期，则使用用户指定的日期
2. 月分区表（以 yyyymm 结尾）：必须拼接 2026 年以来所有月份 UNION ALL

# 客户余额查询
当用户需求中提到"余额"、"账本余额"、"现金账本余额"等关键词时：
1. ASSET_ITEM_ID = 100 对应"通用现金账本"，即用户常说的"现金账本"
2. BALANCE 字段单位为分，用户说的金额为元，需 ×100 换算（50元=5000分，100元=10000分）
3. 余额表只有 ACCT_ID，需通过表关联关系中的 balance→cm_account→cust_info 链路获取广电站和地市
4. 无锡过滤：CORP_ORG_ID = 3303

# 输出格式
先输出一行任务名，格式为 --任务名：xxx，然后换行输出SQL。
只输出完整的 Oracle SQL 语句（不含分号），不要输出任何解释说明。
SQL 中关键字大写（SELECT, FROM, WHERE, JOIN），表名/字段名保持原样。
SQL 第一行必须写注释 -- 由AI生成，请人工审核
用 \`\`\`sql 代码块包裹。`;

	return `你是一名拥有 10 年经验的 Oracle 数据库开发专家，擅长 OLTP 系统的 Ad-hoc 查询（提数）和报表统计。
根据用户需求编写高效、准确的 Oracle SQL（支持 11g/12c/19c），适用于 PL/SQL Developer 直接执行。

${parsed.relationships}

## 可用表目录（如需其他表请参考上方表关联关系）
${parsed.directory}

${tableSectionLabel}
${selectedSchemas}

${STATIC_RULES}
${businessRules}

注意：当前日期是 ${new Date().toISOString().slice(0, 10)}，请基于此日期计算 T-1 分区表名。

现在请根据以下用户需求生成SQL：`;
}

// ===== 调用 API =====
async function callApi(label, baseURL, apiKey, model, requirement, useAllTables) {
	const systemPrompt = buildSystemPrompt(requirement, useAllTables);
	console.log(`[${label}] Prompt 长度: ${systemPrompt.length} 字符`);

	const start = Date.now();
	try {
		const resp = await fetch(`${baseURL}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [
					{ role: "system", content: systemPrompt },
					{ role: "user", content: requirement },
				],
				stream: false,
				max_tokens: 16384,
				temperature: 0.1,
			}),
		});

		if (!resp.ok) {
			const errText = await resp.text();
			console.log(`[${label}] HTTP ${resp.status}: ${errText.substring(0, 300)}`);
			return;
		}

		const data = await resp.json();
		const elapsed = ((Date.now() - start) / 1000).toFixed(1);
		const content = data.choices?.[0]?.message?.content || "";

		const sqlMatch = content.match(/```sql\s*([\s\S]*?)```/i);
		const sql = sqlMatch ? sqlMatch[1].trim() : content;

		console.log(`[${label}] 耗时: ${elapsed}s`);
		console.log(`[${label}] prompt_tokens: ${data.usage?.prompt_tokens}, completion_tokens: ${data.usage?.completion_tokens}`);
		console.log(`[${label}] ===== 生成 SQL =====`);
		console.log(sql);
		console.log(`[${label}] ====================\n`);
		return { elapsed, promptTokens: data.usage?.prompt_tokens, completionTokens: data.usage?.completion_tokens, sql };
	} catch (err) {
		const elapsed = ((Date.now() - start) / 1000).toFixed(1);
		console.log(`[${label}] 耗时: ${elapsed}s, 错误: ${err.message}\n`);
		return { elapsed, error: err.message };
	}
}

// ===== 主入口 =====
(async () => {
	const requirement = "查询20260831无锡现金账本余额<50，及50-100之间的去重用户数 按照广电站聚合";
	const baseURL = "http://modelrouter.js96296.com/v1";
	const apiKey = "sk-H8UF0IsSBUERzOMCoVJfO9TA7WNDoOQ19nupd5qlv5m0SuzG";
	const model = "glm-5.3";

	console.log("========================================");
	console.log("A/B 测试需求:", requirement);
	console.log("========================================\n");

	// A: 全量表（改进前）
	console.log("【A】全量表模式（改进前）：");
	const resultA = await callApi("全量表", baseURL, apiKey, model, requirement, true);

	// B: RAG-lite 筛选表（改进后）
	console.log("【B】RAG-lite 筛选模式（改进后）：");
	console.log("  RAG-lite 匹配:");
	const resultB = await callApi("RAG-lite", baseURL, apiKey, model, requirement, false);

	// 汇总对比
	console.log("========================================");
	console.log("对比汇总");
	console.log("========================================");
	console.log("指标            | 全量表(A)      | RAG-lite(B)");
	console.log("---------------|---------------|---------------");
	console.log(`Prompt 长度     | ${(resultA?.promptTokens || '-')} tokens    | ${(resultB?.promptTokens || '-')} tokens`);
	console.log(`耗时            | ${resultA?.elapsed}s          | ${resultB?.elapsed}s`);
	console.log(`completion_tokens| ${resultA?.completionTokens || '-'}          | ${resultB?.completionTokens || '-'}`);
	console.log("\n测试完成。");
})();