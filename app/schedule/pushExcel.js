"use strict";

const Subscription = require("egg").Subscription;

class PushExcel extends Subscription {
	static get schedule() {
		return {
			cron: '0,30 15-17 * * *',
			type: "worker",
			immediate: true,
		};
	}

	async subscribe() {
		const now = new Date();
		if (now.getHours() === 17 && now.getMinutes() === 30) {
			return;
		}
		const { ctx, service } = this;
		try {
			const result = await service.bigdata.pushLatestExcel();
			ctx.logger.info(`[PushExcel] 定时推送结果: ${JSON.stringify(result)}`);
		} catch (e) {
			ctx.logger.error(`[PushExcel] 定时推送失败: ${e.message}`);
		}
	}
}

module.exports = PushExcel;