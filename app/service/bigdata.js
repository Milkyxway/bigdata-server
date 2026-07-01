const Service = require("egg").Service;
const XLSX = require('xlsx');
const path = require('path');


class BigDataService extends Service {
	/**
	 * 获取报表列表
	 * @param {*} query
	 * @returns
	 */
	getReportList(query) {
		const { pageNum, pageSize } = query;
		return new Promise(async (resolve, reject) => {
			try {
				let whereStr = `where reportType = ${query.reportType}`;
				if (query.startTime) {
					whereStr = `${whereStr} and createTime between ${query.startTime} and ${query.endTime}`;
				}
				if (query.keyword) {
					whereStr = `${whereStr} and reportName like '%${query.keyword}%'`;
				}
				whereStr = `${whereStr} order by createTime desc limit ${
					pageNum * pageSize
				},${pageSize}`;
				const list = await this.app.mysql.query(
					`select * from bigdata_period ${whereStr}`
				);
				const [{ "COUNT(*)": total }] = await this.app.mysql.query(
					`SELECT COUNT(*) from bigdata_period ${whereStr}`
				);
				resolve({
					list,
					total,
				});
			} catch (err) {
				reject(err);
			}
		});
	}

	

	async getSQL(query) {
		const { pageNum, pageSize } = query;
		let whereStr = ``;
		if (query.region) {
			whereStr = `where region like '%${query.region}%'`
		}
		if (query.keyword) {
			whereStr = whereStr ?  `${whereStr} and sqlName like '%${query.keyword}%'` : `where sqlName like '%${query.keyword}%'`;
		}

		return new Promise(async (resolve, reject) => {
			const sqlStr = `select * from common_sql ${whereStr} order by createTime desc`;
			const [{ "COUNT(*)": total }] = await this.app.mysql.query(
				`SELECT COUNT(*) from common_sql ${whereStr}`
			);
			const list = await this.app.mysql.query(sqlStr);
			resolve({
				list,
				total,
			});
		});
	}

