$ErrorActionPreference = 'Stop'

function Fix-Period {
  $p = 'c:\Users\xjsww\Desktop\workspace\bigdata-fe\src\components\PeriodForm.vue'
  $raw = [System.IO.File]::ReadAllText($p)
  $before = $raw
  # 删除注释行（兼容 CRLF / LF）
  $raw = $raw.Replace("      // taskAssignOrg: taskAssignOrg.split(',').map((i) => orgMap[i]),`r`n", "")
  $raw = $raw.Replace("      // taskAssignOrg: taskAssignOrg.split(',').map((i) => orgMap[i]),`n", "")
  # split(',') -> split(',').map(Number)
  $raw = $raw.Replace("      taskAssignOrg: taskAssignOrg.split(','),", "      taskAssignOrg: taskAssignOrg.split(',').map(Number),")
  if ($raw -ne $before) {
    [System.IO.File]::WriteAllText($p, $raw)
    Write-Output 'OK PeriodForm'
  } else {
    Write-Output 'MISS PeriodForm'
  }
}

function Fix-OneTime {
  $p = 'c:\Users\xjsww\Desktop\workspace\bigdata-fe\src\components\OneTimeForm.vue'
  $raw = [System.IO.File]::ReadAllText($p)
  $before = $raw
  # map((i) => orgMap[i]) -> map(Number)
  $raw = $raw.Replace("      taskAssignOrg: taskAssignOrg.split(',').map((i) => orgMap[i])", "      taskAssignOrg: taskAssignOrg.split(',').map(Number)")
  # 初始值 '' -> []
  $raw = $raw.Replace("    taskAssignOrg: ''", "    taskAssignOrg: []")
  if ($raw -ne $before) {
    [System.IO.File]::WriteAllText($p, $raw)
    Write-Output 'OK OneTimeForm'
  } else {
    Write-Output 'MISS OneTimeForm'
  }
}

Fix-Period
Fix-OneTime
Write-Output 'DONE'