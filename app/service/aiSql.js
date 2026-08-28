const Service = require("egg").Service;
const fs = require("fs");
const path = require("path");

let TABLE_SCHEMA = null;
let RULES_CACHE = null;
let REPORT_CATALOG = null;
let REPORT_CATALOG_TIME = 0;

function loadTableSchema(baseDir) {
	if (TABLE_SCHEMA) return TABLE_SCHEMA;
	const skillPath = path.join(baseDir, "app", "sql-skill.md");
	if (!fs.existsSync(skillPath)) return "";
	const raw = fs.readFileSync(skillPath, "utf-8");
	const idx = raw.indexOf("## 表关联关系");
	if (idx !== -1) {
		TABLE_SCHEMA = raw.substring(idx).trim();
	} else {
		TABLE_SCHEMA = raw;
	}
	return TABLE_SCHEMA;
}

function loadRulesAndExamples(baseDir) {
	if (RULES_CACHE) return RULES_CACHE;
	const rulesPath = path.join(baseDir, "app", "skill-rules.json");
	if (!fs.existsSync(rulesPath)) return { rules: [], fewShotExamples: [] };
	RULES_CACHE = JSON.parse(fs.readFileSync(rulesPath, "utf-8"));
	return RULES_CACHE;
}

function reloadAll() {
	TABLE_SCHEMA = null;
	RULES_CACHE = null;
	REPORT_CATALOG = null;
	REPORT_CATALOG_TIME = 0;
}

const STATIC_RULES = `
# 核心工作原则
1. 安全第一：绝不猜测敏感字段含义，若不确定字段是否敏感，默认不使用该字段进行查询或过滤
2. 性能优先：默认使用最优写法，避免全表扫描，合理使用索引字段
3. 结果可读：列名使用中文别名（双引号包裹），金额/小数格式化

# SQL 书写铁律（必须遵守）
1. 严禁 SELECT *，必须显式列出字段。但如果用户需求中明确提到"所有字段"或"全部字段"，则使用 SELECT *
2. 时间过滤：WHERE 条件中涉及时间的，必须命中索引字段，格式为：
   - 今日：COLUMN >= TRUNC(SYSDATE)
   - 昨日：COLUMN >= TRUNC(SYSDATE)-1 AND COLUMN < TRUNC(SYSDATE)
3. NULL 处理：数值计算（SUM/AVG）前必须用 NVL(COLUMN, 0) 包裹
4. 模糊查询：使用 LIKE，默认区分大小写，如需忽略大小写使用 UPPER()/LOWER()

# 金额处理
- 所有金额字段以分为单位，必须 /100 并保留两位小数：ROUND(NVL(AMOUNT, 0)/100, 2) AS "金额"

# 分区表处理（关键！）
1. 日分区表（以 yyyymmdd 结尾）：一般取 T-1 的日期，表名格式：表名_YYYYMMDD
   - 例如：今天是 2026-08-12，则表名为 rep2.rep_fact_ins_srvpkg_20260811
2. 月分区表（以 yyyymm 结尾）：必须拼接 2026 年以来所有月份 UNION ALL
   - 例如：rep2.rep_fact_payoff_consume_detail_202601 UNION ALL ... UNION ALL rep2.rep_fact_payoff_consume_detail_202608

# 输出格式
只输出完整的 Oracle SQL 语句（不含分号），不要输出任何解释说明。
SQL 中关键字大写（SELECT, FROM, WHERE, JOIN），表名/字段名保持原样。
SQL 第一行必须写注释 -- 由AI生成，请人工审核
用 \`\`\`sql 代码块包裹。`;

class AiSqlService extends Service {
	async _loadReportCatalog() {
		const now = Date.now();
		if (REPORT_CATALOG && now - REPORT_CATALOG_TIME < 5 * 60 * 1000) {
			return REPORT_CATALOG;
		}
		try {
			const sql = `SELECT rl.reportId, rl.reportName, rs.reportSqlData
				FROM report_list rl
				LEFT JOIN report_type rt ON rl.reportTypeId = rt.reportTypeId
				LEFT JOIN report_sql rs ON rl.reportId = rs.reportId
				WHERE rl.reportState = 1 AND rt.reportTypeName = '日报'
				ORDER BY rl.reportId, rs.reportSqlId`;
			const rows = await this.app.mysql.query(sql);
			const catalog = {};
			for (const row of rows) {
				if (!row.reportName || !row.reportSqlData) continue;
				if (!catalog[row.reportName]) {
					catalog[row.reportName] = [];
				}
				catalog[row.reportName].push(row.reportSqlData);
			}
			REPORT_CATALOG = catalog;
			REPORT_CATALOG_TIME = now;
			return catalog;
		} catch (e) {
			this.app.logger.warn("[aiSql] 加载日报SQL目录失败:", e.message);
			return REPORT_CATALOG || {};
		}
	}

