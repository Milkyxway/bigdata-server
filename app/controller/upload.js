const fs = require("fs"); // 引入fs，node 自带的文件处理工具
const moment = require("moment"); // 引入moment 时间处理工具
const { mkdirp } = require("mkdirp"); // 引入文件夹处理工具
const path = require("path"); // 引入路径处理工具

const Controller = require("egg").Controller;

class UploadController extends Controller {
	async upload() {
		const { ctx } = this;
		// 1 获取我们上传文件。 是一个数组，只有一个文件情况下，默认为数组中的下标0。
		let file = ctx.request.files[0];
		// 2 声明存放资源的路径
		let uploadDir = "";
		try {
			// 3 读取文件内容
			let f = fs.readFileSync(file.filepath);
			// 4 获取当前日期
			let day = moment(new Date()).format("YYYYMMDD");
			// 5 生成文件最后要保存的路径地址
			let dir = path.join(this.config.uploadDir);

			await mkdirp(dir); // 6 这个方法是，如果 上述dir 路径存在，那就不创建，如果不存在则会创建这个对应目录文件夹
			// 7 返回图片保存的完整路径
			uploadDir = path.join(dir, file.filename);
			// 8 将图片内容写入到文件夹下
			fs.writeFileSync(uploadDir, f);
		} finally {
			// 清除临时文件
			ctx.cleanupRequestFiles();
		}
		return ctx.sendSuccess({
			data: uploadDir.replace(/app/, ""), // 删除 /app/ 这个目录
		});
	}

	deleteFile() {
		const { ctx } = this;
		try {
			const { request } = ctx;
			fs.unlinkSync(
				`${path.resolve()}/app/public/${request.body.path}/${request.body.fileName}`
			);
			return ctx.sendSuccess();
		} catch (e) {
			return ctx.sendError(e);
		}
	}

	async renameFile() {
		const { ctx } = this;
		try {
			const { request } = ctx;
			let params;
			if (request.body.path === 'out') {
				params = {
					reportLink: request.body.taskName
				};
			} else if (request.body.path === 'upload') {
				params = {
					SourceExcelLink: request.body.SourceExcelLink
				};
			}
			fs.renameSync(
				`${path.resolve()}/app/public/${request.body.path}/${request.body.fileName}`,
				`${path.resolve()}/app/public/${request.body.path}/${request.body.taskName}.xlsx`
			);
			await this.app.mysql.update('report_list', params, { where: { id: request.body.id } });
			return ctx.sendSuccess();
		} catch (e) {
			return ctx.sendError(e);
		}
	}
	
	

}

module.exports = UploadController;