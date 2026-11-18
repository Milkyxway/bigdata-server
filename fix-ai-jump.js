const fs = require('fs');
const path = 'c:\\Users\\xjsww\\Desktop\\workspace\\bigdata-fe\\src\\composables\\useAiDataQuery.js';

let content = fs.readFileSync(path, 'utf8');
const hasBom = content.charCodeAt(0) === 0xFEFF;
if (hasBom) content = content.slice(1);

// 1. 添加 router import
const oldImport = "import { copyContent } from '../util/common'";
const newImport = "import { copyContent } from '../util/common'\nimport router from '../router/index'";
if (!content.includes(oldImport)) {
  console.error('FAIL: import anchor not found');
  process.exit(1);
}
content = content.replace(oldImport, newImport);

// 2. 在 chartType 检测前插入跳转逻辑
const anchor = '    const chartType = detectChartType(state.aiInput)';
const insertion = "    const role = getLocalStore('userInfo').role\n    router.push(role === 'developer' ? '/develop/tasklist' : '/report/list')\n";
if (!content.includes(anchor)) {
  console.error('FAIL: jump anchor not found');
  process.exit(1);
}
content = content.replace(anchor, insertion + anchor);

fs.writeFileSync(path, (hasBom ? '\uFEFF' : '') + content, 'utf8');
console.log('DONE');