	/**
	 * 创建任务
	 * @param {*} query
	 * @returns
	 */
	createTask(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.app.mysql.insert("report_list", {
					...query,
					createTime: new Date(),
					reportState: query.reportState || 0,
				});
				resolve({
					reportId: result.insertId,
				});
			} catch (e) {
				reject(e);
			}
		});
	}
	isEmptyObj(obj) {
		for (let key in obj) {
			if (key) {
				return false;
			}
		}
		return true;
	}

	handleQueryToSqlStr(rest, reportName, username, orgId, LargeCategory) {
		let notEmptyParams = {};
		let whereStr = "";
		Object.keys(rest).map((i) => {
			if (rest[i] !== "") {
				notEmptyParams[i] = rest[i];
			}
		});
		Object.keys(notEmptyParams).map((i, index) => {
			if (index !== 0) {
				whereStr = whereStr + ` && ${i} = '${notEmptyParams[i]}'`;
			} else {
				whereStr = `WHERE ${i} = '${notEmptyParams[i]}'`;
			}
		});
		const commonSql = (key, val) => {
			return this.isEmptyObj(notEmptyParams)
				? `where ${key} like '%${val}%'`
				: `${whereStr} and ${key} like '%${val}%'`;
		};

		if (reportName) {
			whereStr = commonSql("reportName", reportName);
		}
		if (username) {
			whereStr = commonSql('username', username);
		}
		if (LargeCategory) {
			whereStr = commonSql('LargeCategory', LargeCategory);
		}
		if (orgId) {
			whereStr = this.isEmptyObj(notEmptyParams) ? `where taskAssignOrg = ${orgId}`:`${whereStr} and taskAssignOrg = ${orgId}`
		}
		
		return whereStr;
	}

	getExcelList(reportId) {
		return new Promise(async(resolve, reject) => {
			try {
				const sqlStr = `select * from excel_list where reportId = ${reportId}`
				const result = await this.app.mysql.query(sqlStr)
				resolve(result)
			}catch(e) {
				reject(e)
			}
		})
	}
	getExcelListDate(date) {
		return new Promise(async(resolve, reject) => {
			try {
				const sqlStr = `select * from excel_list where excelData like '${date}%' and reportId=2189`
				const result = await this.app.mysql.query(sqlStr)
				resolve(result[0].excelData)
			}catch(e) {
				reject(e)
			}
		})
	}

	setData(list) {
		return new Promise((resolve, reject) => {
		  let count = 0;
		  if (list.length) {
			list.map(async i => {
			  const excelData = await this.getExcelList(i.reportId);
			  i.excelData = excelData;
			  count === list.length - 1 && resolve();
			  count++;
			});
		  } else {
			resolve();
		  }
		});
	  }
	/**
	 * 获取任务列表
	 * @returns
	 */
	getTaskList(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const { pageNum, pageSize, reportName,username, orgId, region, LargeCategory,...rest } = query;
				let whereStr = this.handleQueryToSqlStr(rest, reportName, username, orgId, LargeCategory);
				whereStr = whereStr ? `${whereStr} and list.region like '%${region}%'` : `where list.region like '%${region}%'`
				const sqlStr = `select list.*, user.username username, type.reportTypeName reportTypeName from 
				report_list list left join user on list.custID = user.userId 
				left join report_type type on list.reportTypeId = type.reportTypeId 
				${whereStr} order by createTime desc limit ${
					pageNum * pageSize
				},${pageSize}`;
				const list = await this.app.mysql.query(sqlStr);
				const [{ "COUNT(*)": total }] = await this.app.mysql.query(
					`SELECT COUNT(*) from report_list list left join user on list.custID = user.userId left join report_type type on list.reportTypeId = type.reportTypeId ${whereStr}`
				);
				
				resolve( this.setData(list).then(res => {
					return {
					  total,
					  list,
					};
				  }));
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 创建任务类型
	 * @param {*} query
	 * @returns
	 */
	createTaskType(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.app.mysql.insert("report_Type", {
					...query,
					createTime: new Date(),
				});
				resolve({
					reportTypeId: result.insertId,
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 增加sql语句
	 * @param {*} data
	 * @returns
	 */
	addSql(data) {
		return new Promise(async (resolve, reject) => {
			try {
				if (!data.reportId) {
					reject("没有任务id");
				} else {
					const result = await this.app.mysql.insert("report_sql", {
						...data,
						createTime: new Date(),
					});
					resolve({
						result,
					});
				}
			} catch (e) {
				reject(e);
			}
		});
	}
	addSqlBatch(list) {
		return new Promise(async(resolve, reject) => {
			try {
				const result = await this.app.mysql.query("INSERT INTO report_sql (reportId,reportSqlData,sqlType, ExcelTable, SourceSheet, TargetSheet) values ?", [list]);
				resolve()
			}catch(e) {
				reject(e)
			}
		})
	}

	/**
	 * 获取任务详情
	 * @param {*} query
	 * @returns
	 */
	getTaskDetail(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const detail = await this.app.mysql.select("report_list", {
					where: {
						reportId: query.taskId,
					},
				});
				if (detail) {
					resolve(detail[0]);
				} else {
					reject();
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 获取任务类型
	 * @param {*} query
	 * @returns
	 */
	getReportType(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const result = await this.app.mysql.select("report_Type", {
					where: {
						reportTypeId: query.reportTypeId,
					},
				});
				if (result) {
					resolve(result[0]);
				} else {
					reject();
				}
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 更新任务
	 * @param {*} data
	 * @returns
	 */
	updateTask(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.update("report_list", data, {
					where: {
						reportId: data.reportId,
					},
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 获取任务的sql语句
	 * @param {*} query
	 * @returns
	 */
	getTaskSqls(query) {
		return new Promise(async (resolve, reject) => {
			try {
				const sqlStr = `select * from report_sql where reportId = ${query.taskId} order by reportSqlId asc`
				const result = await this.app.mysql.query(sqlStr);
				resolve({
					taskSqls: result.length ? result : null,
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 删除一条任务
	 * @param {*} query
	 * @returns
	 */
	deleteTask(query) {
		return new Promise(async (resolve, reject) => {
			try {
				// 删掉任务关联的sql
				await this.app.mysql.delete("report_sql", {
					reportId: query.reportId,
				});
				await this.app.mysql.delete("report_list", {
					reportId: query.reportId,
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	addCommonSQL(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.insert("common_sql", data);
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 删除常用sql
	 * @returns
	 */
	deleteCommonSql(query) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.delete("common_sql", {
					sqlId: query.sqlId,
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 更新常用sql
	 * @returns
	 */
	updateCommonsql(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.update("common_sql", data, {
					where: {
						sqlId: data.sqlId,
					},
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 参数表
	 * @returns
	 */
	getParamsList() {
		return new Promise(async (resolve, reject) => {
			try {
				const sqlStr = `select * from report_parameter`;
				const result = await this.app.mysql.query(sqlStr);
				const [{ "COUNT(*)": total }] = await this.app.mysql.query(
					`SELECT COUNT(*) from report_parameter`
				);
				resolve({
					list: result,
					total,
				});
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 增加参数类型
	 * @param {*} data
	 * @returns
	 */
	addParams(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.insert("report_parameter", data);
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 更新任务的sql
	 */
	updateTaskSql(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.update("report_sql", data, {
					where: {
						reportSqlId: data.reportSqlId,
					},
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 删除任务类型
	 * @param {*} data
	 * @returns
	 */
	deleteTaskType(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.delete("report_type", {
					reportTypeId: data.reportTypeId,
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	/**
	 * 删除任务填写的sql
	 * @param {*} data
	 */
	deletSQLinTask(data) {
		return new Promise(async (resolve, reject) => {
			try {
				await this.app.mysql.delete("report_sql", {
					reportSqlId: data.reportSqlId,
				});
				resolve();
			} catch (e) {
				reject(e);
			}
		});
	}

	updateTaskType(data) {
		return new Promise(async(resolve, reject)=> {
			try {
				await this.app.mysql.update('report_type', data, {
					where: {
						reportTypeId: data.reportTypeId
					}
				})
				resolve()
			}catch(e) {
				reject(e)
			}
		})
	}


	taskSort() {
		return new Promise(async(resolve, reject) => {
			try {
				const sql = `select * from(select distinct reportName, count(reportId) total from report_list where LargeCategory = '一次性' group by reportName) a order by a.total desc `
				const result = await this.app.mysql.query(sql)
				resolve(result)
			}catch(e) {
				reject(e)
			}
		})
	}

	dailyReport(data) {
		return new Promise(async(resolve, reject) => {
			try {
			
 			const excelData = await this.getExcelList(data.taskId);
			
			const fileName = data.pickdate? await this.getExcelListDate(data.pickdate) : excelData.reverse()[0].excelData
		

			// 1. 检查文件是否存在
    		const fs = require('fs').promises;
    		await fs.access(`${path.resolve()}/app/public/out/${fileName}`);

			// 2. 读取 Excel 文件
    		const workbook = XLSX.readFile(`${path.resolve()}/app/public/out/${fileName}`);
			const jsonData = {};
			workbook.SheetNames.forEach(sheetName => {
  			const worksheet = workbook.Sheets[sheetName];
  			jsonData[sheetName] = XLSX.utils.sheet_to_json(worksheet);
			});

			resolve({
				jsonData,
				fileName
			})
			}catch(e) {
				reject(e)
			}
		})
	}

	pushLatestExcel() {
		return new Promise(async(resolve, reject) => {
			try {
				const taskId = 2189;
				const today = require('dayjs')().format('YYYY-MM-DD');
				const fs = require('fs').promises;
				const flagFile = `${path.resolve()}/app/public/out/.push_done_${today}`;

				try {
					await fs.access(flagFile);
					this.ctx.logger.info(`[pushLatestExcel] 今天(${today})已推送过，跳过`);
					resolve({ success: false, message: '今天已推送过，跳过' });
					return;
				} catch(e) {}

				const excelData = await this.getExcelList(taskId);
				if (!excelData || excelData.length === 0) {
					this.ctx.logger.info('[pushLatestExcel] 任务2189没有找到Excel文件');
					resolve({ success: false, message: '没有找到Excel文件' });
					return;
				}

				const fileName = excelData.reverse()[0].excelData;
				if (!fileName || !fileName.startsWith(today)) {
					this.ctx.logger.info(`[pushLatestExcel] 今天(${today})暂无新文件，最新: ${fileName}，跳过`);
					resolve({ success: false, message: '今天暂无新文件产出，跳过推送' });
					return;
				}

				const localPath = `${path.resolve()}/app/public/out/${fileName}`;
				await fs.access(localPath);

				const Client = require('ssh2-sftp-client');
				const sftp = new Client();
				const sftpConfig = this.config.pushSftp;

				await sftp.connect({
					host: sftpConfig.host,
					port: sftpConfig.port || 22,
					username: sftpConfig.username,
					password: sftpConfig.password,
				});

				const remotePath = `${sftpConfig.targetDir}/${fileName}`;
				await sftp.put(localPath, remotePath);
				sftp.end();

				await fs.writeFile(flagFile, fileName);

				this.ctx.logger.info(`[pushLatestExcel] SFTP推送成功: ${fileName} -> ${remotePath}`);
				resolve({ success: true, fileName, remotePath });
			} catch(e) {
				this.ctx.logger.error(`[pushLatestExcel] SFTP推送失败: ${e.message}`);
				reject(e);
			}
		});
	}
}

module.exports = BigDataService;