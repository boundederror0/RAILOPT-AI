$ErrorActionPreference = "Stop"
$base = "http://localhost:3100"
$jar = "$env:TEMP\simtest\cookies"
New-Item -ItemType Directory -Force -Path "$env:TEMP\simtest" | Out-Null
Remove-Item -LiteralPath $jar -ErrorAction SilentlyContinue

function Post-Json($url, $body, $cookies) {
  $f = "$env:TEMP\simtest\body.json"
  Set-Content -LiteralPath $f -Value ($body | ConvertTo-Json -Depth 6) -Encoding UTF8 -NoNewline
  $args = @("-s", "-o", "$env:TEMP\simtest\out.txt", "-w", "%{http_code}", "-H", "Content-Type: application/json", "--data-binary", "@$f", "$url")
  if ($cookies) { $args += @("-b", $cookies, "-c", $cookies) }
  $code = & curl.exe $args 2>$null
  $resp = Get-Content "$env:TEMP\simtest\out.txt" -Raw -ErrorAction SilentlyContinue
  return [PSCustomObject]@{ Code = $code; Body = $resp }
}
function Login($posting, $division) {
  $r = Post-Json "$base/api/auth/login" @{ postingId = $posting; password = "railopt@123"; zoneId = "SR"; divisionId = $division } $jar
  return $r
}

# 1) Unauthenticated simulation run -> 401
$unauth = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "accept" } $null
"1) unauth run            -> {0} {1}" -f $unauth.Code, ($unauth.Body.Substring(0, [Math]::Min(80, $unauth.Body.Length)))

# 2) GM (has simulation.run since profile grant) -> 200
$gm = Login "GM" "ZONE"
Set-Content "$env:TEMP\simtest\gm.txt" -Value $gm.Body
$gmRun = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "accept" } $jar
$gmObj = $gmRun.Body | ConvertFrom-Json
"2) GM run (sim.run)      -> {0}  trains={1} persisted={2}" -f $gmRun.Code, $gmObj.result.kpis.trainsAffected, $gmObj.result.persisted

# 2b) POST without any scenario (no guard match -> falls to saveParams, needs settings.view) -> 200
$gmNoScn = Post-Json "$base/api/simulation" @{} $jar
"2b) GM no-scenario save  -> {0}" -f $gmNoScn.Code

# 2c) DOM (no simulation.run) -> 403
$dom = Login "DOM" "MDU"
$domRun = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "accept" } $jar
"2c) DOM run (no sim.run) -> {0} {1}" -f $domRun.Code, ($domRun.Body.Substring(0, [Math]::Min(80, $domRun.Body.Length)))

# 3) PCOM (has simulation.run) -> 200 accept
$pcom = Login "PCOM" "ZONE"
Set-Content "$env:TEMP\simtest\acc.txt" -Value $pcom.Body
$acc = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "accept" } $jar
"3) PCOM accept           -> {0}" -f $acc.Code
$obj = $acc.Body | ConvertFrom-Json
"   persisted={0}  trains={1} max={2} total={3} conflicts={4} impacts={5}" -f $obj.result.persisted, $obj.result.kpis.trainsAffected, $obj.result.kpis.maxDelay, $obj.result.kpis.totalDelay, $obj.result.kpis.conflicts, $obj.result.impacts.Count

# 4) PCOM move
$mv = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "move"; alternativeStartTime = "2026-09-12T14:30" } $jar
$mvObj = $mv.Body | ConvertFrom-Json
"4) PCOM move             -> {0}  proposedWin={1} chosenWin={2} diffTrains={3}" -f $mv.Code, ($mvObj.result.proposedWindow.startTime.Substring(11,5)), ($mvObj.result.chosenWindow.startTime.Substring(11,5)), ($mvObj.result.comparison.chosen.trainsAffected - $mvObj.result.comparison.proposed.trainsAffected)

# 5) PCOM defer
$df = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "defer" } $jar
$dfObj = $df.Body | ConvertFrom-Json
"5) PCOM defer             -> {0}  trains={1} status={2}" -f $df.Code, $dfObj.result.kpis.trainsAffected, $dfObj.result.kpis.blockStatus

# 6) Invalid scenario -> 400
$inv = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "explode" } $jar
"6) invalid scenario       -> {0} {1}" -f $inv.Code, ($inv.Body.Substring(0, [Math]::Min(80, $inv.Body.Length)))

# 7) Missing request -> 404
$miss = Post-Json "$base/api/simulation" @{ requestId = "MR-9999-0001"; scenario = "accept" } $jar
"7) missing request        -> {0} {1}" -f $miss.Code, ($miss.Body.Substring(0, [Math]::Min(80, $miss.Body.Length)))

# 8) Both requestId and blockId -> 400
$both = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; blockId = "BLK-001"; scenario = "accept" } $jar
"8) both ids               -> {0} {1}" -f $both.Code, ($both.Body.Substring(0, [Math]::Min(80, $both.Body.Length)))

# 9) blockId path (PCOM) -> 200
$blk = Post-Json "$base/api/simulation" @{ blockId = "BLK-001"; scenario = "defer" } $jar
$blkObj = $blk.Body | ConvertFrom-Json
"9) by blockId             -> {0}  requestId={1}" -f $blk.Code, $blkObj.result.requestId

# 10) Cross-department scope: SR_DEN lacks simulation.run entirely -> 403 (permission check);
#     department-scope check is defense-in-depth (no demo posting holds simulation.run while being dept-scoped).
$den = Login "SR_DEN" "MDU"
Set-Content "$env:TEMP\simtest\den.txt" -Value $den.Body
$dep = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "accept" } $jar
"10) SR_DEN on S&T req     -> {0} {1}" -f $dep.Code, ($dep.Body.Substring(0, [Math]::Min(80, $dep.Body.Length)))

# 11) Performance: re-login as PCOM (has simulation.run) then time accept
$pcom2 = Login "PCOM" "ZONE"
Set-Content "$env:TEMP\simtest\pcom2.txt" -Value $pcom2.Body
$times = @()
$perf = $null
for ($i = 0; $i -lt 5; $i++) {
  $t0 = Get-Date
  $perf = Post-Json "$base/api/simulation" @{ requestId = "MR-2026-0001"; scenario = "accept" } $jar
  $t1 = Get-Date
  $times += [Math]::Round(($t1 - $t0).TotalMilliseconds, 0)
}
"12) avg response (accept, 5 runs) = {0} ms ({1}) code {2}" -f [Math]::Round(($times | Measure-Object -Average).Average, 1), ($times -join ","), $perf.Code

# 13) Settings params save still works (settings.view) — via GM
$gm2 = Login "GM" "ZONE"
$save = Post-Json "$base/api/simulation" @{ blockStartOffset = 1; blockDuration = 1; maintenancePriority = "auto"; maxTeams = 4; trainPriorityWeight = 1; simultaneousBlocks = 1 } $jar
"13) settings save (GM)    -> {0}" -f $save.Code

# 14) GET simulation still works (PCOM)
$gOut = & curl.exe -s -b $jar -w "|%{http_code}" "$base/api/simulation" 2>$null
$gParts = $gOut.Split("|")
"14) GET /api/simulation   -> code={0} body={1}" -f $gParts[-1], $gParts[0].Substring(0, [Math]::Min(70, $gParts[0].Length))