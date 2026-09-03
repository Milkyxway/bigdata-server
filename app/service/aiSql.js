const Service = require("egg").Service;
const fs = require("fs");
const path = require("path");

let TABLE_SCHEMA = null;
let RULES_CACHE = null;

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
}

const STATIC_RULES = `
# 核心工作原则
1. 安全第一：绝不猜测敏感字段含义，若不确定字段是否敏感，默认不使用该字段进行查询或过滤
2. 性能优先：默认使用最优写法，避免全表扫描，合理使用索引字段
3. 结果可读：列名使用中文别名（双引号包裹），金额/小数格式化

# SQL 书写铁律（必须遵守）
1. 严禁臆想字段：SQL 中用到的所有字段名必须来自表结构定义，不得自行编造字段名
2. 严禁 SELECT *，必须显式列出字段。但如果用户需求中明确提到"所有字段"或"全部字段"，则使用 SELECT *
3. 时间过滤：WHERE 条件中涉及时间的，必须命中索引字段，格式为：
   - 今日：COLUMN >= TRUNC(SYSDATE)
   - 昨日：COLUMN >= TRUNC(SYSDATE)-1 AND COLUMN < TRUNC(SYSDATE)
4. NULL 处理：数值计算（SUM/AVG）前必须用 NVL(COLUMN, 0) 包裹
5. 模糊查询：使用 LIKE，默认区分大小写，如需忽略大小写使用 UPPER()/LOWER()
6. 严禁使用 WITH 语句（CTE），必须用子查询或临时表替代
7. 查询 files2.um_subscriber 表时，必须加条件 EXPIRE_DATE > SYSDATE，过滤已失效终端
8. 查询终端明细时，取 um_subscriber 表的以下字段：BILL_ID（机顶盒号）、SUBSCRIBER_INS_ID、LOGIN_NAME（宽带账号名）、EXPIRE_DATE、SUBSCRIBER_TYPE（1=电视,3=宽带，需用 CASE WHEN 转中文）、SUB_BILL_ID（卡号）

# 金额处理
- 所有金额字段以分为单位，必须 /100 并保留两位小数：ROUND(NVL(AMOUNT, 0)/100, 2) AS "金额"

# 分区表处理（关键！）
1. 日分区表（以 yyyymmdd 结尾）：大多数表取 T-1 日期，即 TRUNC(SYSDATE)-1
   - 表名计算方式：TO_CHAR(TRUNC(SYSDATE)-1, 'YYYYMMDD')
   - 特例：DWA_KD_BEHAVIOR_UPDATE、DWA_CRM_KD_BEHAVIOR（宽带使用记录表）取 T-4，即 TRUNC(SYSDATE)-4
   - 如果今天是 2026-08-21，则 T-1 为 20260820，T-4 为 20260817
   - 严禁硬编码日期，必须根据当前日期和表规则动态计算
2. 月分区表（以 yyyymm 结尾）：必须拼接 2026 年以来所有月份 UNION ALL
   - 例如：rep2.rep_fact_payoff_consume_detail_202601 UNION ALL ... UNION ALL rep2.rep_fact_payoff_consume_detail_202608

# 包年宽带周报表名映射（重要！）
当用户提到以下日报名称时，使用对应的固化表名，$4 替换为 T-1 的 yyyymmdd：
| 用户提到的名称 | 固化表名 |
| 包年宽带到期周报 | tmp_bnkddqzb_$4 |
| 包年宽带续订周报 | tmp_bnkdxdzb_$4 |
| 江阴包年宽带到期周报 | tmp_bnkddqzb_jy_$4 |
| 江阴包年宽带续订周报 | tmp_bnkdxdzb_jy_$4 |
| 宜兴包年宽带到期周报 | tmp_bnkddqzb_yx_$4 |
| 宜兴包年宽带续订周报 | tmp_bnkdxdzb_yx_$4 |
| 江阴宜兴本年包年宽带订购明细 | tmp_jyyx_dgzc_$4 |

# 宽带行为记录查询（重要！）
宽带行为记录由两张表 UNION 合并组成完整数据：
1. rep.DWA_CRM_KD_BEHAVIOR_yyyymmdd：序列号字段为 PROD_INST_ID，时长字段为 PLAY_DURATION
2. rep.DWA_KD_BEHAVIOR_UPDATE_yyyymmdd：序列号字段为 SUBSCRIBER_INS_ID，时长字段为 ONLINE_DURATION
查询宽带行为时，必须 UNION 这两张表，序列号统一别名为"序列号"后可与 files2.um_subscriber.SUBSCRIBER_INS_ID 关联终端信息。
宽带活跃定义：UNION 后的时长字段 >= 10800（即 3 小时）为活跃。
UNION 模板：
SELECT DISTINCT be.cust_code, be.prod_inst_id AS 序列号, be.play_duration AS 时长, 'CRM' AS 来源
FROM rep.DWA_CRM_KD_BEHAVIOR_yyyymmdd be
UNION
SELECT DISTINCT be2.cust_code, be2.subscriber_ins_id AS 序列号, be2.online_duration AS 时长, 'UPDATE' AS 来源
FROM rep.DWA_KD_BEHAVIOR_UPDATE_yyyymmdd be2

# 移网/5G表统计口径（重要！）
表名：repcx.rep_fact_yw_um_subscriber_info_yyyymmdd（日分区，取 T-1 日期）
所有统计指标均对 user_id 去重：
| 指标 | 条件 | SQL 写法 |
| 在网数 | onnet_status = '1' | COUNT(DISTINCT user_id) |
| 活跃数 | is_30d_active_2023 = '1' | COUNT(DISTINCT user_id) |
| 开通数 | user_status IN ('1', 'E') | COUNT(DISTINCT user_id) |

# 移网/5G出账金额分站查询（重要！）
涉及两张表关联：
1. repcx.rep_fact_yw_um_subscriber_info_$a4：移网/5G终端信息表，$a4 = 上月底最后一天（yyyymmdd），计算方式：TO_CHAR(LAST_DAY(ADD_MONTHS(SYSDATE, -1)), 'YYYYMMDD')
2. repcx.ADS_ITEM_USER_BILL_M_$1：出账金额表（月分区），$1 = 上月（yyyymm），计算方式：TO_CHAR(ADD_MONTHS(SYSDATE, -1), 'YYYYMM')
关联方式：yw.user_id(+) = aiub.user_id（移网表右连接出账表）
主副卡判断：pri_card_id IS NULL 为主卡，IS NOT NULL 为副卡
出账金额字段：fact
无锡过滤：corp_org_id = 3303

查询模板（出账金额）：
SELECT yw.department_name AS "广电站",
       SUM(CASE WHEN aiub.pri_card_id IS NULL THEN aiub.fact END) AS "主卡出账金额",
       SUM(CASE WHEN aiub.pri_card_id IS NOT NULL THEN aiub.fact END) AS "副卡出账金额"
FROM repcx.ADS_ITEM_USER_BILL_M_$1 aiub,
     repcx.rep_fact_yw_um_subscriber_info_$a4 yw
WHERE yw.user_id(+) = aiub.user_id
  AND aiub.corp_org_id = 3303
GROUP BY yw.department_name

查询模板（出账卡数，fact>0）：
SELECT yw.department_name AS "广电站",
       COUNT(DISTINCT CASE WHEN aiub.pri_card_id IS NULL THEN yw.access_num END) AS "主卡出账卡数",
       COUNT(DISTINCT CASE WHEN aiub.pri_card_id IS NOT NULL THEN yw.access_num END) AS "副卡出账卡数"
FROM repcx.ADS_ITEM_USER_BILL_M_$1 aiub,
     repcx.rep_fact_yw_um_subscriber_info_$a4 yw
WHERE yw.user_id(+) = aiub.user_id
  AND aiub.corp_org_id = 3303
  AND aiub.fact > 0
GROUP BY yw.department_name
注：$1 = 上月（yyyymm），$a4 = 上月底最后一天（yyyymmdd）

# 图表生成（重要！）
当用户需求中提到"生成图表"、"生成柱状图"、"生成饼状图"、"生成折线图"、"画图"、"可视化"等关键词时：
1. 说明用户需要图表展示，系统会自动触发图表生成流程（ECharts渲染），你只需正常生成SQL即可
2. SQL 查询结果应包含至少一个类别列（X轴）和至少一个数值列（Y轴），便于后续图表渲染
3. 列名使用中文别名，图表生成时会自动识别为坐标轴名称

# 输出格式
只输出完整的 Oracle SQL 语句（不含分号），不要输出任何解释说明。
SQL 中关键字大写（SELECT, FROM, WHERE, JOIN），表名/字段名保持原样。
SQL 第一行必须写注释 -- 由AI生成，请人工审核
用 \`\`\`sql 代码块包裹。`;

