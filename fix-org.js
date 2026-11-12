const fs = require('fs');

function fixPeriod() {
  const p = 'C:\\Users\\xjsww\\Desktop\\workspace\\bigdata-fe\\src\\components\\PeriodForm.vue';
  let raw = fs.readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const before = raw;
  // 删除注释行（连同换行）
  raw = raw.replace(/[ \t]*\/\/ taskAssignOrg:.*\r?\n/, '');
  // split(',') -> split(',').map(Number)
  raw = raw.split("taskAssignOrg: taskAssignOrg.split(','),").join("taskAssignOrg: taskAssignOrg.split(',').map(Number),");
  if (raw === before) { console.log('MISS PeriodForm'); process.exitCode = 1; }
  else { fs.writeFileSync(p, raw, 'utf8'); console.log('OK PeriodForm'); }
}

function fixOneTime() {
  const p = 'C:\\Users\\xjsww\\Desktop\\workspace\\bigdata-fe\\src\\components\\OneTimeForm.vue';
  let raw = fs.readFileSync(p, 'utf8');
  if (raw.charCodeAt(0) === 0xFEFF) raw = raw.slice(1);
  const before = raw;
  // map((i) => orgMap[i]) -> map(Number)
  raw = raw.split("taskAssignOrg: taskAssignOrg.split(',').map((i) => orgMap[i])").join("taskAssignOrg: taskAssignOrg.split(',').map(Number)");
  // 初始值 '' -> []
  raw = raw.split("    taskAssignOrg: ''").join("    taskAssignOrg: []");
  if (raw === before) { console.log('MISS OneTimeForm'); process.exitCode = 1; }
  else { fs.writeFileSync(p, raw, 'utf8'); console.log('OK OneTimeForm'); }
}

fixPeriod();
fixOneTime();