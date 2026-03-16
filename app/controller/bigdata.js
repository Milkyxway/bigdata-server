"use strict";

const { Controller } = require("egg");

class BigDataController extends Controller {
	async getReportList() {
		const { ctx, service } = this;
		const result = await service.bigdata.getReportList(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async getSQL() {
		const { ctx, service } = this;
		const result = await service.bigdata.getSQL(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async downloadSql() {
		const { ctx, service } = this;
		const result = await service.bigdata.downloadSql(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async uploadSql() {
		const { ctx, service } = this;
		const result = await service.bigdata.uploadSql(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async createTask() {
		const { ctx, service } = this;
		const result = await service.bigdata.createTask(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async getTaskList() {
		const { ctx, service } = this;
		const result = await service.bigdata.getTaskList(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async createTaskType() {
		const { ctx, service } = this;
		const result = await service.bigdata.createTaskType(ctx.request.body);
		return ctx.sendSuccess(result);
	}

	async addSql() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.addSql(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}
	async getTaskDetail() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.getTaskDetail(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async getReportType() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.getReportType(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async updateTask() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.updateTask(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async getTaskSqls() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.getTaskSqls(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async deleteTask() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.deleteTask(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}
	async addCommonSQL() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.addCommonSQL(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async deleteCommonSql() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.deleteCommonSql(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}
	async updateCommonsql() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.updateCommonsql(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async getParamsList() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.getParamsList(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async addParams() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.addParams(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async updateTaskSql() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.updateTaskSql(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async deleteTaskType() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.deleteTaskType(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async deletSQLinTask() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.deletSQLinTask(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async updateTaskType() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.updateTaskType(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async addSqlBatch() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.addSqlBatch(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async taskSort() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.taskSort(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}
	async dailyReport() {
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.dailyReport(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}
}

module.exports = BigDataController;
