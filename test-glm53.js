// 临时测试脚本：用真实 system prompt 测 glm-5.3
const AjSql = require("./app/service/aiSql.js");
AjSql.reloadAll();

const svc = Object.create(AjSql.prototype);
svc.ctx = { logger: { info: () => {}, warn: () => {}, error: () => {} } };
svc.app = {
  baseDir: __dirname,
  logger: { info: () => {} },
};
svc.config = {
  deepseek: {
    apiKey: "sk-H8UF0IsSBUERzOMCoVJfO9TA7WNDoOQ19nupd5qlv5m0SuzG",
    baseURL: "http://modelrouter.js96296.com/v1",
    model: "glm-5.3",
    timeout: 300000,
  },
};

const req = "查询20260831无锡现金账本余额<50，及50-100之间的去重用户数 按照广电站聚合";

svc._buildSystemPrompt(req).then((sys) => {
  console.log("系统prompt长度:", sys.length);
  const start = Date.now();
  fetch("http://modelrouter.js96296.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer sk-H8UF0IsSBUERzOMCoVJfO9TA7WNDoOQ19nupd5qlv5m0SuzG",
    },
    body: JSON.stringify({
      model: "glm-5.3",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: req },
      ],
      temperature: 0.1,
      max_tokens: 16384,
      stream: false,
    }),
  })
    .then((r) => r.json())
    .then((d) => {
      console.log("耗时:", (Date.now() - start) / 1000, "s");
      console.log("finish_reason:", d.choices?.[0]?.finish_reason);
      const msg = d.choices?.[0]?.message || {};
      console.log("reasoning长度:", (msg.reasoning_content || "").length);
      const c = msg.content || "";
      console.log("content长度:", c.length);
      console.log("含```sql:", c.includes("```sql"));
      console.log("usage:", JSON.stringify(d.usage));
      const block = c.match(/```sql\s*([\s\S]*?)```/i);
      console.log("===提取的SQL(前600字)===");
      console.log(block ? block[1].trim().substring(0, 600) : "(无sql块)");
      console.log("===content前400字===");
      console.log(c.substring(0, 400));
    })
    .catch((e) => console.error("错误:", e.message));
});
