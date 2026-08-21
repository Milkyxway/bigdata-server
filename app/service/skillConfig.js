'use strict';

const Service = require('egg').Service;
const fs = require('fs');
const path = require('path');

class SkillConfigService extends Service {

	_getSkillMdPath() {
		return path.join(this.app.baseDir, 'app', 'sql-skill.md');
	}

	_getRulesJsonPath() {
		return path.join(this.app.baseDir, 'app', 'skill-rules.json');
	}

	_parseTableNameAndAlias(line) {
		const match = line.match(/^###\s+(.+?)（(.+?)）$/);
		if (match) {
			return { fullName: match[1].trim(), alias: match[2].trim() };
		}
		const match2 = line.match(/^###\s+(.+?)$/);
		if (match2) {
			return { fullName: match2[1].trim(), alias: '' };
		}
		return null;
	}

	_parseTableSchema(rawMd) {
		const tables = [];
		const lines = rawMd.split('\n');
		let i = 0;
		while (i < lines.length) {
			const line = lines[i].trim();
			const tableInfo = this._parseTableNameAndAlias(line);
			if (tableInfo) {
				const fields = [];
				i++;
				let skipHeader = false;
				while (i < lines.length) {
					const sub = lines[i].trim();
					if (sub.startsWith('|')) {
						const parts = sub.split('|').map(s => s.trim()).filter(Boolean);
						if (!skipHeader && (parts[0] === '字段名' || parts[0] === ':' || parts[0].startsWith(':') || sub.includes('---'))) {
							skipHeader = true;
							i++;
							continue;
						}
						if (parts.length >= 3 && parts[0] !== '字段名' && !parts[0].startsWith(':')) {
							fields.push({
								name: parts[0],
								type: parts[1] || '',
								description: parts[2] || '',
							});
						}
					} else if (sub === '' || sub.startsWith('###') || sub.startsWith('##')) {
						break;
					}
					i++;
				}
				if (fields.length > 0) {
					tables.push({
						fullName: tableInfo.fullName,
						alias: tableInfo.alias,
						fields,
					});
				}
			} else {
				i++;
			}
		}
		return tables;
	}

	_parseRelations(rawMd) {
		const relations = [];
		const lines = rawMd.split('\n');
		let inRelationTable = false;
		let headerParsed = false;
		for (const line of lines) {
			const trimmed = line.trim();
			if (trimmed.includes('## 表关联关系')) {
				inRelationTable = true;
				headerParsed = false;
				continue;
			}
			if (inRelationTable) {
				if (trimmed.startsWith('|') && trimmed.includes(':') && !trimmed.includes('---')) {
					if (!headerParsed) {
						headerParsed = true;
						continue;
					}
					const parts = trimmed.split('|').map(s => s.trim()).filter(Boolean);
					if (parts.length >= 5) {
						relations.push({
							table1: parts[0],
							field1: parts[1],
							table2: parts[2],
							field2: parts[3],
							relationType: parts[4] || '',
							description: parts[5] || '',
						});
					}
				} else if (trimmed === '' || (trimmed.startsWith('##') && !trimmed.includes('表关联关系'))) {
					inRelationTable = false;
				}
			}
		}
		return relations;
	}

	async getConfig() {
		const skillMdPath = this._getSkillMdPath();
		const rulesJsonPath = this._getRulesJsonPath();

		let tables = [];
		let relations = [];
		let rules = [];
		let fewShotExamples = [];

		if (fs.existsSync(skillMdPath)) {
			const rawMd = fs.readFileSync(skillMdPath, 'utf-8');
			tables = this._parseTableSchema(rawMd);
			relations = this._parseRelations(rawMd);
		}

		if (fs.existsSync(rulesJsonPath)) {
			const jsonData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
			rules = jsonData.rules || [];
			fewShotExamples = jsonData.fewShotExamples || [];
		}

		return { tables, relations, rules, fewShotExamples };
	}

	_generateTableMarkdown(table) {
		let md = `### ${table.fullName}`;
		if (table.alias) {
			md += `（${table.alias}）`;
		}
		md += '\n';
		md += '| 字段名 | 类型 | 说明 |\n';
		md += '| :----- | :--- | :--- |\n';
		for (const field of table.fields) {
			md += `| ${field.name} | ${field.type} | ${field.description} |\n`;
		}
		return md;
	}

	_generateRelationMarkdown(relations) {
		let md = '## 表关联关系\n\n';
		md += '| 表1 | 字段1 | 表2 | 字段2 | 关系 | 说明 |\n';
		md += '| :--- | :---- | :--- | :---- | :--- | :--- |\n';
		for (const rel of relations) {
			md += `| ${rel.table1} | ${rel.field1} | ${rel.table2} | ${rel.field2} | ${rel.relationType} | ${rel.description} |\n`;
		}
		return md;
	}

	_saveSkillMd(tables, relations) {
		const skillMdPath = this._getSkillMdPath();
		const existingContent = fs.readFileSync(skillMdPath, 'utf-8');

		const headerMatch = existingContent.match(/^([\s\S]*?)(?=## 表关联关系)/);
		const headerSection = headerMatch ? headerMatch[1] : existingContent.split('## 表结构')[0] || '';

		let md = headerSection.trimEnd() + '\n\n';
		md += this._generateRelationMarkdown(relations);
		md += '\n## 表结构\n\n';
		for (const table of tables) {
			md += this._generateTableMarkdown(table) + '\n\n';
		}

		fs.writeFileSync(skillMdPath, md.trimEnd() + '\n', 'utf-8');
	}

	_saveRulesJson(rules, fewShotExamples) {
		const rulesJsonPath = this._getRulesJsonPath();
		fs.writeFileSync(rulesJsonPath, JSON.stringify({ rules, fewShotExamples }, null, 2), 'utf-8');
	}

	_reloadCache() {
		const aiSql = require('./aiSql');
		this.app.logger.info('[skillConfig] reloadCache: aiSql.reloadAll 存在=', typeof aiSql.reloadAll, 'type=', typeof aiSql);
		if (typeof aiSql.reloadAll === 'function') {
			aiSql.reloadAll();
			this.app.logger.info('[skillConfig] reloadCache: 已调用 reloadAll()');
		} else {
			this.app.logger.warn('[skillConfig] reloadCache: aiSql.reloadAll 不是函数，无法清缓存');
			delete require.cache[require.resolve('./aiSql')];
			const fresh = require('./aiSql');
			if (typeof fresh.reloadAll === 'function') {
				fresh.reloadAll();
				this.app.logger.info('[skillConfig] reloadCache: 重新加载后调用 reloadAll()');
			}
		}
	}

	async aiAppend(rawText) {
		if (!rawText || !rawText.trim()) {
			return { success: false, message: '内容不能为空' };
		}

		this.app.logger.info('[skillConfig] aiAppend 开始, 内容:', rawText.substring(0, 100));

		const { apiKey, baseURL, model, timeout } = this.config.deepseek;
		const url = `${baseURL}/chat/completions`;

		const existingConfig = await this.getConfig();
		const existingTables = existingConfig.tables.map(t => t.fullName).join(', ');
		this.app.logger.info('[skillConfig] 已有表:', existingTables || '无');

		const prompt = `你是一个skill知识库管理助手。用户会给你一段自然语言描述（可能包含SQL），请分析这段内容，判断它属于以下哪种类型，并以JSON格式输出：

1. "table" - 描述了一张数据库表结构（含表名、字段名、字段类型、字段说明）
2. "relation" - 描述了表与表之间的关联关系
3. "rule" - 描述了一条业务规则或查询口径
4. "example" - 包含了一个"需求->SQL"的示例

当前知识库中已有的表：${existingTables || '无'}

请输出JSON，格式根据类型不同：

如果是 table：
{"type":"table","tableName":"schema.table_name","alias":"中文别名","fields":[{"name":"字段名","type":"字段类型","description":"字段说明"}]}

如果是 relation：
{"type":"relation","table1":"表1","field1":"字段1","table2":"表2","field2":"字段2","relationType":"1:1 或 1:N 或 N:1","description":"关联说明"}

如果是 rule：
{"type":"rule","description":"规则描述","details":["补充说明1","补充说明2"]}

如果是 example：
{"type":"example","requirement":"需求描述","sql":"完整的SQL语句"}

注意：
- 只输出JSON，不要任何其他文字
- 如果内容包含多个类型，选择最匹配的一种
- 字段名保持原样（包括大小写）
- 如果无法判断类型，type设为"rule"

用户输入：
${rawText.trim()}`;

		const resp = await fetch(url, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				'Authorization': `Bearer ${apiKey}`,
			},
			body: JSON.stringify({
				model,
				messages: [{ role: 'user', content: prompt }],
				temperature: 0.1,
				max_tokens: 4096,
				stream: false,
			}),
			signal: AbortSignal.timeout(timeout || 30000),
		});

		if (!resp.ok) {
			const errText = await resp.text();
			this.app.logger.error('[skillConfig] DeepSeek API 失败:', errText.substring(0, 200));
			return { success: false, message: `AI识别失败: ${errText.substring(0, 100)}` };
		}

		const data = await resp.json();
		const content = data.choices?.[0]?.message?.content || '';
		this.app.logger.info('[skillConfig] DeepSeek 返回:', content.substring(0, 200));

		const jsonMatch = content.match(/\{[\s\S]*\}/);
		if (!jsonMatch) {
			this.app.logger.error('[skillConfig] 未找到JSON:', content);
			return { success: false, message: 'AI未能识别内容类型，请手动选择分类' };
		}

		let parsed;
		try {
			parsed = JSON.parse(jsonMatch[0]);
		} catch (e) {
			this.app.logger.error('[skillConfig] JSON解析失败:', jsonMatch[0]);
			return { success: false, message: 'AI返回格式异常，请重试' };
		}

		this.app.logger.info('[skillConfig] 识别类型:', parsed.type);

		switch (parsed.type) {
			case 'table': {
				const config = await this.getConfig();
				config.tables.push({
					fullName: parsed.tableName || '',
					alias: parsed.alias || '',
					fields: parsed.fields || [],
				});
				this._saveSkillMd(config.tables, config.relations);
				this.app.logger.info('[skillConfig] 已写入 table:', parsed.tableName);
				break;
			}
			case 'relation': {
				const config = await this.getConfig();
				config.relations.push({
					table1: parsed.table1 || '',
					field1: parsed.field1 || '',
					table2: parsed.table2 || '',
					field2: parsed.field2 || '',
					relationType: parsed.relationType || '',
					description: parsed.description || '',
				});
				this._saveSkillMd(config.tables, config.relations);
				this.app.logger.info('[skillConfig] 已写入 relation:', parsed.table1, '->', parsed.table2);
				break;
			}
			case 'rule': {
				const rulesJsonPath = this._getRulesJsonPath();
				this.app.logger.info('[skillConfig] 写入路径:', rulesJsonPath);
				let jsonData = { rules: [], fewShotExamples: [] };
				if (fs.existsSync(rulesJsonPath)) {
					jsonData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
				}
				jsonData.rules.push({
					description: parsed.description || '',
					details: parsed.details || [],
				});
				fs.writeFileSync(rulesJsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
				this.app.logger.info('[skillConfig] 已写入 rule, 当前规则数:', jsonData.rules.length);
				break;
			}
			case 'example': {
				const rulesJsonPath = this._getRulesJsonPath();
				let jsonData = { rules: [], fewShotExamples: [] };
				if (fs.existsSync(rulesJsonPath)) {
					jsonData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
				}
				jsonData.fewShotExamples.push({
					requirement: parsed.requirement || '',
					sql: parsed.sql || '',
				});
				fs.writeFileSync(rulesJsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
				this.app.logger.info('[skillConfig] 已写入 example:', parsed.requirement);
				break;
			}
			default:
				this.app.logger.error('[skillConfig] 未知类型:', parsed.type);
				return { success: false, message: `未知类型: ${parsed.type}` };
		}

		this._reloadCache();
		this.app.logger.info('[skillConfig] aiAppend 完成, type:', parsed.type);
		return {
			success: true,
			message: `已识别为「${parsed.type}」类型并添加到知识库，即时生效`,
			type: parsed.type,
		};
	}

	async deleteItem(type, index) {
		switch (type) {
			case 'table': {
				const config = await this.getConfig();
				if (index < 0 || index >= config.tables.length) {
					return { success: false, message: '索引超出范围' };
				}
				config.tables.splice(index, 1);
				this._saveSkillMd(config.tables, config.relations);
				break;
			}
			case 'relation': {
				const config = await this.getConfig();
				if (index < 0 || index >= config.relations.length) {
					return { success: false, message: '索引超出范围' };
				}
				config.relations.splice(index, 1);
				this._saveSkillMd(config.tables, config.relations);
				break;
			}
			case 'rule': {
				const rulesJsonPath = this._getRulesJsonPath();
				let jsonData = { rules: [], fewShotExamples: [] };
				if (fs.existsSync(rulesJsonPath)) {
					jsonData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
				}
				if (index < 0 || index >= jsonData.rules.length) {
					return { success: false, message: '索引超出范围' };
				}
				jsonData.rules.splice(index, 1);
				fs.writeFileSync(rulesJsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
				break;
			}
			case 'example': {
				const rulesJsonPath = this._getRulesJsonPath();
				let jsonData = { rules: [], fewShotExamples: [] };
				if (fs.existsSync(rulesJsonPath)) {
					jsonData = JSON.parse(fs.readFileSync(rulesJsonPath, 'utf-8'));
				}
				if (index < 0 || index >= jsonData.fewShotExamples.length) {
					return { success: false, message: '索引超出范围' };
				}
				jsonData.fewShotExamples.splice(index, 1);
				fs.writeFileSync(rulesJsonPath, JSON.stringify(jsonData, null, 2), 'utf-8');
				break;
			}
			default:
				return { success: false, message: '未知类型' };
		}

		this._reloadCache();
		return { success: true, message: '已删除，即时生效' };
	}

	_getPromptsPath() {
		return path.join(this.app.baseDir, 'app', 'recent-prompts.json');
	}

	async savePrompt(requirement) {
		if (!requirement || !requirement.trim()) return;
		const promptsPath = this._getPromptsPath();
		let prompts = [];
		if (fs.existsSync(promptsPath)) {
			try {
				prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
			} catch (e) {
				prompts = [];
			}
		}
		const trimmed = requirement.trim();
		const existingIdx = prompts.indexOf(trimmed);
		if (existingIdx !== -1) {
			prompts.splice(existingIdx, 1);
		}
		prompts.unshift(trimmed);
		if (prompts.length > 50) {
			prompts = prompts.slice(0, 50);
		}
		fs.writeFileSync(promptsPath, JSON.stringify(prompts, null, 2), 'utf-8');
	}

	async getRecentPrompts(limit = 10) {
		const promptsPath = this._getPromptsPath();
		if (!fs.existsSync(promptsPath)) return [];
		try {
			const prompts = JSON.parse(fs.readFileSync(promptsPath, 'utf-8'));
			return prompts.slice(0, limit);
		} catch (e) {
			return [];
		}
	}
}

module.exports = SkillConfigService;