	async _buildSystemPrompt() {
		const tableSchema = loadTableSchema(this.app.baseDir);
		const { rules, fewShotExamples } = loadRulesAndExamples(this.app.baseDir);

		let businessRules = "";
		if (rules.length > 0) {
			businessRules = "\n# 业务口径（重要！）\n";
			rules.forEach((r, i) => {
				businessRules += `${i + 1}. ${r.description}\n`;
				(r.details || []).forEach((d) => {
					businessRules += `   ${d}\n`;
				});
			});
		}

		let examples = "";
		if (fewShotExamples.length > 0) {
			examples = "\n## Few-Shot 示例\n";
			fewShotExamples.forEach((ex) => {
				examples += `\n**需求**：${ex.requirement}\n\n**返回**：\n\`\`\`sql\n${ex.sql}\n\`\`\`\n`;
			});
		}

		let reportCatalog = "";
		const catalog = await this._loadReportCatalog();
		const reportNames = Object.keys(catalog);
		if (reportNames.length > 0) {
			reportCatalog = "\n## 当前执行中的日报SQL参考\n";
			reportCatalog +=
				"当用户提到以下日报名称时，可参考对应SQL。日报SQL中 create table 的表名即固化表名（如 tmp_xxx_$4，$4为日期参数如20260731），可作为查询用的表。\n\n";
			for (const name of reportNames) {
				const sqls = catalog[name];
				const tableNames = [];
				for (const sql of sqls) {
					const match = sql.match(/create\s+table\s+(\S+)\s/i);
					if (match) tableNames.push(match[1]);
				}
				reportCatalog += `### ${name}\n`;
				if (tableNames.length > 0) {
					reportCatalog += `**固化表名**：${tableNames.join(", ")}\n\n`;
				}
				for (const sql of sqls) {
					reportCatalog += `\`\`\`sql\n${sql}\n\`\`\`\n\n`;
				}
			}
		}

		return `你是一名拥有 10 年经验的 Oracle 数据库开发专家，擅长 OLTP 系统的 Ad-hoc 查询（提数）和报表统计。
根据用户需求编写高效、准确的 Oracle SQL（支持 11g/12c/19c），适用于 PL/SQL Developer 直接执行。

${tableSchema}

${STATIC_RULES}
${businessRules}
${reportCatalog}
${examples}

现在请根据以下用户需求生成SQL：`;
	}

	async _callApi(requirement, attachmentText) {
		const systemPrompt = await this._buildSystemPrompt();
		const userMessage = attachmentText
			? `${requirement}\n${attachmentText}`
			: requirement;
		const { apiKey, baseURL, model, timeout } = this.config.deepseek;
		const url = `${baseURL}/chat/completions`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout || 30000);

