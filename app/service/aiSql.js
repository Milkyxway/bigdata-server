const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');

let TABLE_SCHEMA = null;

function loadTableSchema(baseDir) {
	if (TABLE_SCHEMA) return TABLE_SCHEMA;
	const skillPath = path.join(baseDir, 'app', 'sql-skill.md');
	const raw = fs.readFileSync(skillPath, 'utf-8');
	const idx = raw.indexOf('## 表关联关系');
	if (idx !== -1) {
		TABLE_SCHEMA = raw.substring(idx).trim();
	} else {
		TABLE_SCHEMA = raw;
	}
	return TABLE_SCHEMA;
}

const SQL_RULES = `
# 核心工作原则
1. 安全第一：绝不猜测敏感字段含义，若不确定字段是否敏感，默认不使用该字段进行查询或过滤
2. 性能优先：默认使用最优写法，避免全表扫描，合理使用索引字段
3. 结果可读：列名使用中文别名（双引号包裹），金额/小数格式化

# SQL 书写铁律（必须遵守）
1. 严禁 SELECT *，必须显式列出字段
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

# 业务口径（重要！）
1. 广电站查询：如果需求提到"xx广电站"，WHERE 条件写成 district_name LIKE '%xx%'（不要用 = 精确匹配）
2. 客户明细查询：如果需求带有"客户明细"，取以下字段：
   SELECT c.cust_code AS "客户证号", c.district_name AS "广电站", c.party_name AS "客户姓名",
          c.cont_number AS "联系电话1", c.cont_number2 AS "联系电话2",
          c.family_number AS "家庭号1", c.family_number2 AS "家庭号2",
          c.stand_name AS "站点名称"
   FROM rep2.rep_fact_cust_info_yyyymmdd c
3. 客户明细到网格：如果需求提到"客户明细"且要"到网格"或"网格名称"，JOIN SZJFGRID.CUST_TOJF grid_rel ON c.cust_code = grid_rel.cust_code(+)
   LEFT JOIN szjfgrid.grid_tojf grid ON grid_rel.ms_area_id = grid.grid_id(+)，并额外取 grid.grid_name AS "网格名称"
4. 缴费客户：需求提到"缴费客户"即数字电视缴费或宽带缴费或互动缴费，条件为 rep2.rep_fact_um_subscriber_yyyymmdd 中 is_paied = 1 OR is_lan_paied = 1 OR is_dbitv_paied = 1
5. 产品明细：需求提到"产品明细"时，取 rep2.rep_fact_ins_srvpkg_yyyymmdd 的 SRVPKG_NAME, SRVPKG_ID, CREATE_DATE, VALID_DATE, EXPIRE_DATE, SUBSCRIBER_INS_ID
6. 二合一/三合一终端：需求提到"二合一"、"三合一"、"二合一三合一"或"光猫"时，条件为 files2.um_res 的 RES_SKU_ID IN ('1153930','1153929','1153909','1151326','552044690','11538006','11538003')
7. 附件Excel处理：如果用户消息中包含"附件Excel内容如下"，说明用户上传了Excel文件。需要将Excel中的字段值作为SQL的查询条件（如 WHERE IN、JOIN ON、多条件OR等），根据Excel列名匹配skill中对应的表字段，合理使用Excel中的值生成查询SQL

# 输出格式
只输出完整的 Oracle SQL 语句（不含分号），不要输出任何解释说明。
SQL 中关键字大写（SELECT, FROM, WHERE, JOIN），表名/字段名保持原样。
SQL 第一行必须写注释 -- 由AI生成，请人工审核
用 \`\`\`sql 代码块包裹。`;

