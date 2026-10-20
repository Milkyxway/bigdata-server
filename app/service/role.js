const Service = require("egg").Service;

class RoleService extends Service {
	// async index() {
	//   const result = await this.app.mysql.select('category')
	//   return result
	// }
	/**
	 * 登录接口
	 * @param {*} query
	 */
	async login(query) {
		const user = await this.app.mysql.select("user", {
			where: {
				username: query.username,
			},
		});
		return new Promise((res, reject) => {
			if (user) {
				if (query.password === user[0].password) {
					const { password, ...rest } = user[0];
					res({
						userInfo: { ...rest }, // 不把密码返回给前端
					});
				}
			}
			reject();
		});
	}

	/**
	 * 修改密码
	 * @param {*} query
	 */
	async modifyPwd(query) {
		const { oldPwd, userId, newPwd } = query;
		return new Promise(async (resolve, reject) => {
			const userInfo = await this.app.mysql.select("user", {
				where: { userId },
			});
			if (userInfo) {
				const pwdInsql = userInfo[0].password;
				if (pwdInsql !== oldPwd) {
					reject("旧密码输入有误");
				} else if (pwdInsql === newPwd) {
					reject("新密码与旧密码一致");
				} else {
					await this.app.mysql.update(
						"user",
						{ password: newPwd },
						{
							where: {
								userId: query.userId,
							},
						}
					);
					resolve();
				}
			} else {
				reject("获取用户失败");
			}
		});
	}

	/**
	 * 创建账户
	 * @param {*} query
	 */
	async createAccount(query) {
		return new Promise(async (resolve, reject) => {
			const useraccount = await this.app.mysql.select("user", {
				where: {
					username: query.username,
				},
			});
			if (useraccount.length) {
				reject("该账户已存在");
			} else {
				await this.app.mysql.insert("user", query);
				resolve();
			}
		});
	}

	getUsers() {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.app.mysql.select("user");
				resolve({
					list: result,
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	getUserById(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.app.mysql.select("user", {
					where: { userId: query.userId },
				});
				if (result.length === 0) {
					reject("用户不存在");
					return;
				}
				const { password, ...rest } = result[0];
				resolve(rest);
			} catch (e) {
				reject(e);
			}
		});
	}

	deleteUser(query) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.delete("user", {
					userId: query.userId,
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	updateUser(query) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.update("user", query, {
					where: { userId: query.userId },
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}
	/**
	 * 获取防水坝账号密码
	 * @returns 
	 */
	getFsbAccountPwd() {
		return new Promise(async(resolve, reject) => {
			try {
				const result = await this.app.mysql.select('fangshuiba')
				resolve(result[0])
			}catch(e) {
				reject(e)
			}
		})
		
	}

	/**
	 * 修改防水坝密码
	 * @returns 
	 */
	 updateFsbPwd(data) {
		return new Promise(async(resolve, reject) => {
			try {
				await this.app.mysql.update('fangshuiba',
				{ Password: data.Password },
				{ where: { Id: data.Id } })
				resolve()
			}catch(e) {
				reject(e)
			}
		})
		
	}
}

module.exports = RoleService;