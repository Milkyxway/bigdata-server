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

	async generateSql() {
		const { ctx, service } = this;
		const { requirement, prompt } = ctx.request.body;
		const query = requirement || prompt;
		if (!query) {
			return ctx.sendError('请输入取数需求描述');
		}

		let attachmentText = '';
		const files = ctx.request.files;
		if (files && files.length > 0) {
			const file = files[0];
			const XLSX = require('xlsx');
			const workbook = XLSX.readFile(file.filepath);
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
			if (data.length > 0) {
				const headers = data[0];
				const rows = data.slice(1);
				attachmentText = '\n\n附件Excel内容如下：\n';
				attachmentText += '| ' + headers.join(' | ') + ' |\n';
				attachmentText += '| ' + headers.map(() => '---').join(' | ') + ' |\n';
				for (const row of rows) {
					attachmentText += '| ' + row.map(c => c != null ? String(c) : '').join(' | ') + ' |\n';
				}
			}
		}

		ctx.set('Content-Type', 'text/event-stream');
		ctx.set('Cache-Control', 'no-cache');
		ctx.set('Connection', 'keep-alive');
		ctx.status = 200;

		try {
			for await (const event of service.aiSql.generateStream(query, attachmentText)) {
				ctx.res.write(`data: ${JSON.stringify(event)}\n\n`);
			}
		} catch (e) {
			ctx.res.write(`data: ${JSON.stringify({ type: 'error', message: e.message || 'AI服务异常' })}\n\n`);
		}
		ctx.res.end();
	}
}

module.exports = BigDataController;