'use strict';

const { Controller } = require('egg');

class SkillConfigController extends Controller {

	async getConfig() {
		const { ctx, service } = this;
		try {
			const result = await service.skillConfig.getConfig();
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e.message || '获取配置失败');
		}
	}

	async aiAppend() {
		const { ctx, service } = this;
		try {
			const { content } = ctx.request.body;
			if (!content) {
				return ctx.sendError('请提供要添加的内容(content)');
			}
			const result = await service.skillConfig.aiAppend(content);
			if (result.success) {
				return ctx.sendSuccess(result);
			}
			return ctx.sendError(result.message);
		} catch (e) {
			return ctx.sendError(e.message || 'AI添加失败');
		}
	}

	async deleteItem() {
		const { ctx, service } = this;
		try {
			const { type, index } = ctx.request.body;
			if (!type || !['table', 'relation', 'rule', 'example'].includes(type)) {
				return ctx.sendError('请提供正确的 type（table/relation/rule/example）');
			}
			if (index === undefined || index < 0) {
				return ctx.sendError('请提供要删除的索引(index)');
			}
			const result = await service.skillConfig.deleteItem(type, index);
			if (result.success) {
				return ctx.sendSuccess(result);
			}
			return ctx.sendError(result.message);
		} catch (e) {
			return ctx.sendError(e.message || '删除失败');
		}
	}

	async recentPrompts() {
		const { ctx, service } = this;
		try {
			const result = await service.skillConfig.getRecentPrompts(10);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e.message || '获取提示词失败');
		}
	}
}

module.exports = SkillConfigController;