		let resp;
		try {
			resp = await fetch(url, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Authorization: `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: "system", content: systemPrompt },
						{ role: "user", content: userMessage },
					],
					temperature: 0.1,
					max_tokens: 4096,
					stream: true,
				}),
				signal: controller.signal,
			});
		} catch (e) {
			if (e.name === "AbortError") {
				throw new Error(
					`DeepSeek API 请求超时（${(timeout || 30000) / 1000}秒），请稍后重试`,
				);
			}
			throw e;
		} finally {
			clearTimeout(timer);
		}

		if (!resp.ok) {
			const errText = await resp.text();
			throw new Error(
				`API返回错误(${resp.status}): ${errText.substring(0, 200)}`,
			);
		}

		return resp.body;
	}

	async generate(requirement, attachmentText) {
		this.ctx.service.skillConfig.savePrompt(requirement);
		const stream = await this._callApi(requirement, attachmentText);
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let fullContent = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim();
						if (data === "[DONE]") continue;
						try {
							const parsed = JSON.parse(data);
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) {
								fullContent += delta;
							}
						} catch (e) {
							// 跳过非JSON行
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		const sql = fullContent
			.replace(/```sql\s*/gi, "")
			.replace(/```\s*/g, "")
			.trim();
		return sql;
	}

	async *generateStream(requirement, attachmentText) {
		this.ctx.service.skillConfig.savePrompt(requirement);
		const stream = await this._callApi(requirement, attachmentText);
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let fullContent = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split("\n");

				for (const line of lines) {
					if (line.startsWith("data: ")) {
						const data = line.slice(6).trim();
						if (data === "[DONE]") continue;
						try {
							const parsed = JSON.parse(data);
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) {
								fullContent += delta;
								yield { type: "chunk", content: delta };
							}
						} catch (e) {
							// 跳过非JSON行
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		const sql = fullContent
			.replace(/```sql\s*/gi, "")
			.replace(/```\s*/g, "")
			.trim();
		yield { type: "done", sql, prompt: requirement };
	}

	async mergeDailyReports(templateHeaders, templateRows, dailyFiles) {
		let prompt = `你是一个数据处理助手。请将以下多个日报表的数据合并到模板表格式中。

## 模板表格式
列名：${templateHeaders.join(", ")}

样例数据：
`;
		for (const row of templateRows.slice(0, 5)) {
			prompt += row.map((c) => (c != null ? String(c) : "")).join("\t") + "\n";
		}

		prompt += "\n## 日报表数据\n";
		for (const daily of dailyFiles) {
			prompt += `\n### ${daily.filename}\n列名：${daily.headers.join(", ")}\n数据：\n`;
			for (const row of daily.rows) {
				prompt +=
					row.map((c) => (c != null ? String(c) : "")).join("\t") + "\n";
			}
		}

		prompt += `\n请将以上所有日报表的数据，按照模板表的列名进行匹配和合并，返回一个JSON数组，每个元素是一行数据，数组元素的顺序与模板表列名一致。

注意：
1. 日报表的列名可能与模板表不完全一致，请根据语义进行匹配合并
2. 如果日报表中缺少模板表的某些列，对应位置留空字符串
3. 数值类型保持原样，不要添加千分位逗号或特殊格式
4. 只返回JSON数组，不要任何其他文字说明

返回格式示例：
[["值1","值2","值3"],["值4","值5","值6"]]`;

		const { apiKey, baseURL, model, timeout } = this.config.deepseek;
		const url = `${baseURL}/chat/completions`;

		const resp = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.1,
				max_tokens: 16384,
				stream: false,
			}),
			signal: AbortSignal.timeout(timeout || 120000),
		});

		if (!resp.ok) {
			const errText = await resp.text();
			throw new Error(
				`API返回错误(${resp.status}): ${errText.substring(0, 200)}`,
			);
		}

		const data = await resp.json();
		const content = data.choices?.[0]?.message?.content || "";

		const jsonMatch = content.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			throw new Error("AI未返回有效数据，请重试");
		}

		return JSON.parse(jsonMatch[0]);
	}

	async generateChart(requirement, chartType, excelData) {
		const { apiKey, baseURL, model, timeout } = this.config.deepseek;
		const url = `${baseURL}/chat/completions`;

		const dataStr = JSON.stringify(excelData, null, 2);

		const prompt = `你是一个前端图表配置专家。请根据以下信息生成一个 ECharts (v5) 的 option 配置对象。

## 用户原始需求
${requirement}

## 图表类型
${chartType}

## 查询结果数据 (JSON数组，每行是一个对象)
${dataStr}

## 要求
1. 分析数据，自动识别哪些列适合做 X 轴（类别轴），哪些列适合做 Y 轴（数值轴）
2. 如果数据有多列数值，使用多系列（series）展示
3. 金额类数据需要以"元"为单位显示，如果数据是分需除以100
4. 使用合适的颜色方案
5. 添加 tooltip 提示框
6. 添加 legend 图例（如果有多系列）
7. 如果是柱状图，使用 bar 类型；饼图使用 pie 类型；折线图使用 line 类型
8. 只返回一个合法的 JSON 对象，不要有任何其他文字，不要用 \`\`\`json 包裹
9. 不要使用注释

返回格式示例（柱状图）：
{"tooltip":{"trigger":"axis"},"legend":{"data":["系列1","系列2"]},"xAxis":{"type":"category","data":["类别1","类别2"]},"yAxis":{"type":"value"},"series":[{"name":"系列1","type":"bar","data":[10,20]},{"name":"系列2","type":"bar","data":[15,25]}]}`;

		const resp = await fetch(url, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: "user", content: prompt }],
				temperature: 0.1,
				max_tokens: 4096,
				stream: false,
			}),
			signal: AbortSignal.timeout(timeout || 60000),
		});

		if (!resp.ok) {
			const errText = await resp.text();
			throw new Error(
				`API返回错误(${resp.status}): ${errText.substring(0, 200)}`,
			);
		}

		const data = await resp.json();
		const content = data.choices?.[0]?.message?.content || "";

		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			throw new Error("AI未返回有效的图表配置");
		}

		return JSON.parse(jsonMatch[0]);
	}
}

module.exports = AiSqlService;
module.exports.reloadAll = reloadAll;
