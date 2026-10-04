// 测试各模型耗时对比：代理 vs 直连
const tests = [
  { name: "直连 deepseek-chat", url: "https://api.deepseek.com/v1/chat/completions", key: "sk-a2a142c936c74cd6ab7899268ca1269c", model: "deepseek-chat" },
  { name: "代理 glm-5.3", url: "http://modelrouter.js96296.com/v1/chat/completions", key: "sk-H8UF0IsSBUERzOMCoVJfO9TA7WNDoOQ19nupd5qlv5m0SuzG", model: "glm-5.3" },
  { name: "代理 qwen-plus", url: "http://modelrouter.js96296.com/v1/chat/completions", key: "sk-H8UF0IsSBUERzOMCoVJfO9TA7WNDoOQ19nupd5qlv5m0SuzG", model: "qwen-plus" },
  { name: "代理 deepseek-v4-pro", url: "http://modelrouter.js96296.com/v1/chat/completions", key: "sk-H8UF0IsSBUERzOMCoVJfO9TA7WNDoOQ19nupd5qlv5m0SuzG", model: "deepseek-v4-pro" },
];

const AjSql = require("./app/service/aiSql.js");
AjSql.reloadAll();
const svc = Object.create(AjSql.prototype);
svc.ctx = { logger: { info: () => {}, warn: () => {}, error: () => {} } };
svc.app = { baseDir: __dirname, logger: { info: () => {} } };
svc.config = { deepseek: {} };

const req = "查询无锡移网在网客户、活跃客户去重数 按广电站聚合";

(async () => {
  const sys = await svc._buildSystemPrompt(req);
  console.log("prompt长度:", sys.length);
  for (const t of tests) {
    const start = Date.now();
    try {
      const r = await fetch(t.url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${t.key}` },
        body: JSON.stringify({
          model: t.model,
          messages: [{ role: "system", content: sys }, { role: "user", content: req }],
          temperature: 0.1,
          max_tokens: 16384,
          stream: false,
        }),
        signal: AbortSignal.timeout(120000),
      });
      if (!r.ok) {
        console.log(`${t.name}: HTTP ${r.status} - ${(await r.text()).substring(0, 100)}`);
        continue;
      }
      const d = await r.json();
      const msg = d.choices?.[0]?.message || {};
      const c = msg.content || "";
      const ok = /```sql/i.test(c);
      console.log(`${t.name}: ${((Date.now() - start) / 1000).toFixed(1)}s | reasoning:${(msg.reasoning_content || "").length}字 | content:${c.length}字 | SQL块:${ok ? "有" : "无"} | finish:${d.choices?.[0]?.finish_reason}`);
    } catch (e) {
      console.log(`${t.name}: 失败 - ${e.message} (${((Date.now() - start) / 1000).toFixed(1)}s)`);
    }
  }
})();
