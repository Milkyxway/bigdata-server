/* eslint valid-jsdoc: "off" */

"use strict";

/**
 * @param {Egg.EggAppInfo} appInfo app info
 */
module.exports = (appInfo) => {
	/**
	 * built-in config
	 * @type {Egg.EggAppConfig}
	 **/
	const config = (exports = {});

	// use for cookie sign key, should change to your own and keep security
	config.keys = appInfo.name + "_1688972932084_9069";

	// add your middleware config here
	config.middleware = [];
	config.mysql = {
		// database configuration
		client: {
			host: "localhost",
			// port
			port: "3306",
			// username
			user: "bigdata_period",
			// password
			password: "fzDJDjDtm8HiGyHa",
			// database
			database: "bigdata_period",
		},
	};
	// config.mysql = {
	// 	// database configuration
	// 	client: {
	// 		// host
	// 		host: "localhost",
	// 		// port
	// 		port: "3306",
	// 		// username
	// 		user: "root",
	// 		// password
	// 		password: "11111111",
	// 		// database
	// 		database: "bigdata_period",
	// 	},
	// };
	// 前端端口，跟随实际情况修改
	const port = 9001;
	const domainWhiteList = [
		...new Set([
			`http://172.16.179.5:${port}`,
			`http://localhost:${port}`,
			// 服务启动时尝试自动获取本机 IP 设置白名单
			// `http://${getLocalhost()}:${port}`,
		]),
	];
	config.security = {
		domainWhiteList,
	};
	// 默认允许跨域，生产环境关闭此设置
	config.cors = {
		origin: "*",
		allowMethods: "GET,HEAD,PUT,POST,DELETE,PATCH",
	};
	//missing csrf toke  不设置的会保持，临时使用，为了安全正式使用请设置true
	//CSRF是为了防止攻击，在发起请求前要在header里设置 x-csrf-token。x-csrf-token的值要后端取
	config.security = {
		csrf: {
			enable: false,
		},
	};

	// add your user config here
	const userConfig = {
		// myAppName: 'egg',
		uploadDir: "app/public/upload",
		uploadReport: "app/public/report",
	};
	config.multipart = {
		mode: "file",
		whitelist: [".xlsx", ".sql"],
	};
	config.cluster = {
		listen: {
			port: 7002,
		},
	};

config.pushSftp = {
    host: '172.16.176.76',                          // 新服务器IP
    port: 22,                                        // SSH端口
    username: 'root',                                // 新服务器用户名（你登录用的）
    password: 'Yyzczx78&*',                    // 你填真实密码
    targetDir: '/opt/data-dashboard/uploads', // 目标就是 uploads/ 目录
};

	return {
		...config,
		...userConfig,
	};
};