"use strict";

/**
 * @param {Egg.Application} app - egg application
 */
module.exports = (app) => {
	const { router, controller } = app;

	/**
	 * 任务列表增删改查
	 */
	// router.post("/api/task/list", controller.task.query);
	// router.post("/api/task/add", controller.task.add);
	// router.delete("/api/task/delete", controller.task.delete);
	// router.put("/api/task/update", controller.task.update);
	// router.put("/api/task/finish", controller.task.setFinish);
	// router.post("/api/task/detail", controller.task.detail);
	// router.post("/api/task/appeal", controller.task.appeal);
	// router.post("/api/task/mine", controller.task.myTask);
	// router.post("/api/task/batchadd", controller.task.addBatchTasks);
	// router.post("/api/subtask/add", controller.task.addChildTask);
	// router.post("/api/subtask/update", controller.task.updateSubTask);
	// router.delete("/api/subtask/delete", controller.task.deleteSubTask);

	router.post("/api/login", controller.role.login);
	router.post("/api/modifypwd", controller.role.modifypwd);
	router.post("/api/createaccount", controller.role.createaccount);
	router.post("/api/userupdate", controller.role.updateUser);
	router.post("/api/userdelete", controller.role.deleteUser);
	router.post("/api/userlist", controller.role.getUsers);
	router.post("/api/getFsbAccountPwd", controller.role.getFsbAccountPwd);
	router.post("/api/updateFsbPwd", controller.role.updateFsbPwd);
	

	router.post("/api/report/list", controller.bigdata.getReportList);

	router.post("/api/report/download", controller.bigdata.downloadSql);

	router.post("/api/report/createtask", controller.bigdata.createTask);
	router.post("/api/report/tasklist", controller.bigdata.getTaskList);
	router.post("/api/report/addtasktype", controller.bigdata.createTaskType);
	router.post("/api/report/deletetype", controller.bigdata.deleteTaskType);
	router.post("/api/report/updatetype", controller.bigdata.updateTaskType);
	router.post("/api/report/addsql", controller.bigdata.addSql);
	router.post("/api/report/addsqlbatch", controller.bigdata.addSqlBatch);
	router.post("/api/report/updatesql", controller.bigdata.updateTaskSql);
	router.post("/api/report/detail", controller.bigdata.getTaskDetail);
	router.post("/api/report/type", controller.bigdata.getReportType);
	router.post("/api/report/update", controller.bigdata.updateTask);
	router.post("/api/report/tasksqls", controller.bigdata.getTaskSqls);
	router.post("/api/report/deletesql", controller.bigdata.deletSQLinTask);
	router.delete("/api/report/deletetask", controller.bigdata.deleteTask);
	router.post("/api/report/paramslist", controller.bigdata.getParamsList);
	router.post("/api/report/addparams", controller.bigdata.addParams);

	router.post("/api/commonsql/add", controller.bigdata.addCommonSQL);
	router.post("/api/commonsql/list", controller.bigdata.getSQL);
	router.post("/api/commonsql/update", controller.bigdata.updateCommonsql);
	router.delete("/api/commonsql/delete", controller.bigdata.deleteCommonSql);

	router.post("/api/report/upload", controller.upload.upload);
	router.post("/api/report/deletefile", controller.upload.deleteFile);
	router.post("/api/report/rename", controller.upload.renameFile);

	router.post("/api/report/tasksort", controller.bigdata.taskSort);
	router.post("/api/report/dailyreport", controller.bigdata.dailyReport);
	router.post("/api/report/generateSql", controller.bigdata.generateSql);
	router.post("/api/report/mergeDaily", controller.bigdata.mergeDaily);

	// ==================== Skill 配置管理 ====================
	// Skill 配置管理（精简版：查看、AI添加、删除）
	router.get("/api/skill/config", controller.skillConfig.getConfig);
	router.post("/api/skill/ai-append", controller.skillConfig.aiAppend);
	router.post("/api/skill/delete", controller.skillConfig.deleteItem);
	router.get("/api/skill/recent-prompts", controller.skillConfig.recentPrompts);
};