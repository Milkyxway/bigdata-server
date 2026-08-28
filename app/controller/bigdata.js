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
			return ctx.sendError("请输入取数需求描述");
		}

		let attachmentText = "";
		const files = ctx.request.files;
		if (files && files.length > 0) {
			const file = files[0];
			const XLSX = require("xlsx");
			const workbook = XLSX.readFile(file.filepath);
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
			if (data.length > 0) {
				const headers = data[0];
				const rows = data.slice(1);
				attachmentText = "\n\n附件Excel内容如下：\n";
				attachmentText += "| " + headers.join(" | ") + " |\n";
				attachmentText += "| " + headers.map(() => "---").join(" | ") + " |\n";
				for (const row of rows) {
					attachmentText +=
						"| " +
						row.map((c) => (c != null ? String(c) : "")).join(" | ") +
						" |\n";
				}
			}
		}

		ctx.set("Content-Type", "text/event-stream");
		ctx.set("Cache-Control", "no-cache");
		ctx.set("Connection", "keep-alive");
		ctx.status = 200;

		try {
			for await (const event of service.aiSql.generateStream(
				query,
				attachmentText,
			)) {
				ctx.res.write(`data: ${JSON.stringify(event)}\n\n`);
			}
		} catch (e) {
			ctx.res.write(
				`data: ${JSON.stringify({ type: "error", message: e.message || "AI服务异常" })}\n\n`,
			);
		}
		ctx.res.end();
	}

	async generateChart() {
		const { ctx, service } = this;
		const { taskId, requirement, chartType } = ctx.request.body;

		if (!taskId) {
			return ctx.sendError("请提供 taskId");
		}
		if (!requirement) {
			return ctx.sendError("请提供 requirement");
		}
		if (!chartType || !["bar", "pie", "line"].includes(chartType)) {
			return ctx.sendError("请提供正确的 chartType（bar/pie/line）");
		}

		try {
			const fs = require("fs").promises;
			const path = require("path");
			const XLSX = require("xlsx");

			const taskDetail = await service.bigdata.getTaskDetail({ taskId });
			if (!taskDetail) {
				return ctx.sendError("任务不存在");
			}
			if (taskDetail.reportState !== 2) {
				const stateMap = { 0: "已创建", 1: "执行中", 3: "中止", 4: "执行错误" };
				const stateText = stateMap[taskDetail.reportState] || "未知";
				return ctx.sendError(
					`任务当前状态为「${stateText}」，请等待任务完结归档后再试`,
				);
			}

			const excelList = await service.bigdata.getExcelList(taskId);
			if (!excelList || excelList.length === 0) {
				return ctx.sendError(
					"该任务还没有产出结果文件，请等待任务执行完成后再试",
				);
			}

			const latestExcel = excelList.reverse()[0];
			const filePath = path.join(
				path.resolve(),
				"app/public/out",
				latestExcel.excelData,
			);

			await fs.access(filePath);
			const workbook = XLSX.readFile(filePath);
			const sheetName = workbook.SheetNames[0];
			const sheet = workbook.Sheets[sheetName];
			const jsonData = XLSX.utils.sheet_to_json(sheet);

			if (!jsonData || jsonData.length === 0) {
				return ctx.sendError("Excel 文件中没有数据");
			}

			const chartOption = await service.aiSql.generateChart(
				requirement,
				chartType,
				jsonData,
			);
			return ctx.sendSuccess({ chartOption, fileName: latestExcel.excelData });
		} catch (e) {
			if (e.code === "ENOENT") {
				return ctx.sendError("结果文件不存在，请等待任务执行完成后再试");
			}
			return ctx.sendError(e.message || "生成图表失败");
		}
	}

	async mergeDaily() {
		const { ctx, service } = this;
		const files = ctx.request.files;
		if (!files || files.length < 2) {
			return ctx.sendError(
				"请上传模板表(template)和至少一个日报文件(dailyReports)",
			);
		}

		const templateFile = files.find((f) => f.fieldname === "template");
		const dailyFiles = files.filter((f) => f.fieldname === "dailyReports");

		if (!templateFile) {
			return ctx.sendError("请上传模板表，字段名为 template");
		}
		if (dailyFiles.length === 0) {
			return ctx.sendError("请上传至少一个日报文件，字段名为 dailyReports");
		}

		try {
			const XLSX = require("xlsx");

			const templateWb = XLSX.readFile(templateFile.filepath);
			const templateSheet = templateWb.Sheets[templateWb.SheetNames[0]];
			const templateData = XLSX.utils.sheet_to_json(templateSheet, {
				header: 1,
			});
			const templateHeaders = templateData[0];
			const templateRows = templateData.slice(1);

			const parsedDailyFiles = [];
			for (const file of dailyFiles) {
				const wb = XLSX.readFile(file.filepath);
				const sheet = wb.Sheets[wb.SheetNames[0]];
				const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
				parsedDailyFiles.push({
					filename: file.filename,
					headers: data[0],
					rows: data.slice(1),
				});
			}

			const mergedData = await service.aiSql.mergeDailyReports(
				templateHeaders,
				templateRows,
				parsedDailyFiles,
			);

			const outputWb = XLSX.utils.book_new();
			const outputData = [templateHeaders, ...mergedData];
			const outputSheet = XLSX.utils.aoa_to_sheet(outputData);
			XLSX.utils.book_append_sheet(outputWb, outputSheet, "合并结果");

			const buffer = XLSX.write(outputWb, { type: "buffer", bookType: "xlsx" });

			ctx.set(
				"Content-Type",
				"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			);
			ctx.set(
				"Content-Disposition",
				"attachment; filename=merged_daily_report.xlsx",
			);
			ctx.body = buffer;
		} catch (e) {
			return ctx.sendError(e.message || "日报合并失败");
		}
	}
}

module.exports = BigDataController;
