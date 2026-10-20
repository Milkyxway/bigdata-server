"use strict";

const { Controller } = require("egg");

class RoleController extends Controller {
	async index() {
		const { ctx } = this;
		ctx.body = "hi, egg";
	}

	async login() {
		const { ctx, service } = this;
		try {
			const result = await service.role.login(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError("账户或密码填写错误");
		}
	}
	async modifypwd() {
		const { ctx, service } = this;
		try {
			const result = await service.role.modifyPwd(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async createaccount() {
		const { ctx, service } = this;
		try {
			const result = await service.role.createAccount(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async getUsers() {
		const { ctx, service } = this;
		try {
			const result = await service.role.getUsers(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async getUserById() {
		const { ctx, service } = this;
		try {
			const result = await service.role.getUserById(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async deleteUser() {
		const { ctx, service } = this;
		try {
			const result = await service.role.deleteUser(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async updateUser() {
		const { ctx, service } = this;
		try {
			const result = await service.role.updateUser(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async getFsbAccountPwd() {
		const { ctx, service } = this;
		try {
			const result = await service.role.getFsbAccountPwd(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async updateFsbPwd() {
		const { ctx, service } = this;
		try {
			const result = await service.role.updateFsbPwd(ctx.request.body);
			return ctx.sendSuccess(result);
		} catch (e) {
			return ctx.sendError(e);
		}
	}
}

module.exports = RoleController;