class AiSqlService extends Service {
	_buildSystemPrompt() {
		const tableSchema = loadTableSchema(this.app.baseDir);
		return `你是一名拥有 10 年经验的 Oracle 数据库开发专家，擅长 OLTP 系统的 Ad-hoc 查询（提数）和报表统计。
根据用户需求编写高效、准确的 Oracle SQL（支持 11g/12c/19c），适用于 PL/SQL Developer 直接执行。

${tableSchema}

${SQL_RULES}

## Few-Shot 示例

**需求**：查询无锡地区昨天新开通的宽带用户数，按广电站分组

**返回**：
\`\`\`sql
SELECT t.district_name AS "广电站", COUNT(DISTINCT s.subscriber_ins_id) AS "新增宽带用户数"
FROM rep2.rep_fact_ins_srvpkg_20260811 t
JOIN files2.um_subscriber s ON t.subscriber_ins_id = s.subscriber_ins_id
WHERE t.prod_service_id = '1004'
  AND t.srvpkg_state = '1'
  AND t.srvpkg_os_status IS NULL
  AND s.corp_org_id = '3303'
  AND t.create_date >= TO_CHAR(TRUNC(SYSDATE)-1, 'YYYYMMDD')
  AND t.create_date < TO_CHAR(TRUNC(SYSDATE), 'YYYYMMDD')
GROUP BY t.district_name
\`\`\`

**需求**：查询本月各业务类型的订购量

**返回**：
\`\`\`sql
SELECT CASE PROD_SERVICE_ID WHEN '1002' THEN '电视' WHEN '1003' THEN '互动' WHEN '1004' THEN '宽带' WHEN '1005' THEN '付费节目' WHEN '1006' THEN '互动点播' WHEN '1008' THEN '增值业务' ELSE '未知' END AS "业务类型", COUNT(*) AS "订购量"
FROM rep2.rep_fact_ins_srvpkg_20260811
WHERE srvpkg_state = '1'
  AND srvpkg_os_status IS NULL
  AND create_date >= TO_CHAR(TRUNC(SYSDATE, 'MM'), 'YYYYMMDD')
GROUP BY PROD_SERVICE_ID
\`\`\`

**需求**：查询当前所有欠费客户的欠费总额

**返回**：
\`\`\`sql
SELECT c.cust_code AS "客户证号", c.cust_id AS "客户ID", SUM(ROUND(NVL(u.fee, 0)/100, 2)) AS "欠费总额(元)"
FROM rep2.rep_fact_unpay_20260811 u
JOIN files2.cm_account a ON u.acct_id = a.acct_id
JOIN rep2.rep_fact_cust_info_20260811 c ON a.cust_id = c.cust_id
GROUP BY c.cust_code, c.cust_id
ORDER BY SUM(ROUND(NVL(u.fee, 0)/100, 2)) DESC
\`\`\`

现在请根据以下用户需求生成SQL：`;
	}

	async _callApi(requirement, attachmentText) {
		const systemPrompt = this._buildSystemPrompt();
		const userMessage = attachmentText ? `${requirement}\n${attachmentText}` : requirement;
		const { apiKey, baseURL, model, timeout } = this.config.deepseek;
		const url = `${baseURL}/chat/completions`;

		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), timeout || 30000);

		let resp;
		try {
			resp = await fetch(url, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer ${apiKey}`,
				},
				body: JSON.stringify({
					model,
					messages: [
						{ role: 'system', content: systemPrompt },
						{ role: 'user', content: userMessage },
					],
					temperature: 0.1,
					max_tokens: 4096,
					stream: true,
				}),
				signal: controller.signal,
			});
		} catch (e) {
			if (e.name === 'AbortError') {
				throw new Error(`DeepSeek API 请求超时（${(timeout || 30000) / 1000}秒），请稍后重试`);
			}
			throw e;
		} finally {
			clearTimeout(timer);
		}

		if (!resp.ok) {
			const errText = await resp.text();
			throw new Error(`API返回错误(${resp.status}): ${errText.substring(0, 200)}`);
		}

		return resp.body;
	}

	async generate(requirement, attachmentText) {
		const stream = await this._callApi(requirement, attachmentText);
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let fullContent = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6).trim();
						if (data === '[DONE]') continue;
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
			.replace(/```sql\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();
		return sql;
	}

	async *generateStream(requirement, attachmentText) {
		const stream = await this._callApi(requirement, attachmentText);
		const reader = stream.getReader();
		const decoder = new TextDecoder();
		let fullContent = '';

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				const chunk = decoder.decode(value, { stream: true });
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6).trim();
						if (data === '[DONE]') continue;
						try {
							const parsed = JSON.parse(data);
							const delta = parsed.choices?.[0]?.delta?.content;
							if (delta) {
								fullContent += delta;
								yield { type: 'chunk', content: delta };
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
			.replace(/```sql\s*/gi, '')
			.replace(/```\s*/g, '')
			.trim();
		yield { type: 'done', sql };
	}
}

module.exports = AiSqlService;