class AiSqlService extends Service {
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

		return `你是一名拥有 10 年经验的 Oracle 数据库开发专家，擅长 OLTP 系统的 Ad-hoc 查询（提数）和报表统计。
根据用户需求编写高效、准确的 Oracle SQL（支持 11g/12c/19c），适用于 PL/SQL Developer 直接执行。

${tableSchema}

${STATIC_RULES}
${businessRules}
${examples}

注意：当前日期是 ${new Date().toISOString().slice(0, 10)}，请基于此日期计算 T-1 分区表名。

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

		const sampleData = excelData.slice(0, 50);
		const dataStr = JSON.stringify(sampleData, null, 2);
		const totalRows = excelData.length;
		const columns = excelData.length > 0 ? Object.keys(excelData[0]) : [];

		const prompt = `你是一个数据分析与图表配置专家。请根据用户需求和查询结果数据，智能生成一个 ECharts (v5) 的 option 配置对象。

## 用户需求
${requirement}

## 数据概览
- 总行数：${totalRows}（前端渲染时使用全部数据，这里仅展示前50行用于分析）
- 列名：${columns.join(', ')}
- 图表类型偏好：${chartType}

## 数据样本 (前50行)
${dataStr}

## 分析步骤（请在脑中完成，不要输出）
### 第一步：分析数据结构
1. 识别每列的数据类型：文本/类别列、数值列、日期列
2. 统计每列的去重值数量，判断哪些列适合做 X 轴（类别列去重数少、有规律）
3. 找出所有数值列（int/float 类型），这些是 Y 轴候选

### 第二步：决定图表策略
1. 如果用户只说"柱状图"但数据有多个数值列 → 自动创建多系列柱状图对比（如"销售额"和"利润"并列展示）
2. 如果数据有日期列 → 用日期列做 X 轴，适合折线图展示趋势
3. 如果只有一个类别列 + 一个数值列，且类别数 ≤ 8 → 饼图更直观
4. 如果有"分组"含义的列（如"地区"、"月份"、"业务类型"）+ 多个数值列 → 多系列柱状图/折线图
5. 如果列名含有"对比"、"同比"、"环比"、"增长率"等 → 必须用多系列展示

### 第三步：智能格式化
1. 列名含"金额/费用/收入/欠费/提成/amount/fee/price" → 数值可能以分为单位，除以100，加"元"后缀
2. 列名含"率/比例/占比/percent/rate/ratio" → 加"%"后缀
3. 列名含"数/量/户/个/笔/count" → 整数格式，不加后缀
4. 数值过大（>10000）→ 用万/亿单位或逗号分隔

## 配色方案
使用以下清新的配色（按顺序循环使用）：
['#5470C6', '#91CC75', '#FAC858', '#EE6666', '#73C0DE', '#3BA272', '#FC8452', '#9A60B4']

## 图表配置要求
1. tooltip: 必须启用，trigger 柱状/折线图用 'axis'，饼图用 'item'，格式化显示数值和单位
2. legend: 多系列时必须显示，单系列可省略
3. grid: 留出合理边距 {left:'3%', right:'4%', bottom:'15%', top:'15%', containLabel:true}
4. xAxis: 如果标签文字过长（>5个字），设置 axisLabel.rotate: 30
5. yAxis: 数值轴，设置 name 为数值单位（如"元"、"户"等）
6. 饼图特有：使用 radius: ['40%', '70%'] 做环形饼图，label 显示名称+百分比
7. 如果数据行数 > 20，添加 dataZoom: [{type: 'slider', start: 0, end: 100}] 支持滚动
8. 柱状图柱宽自适应，不要挤在一起
9. 所有文本颜色使用 #333，保证可读性

## 输出要求
只返回一个合法的 JSON 对象，不要有任何其他文字，不要用 \`\`\`json 包裹，不要注释。

示例（两柱对比柱状图）：
{"tooltip":{"trigger":"axis","axisPointer":{"type":"shadow"}},"legend":{"data":["新增用户","活跃用户"]},"grid":{"left":"3%","right":"4%","bottom":"15%","containLabel":true},"xAxis":{"type":"category","data":["无锡","苏州","常州"],"axisLabel":{"rotate":0}},"yAxis":{"type":"value","name":"用户数"},"color":["#5470C6","#91CC75"],"series":[{"name":"新增用户","type":"bar","data":[1200,980,650]},{"name":"活跃用户","type":"bar","data":[8500,7200,5100]}]}`;

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

		let jsonStr = jsonMatch[0];

		try {
			return JSON.parse(jsonStr);
		} catch (parseErr) {
			this.ctx.logger.warn("[generateChart] JSON解析失败，尝试修复:", parseErr.message);

			jsonStr = jsonStr
				.replace(/,\s*}/g, "}")
				.replace(/,\s*\]/g, "]")
				.replace(/,\s*,/g, ",");

			try {
				return JSON.parse(jsonStr);
			} catch (repairErr) {
				this.ctx.logger.error("[generateChart] 修复后仍解析失败，原始内容:", content);
				throw new Error(
					`AI返回的图表配置格式有误: ${repairErr.message}`,
				);
			}
		}
	}
}

module.exports = AiSqlService;
module.exports.reloadAll = reloadAll;