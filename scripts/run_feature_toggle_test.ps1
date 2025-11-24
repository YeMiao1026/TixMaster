<#
.\scripts\run_feature_toggle_test.ps1

用途：針對指定 ToggleKey 執行 On / Off / Transaction-switch 測試，並輸出結果 JSON。
此腳本支援兩種運作模式：
  1) Admin API 模式：提供 `-ToggleAdminPath`，會向管理 API 呼叫來開/關 toggle（預期為 POST /admin/toggles/{key} body { value: true/false }）。
  2) Header 模式：若無管理 API，可使用 header 模擬（會在每個請求加入 `X-Feature-{key}: true/false`）。

使用方式（範例）：
  pwsh> .\scripts\run_feature_toggle_test.ps1 -BaseUrl 'http://localhost:3000' -ToggleKey 'checkout_v2' -Mode Header -Username 'test' -Password 'test'

輸出：預設會把結果寫到 `.\tests\toggle_test_result_{ToggleKey}.json`
#>

param(
    [Parameter(Mandatory=$true)][string]$BaseUrl,
    [Parameter(Mandatory=$true)][string]$ToggleKey,
    [ValidateSet('AdminApi','Header')][string]$Mode = 'Header',
    [string]$ToggleAdminPath = '/admin/toggles',
    [string]$Username,
    [string]$Password,
    [string]$Token,
    [string]$Output = "./tests/toggle_test_result_$($ToggleKey).json"
)

function Write-Json($obj,$path){
    $dir = Split-Path -Parent $path
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $obj | ConvertTo-Json -Depth 6 | Out-File -FilePath $path -Encoding UTF8
    Write-Output "[INFO] Wrote results to $path"
}

# helper: set toggle
function Set-Toggle([bool]$value){
    if ($Mode -eq 'AdminApi'){
        $uri = $BaseUrl.TrimEnd('/') + $ToggleAdminPath.TrimEnd('/') + '/' + $ToggleKey
        $body = @{ value = $value } | ConvertTo-Json
        try {
            Invoke-RestMethod -Method Post -Uri $uri -Body $body -ContentType 'application/json' -Headers @{ Authorization = "Bearer $Token" }
            Write-Output "[INFO] Set toggle $ToggleKey -> $value via AdminApi"
            Start-Sleep -Seconds 1
            return $true
        } catch { Write-Output "[WARN] Failed to set toggle via AdminApi: $_"; return $false }
    } else {
        # Header mode means we don't persist; caller will add headers per request
        Write-Output "[INFO] Header mode active; will include header X-Feature-$ToggleKey in requests"
        return $true
    }
}

# helper: run smoke scenario using smoke_test.ps1 logic inline to avoid cross-script dependencies
function Run-SmokeScenario([hashtable]$opts){
    $b = $opts.BaseUrl; $h = $opts.Headers
    $res = [ordered]@{ login=@{}; add_to_cart=@{}; checkout=@{}; order_query=@{} }
    try {
        if (-not $Token) {
            $body = @{ username = $Username; password = $Password } | ConvertTo-Json
            $resp = Invoke-RestMethod -Method Post -Uri ($b.TrimEnd('/') + '/api/login') -Body $body -ContentType 'application/json' -Headers $h
            $t = $resp.token; if (-not $t) { $t = $resp.access_token }
            $opts.Headers.Authorization = "Bearer $t"
            $res.login = @{ ok=$true; detail = ($resp | ConvertTo-Json -Depth 3) }
        } else {
            $res.login = @{ ok=$true; detail = 'token provided' }
            $opts.Headers.Authorization = "Bearer $Token"
        }
    } catch { $res.login=@{ ok=$false; detail=$_.Exception.Message }; return $res }

    try {
        $cartBody = @{ ticketId='TEST-TICKET-001'; quantity=1 } | ConvertTo-Json
        $resp = Invoke-RestMethod -Method Post -Uri ($b.TrimEnd('/') + '/api/cart') -Body $cartBody -ContentType 'application/json' -Headers $opts.Headers
        $res.add_to_cart = @{ ok=$true; detail=($resp|ConvertTo-Json -Depth 3) }
    } catch { $res.add_to_cart=@{ ok=$false; detail=$_.Exception.Message }; return $res }

    try {
        $checkoutBody = @{ paymentMethod='sandbox'; card='TEST' } | ConvertTo-Json
        $resp = Invoke-RestMethod -Method Post -Uri ($b.TrimEnd('/') + '/api/checkout') -Body $checkoutBody -ContentType 'application/json' -Headers $opts.Headers
        $orderId = $resp.orderId; if (-not $orderId) { $orderId = $resp.id }
        $res.checkout = @{ ok = ($orderId -ne $null); orderId = $orderId; detail = ($resp|ConvertTo-Json -Depth 3) }
    } catch { $res.checkout=@{ ok=$false; detail=$_.Exception.Message }; return $res }

    try {
        if (-not $res.checkout.orderId) { throw 'no orderId' }
        $resp = Invoke-RestMethod -Method Get -Uri ($b.TrimEnd('/') + '/api/orders/' + $res.checkout.orderId) -Headers $opts.Headers
        $res.order_query = @{ ok=$true; detail = ($resp|ConvertTo-Json -Depth 3) }
    } catch { $res.order_query=@{ ok=$false; detail=$_.Exception.Message } }

    return $res
}

# main flow
$out = [ordered]@{ toggleKey = $ToggleKey; mode = $Mode; baseUrl = $BaseUrl; runs = @(); timestamp=(Get-Date).ToString('s') }

Write-Output "[INFO] Starting feature toggle tests for $ToggleKey (mode=$Mode)"

# 1) Ensure Off
Set-Toggle $false | Out-Null

if ($Mode -eq 'Header') { $headersOff = @{ ("X-Feature-$ToggleKey") = 'false' } } else { $headersOff = @{} }
$runOff = Run-SmokeScenario @{ BaseUrl = $BaseUrl; Headers = $headersOff }
$out.runs += @{ name='Off'; result = $runOff }

# 2) Ensure On
Set-Toggle $true | Out-Null
if ($Mode -eq 'Header') { $headersOn = @{ ("X-Feature-$ToggleKey") = 'true' } } else { $headersOn = @{} }
$runOn = Run-SmokeScenario @{ BaseUrl = $BaseUrl; Headers = $headersOn }
$out.runs += @{ name='On'; result = $runOn }

# 3) Transaction switch (start checkout then flip)
Write-Output "[INFO] Running transaction-switch test (simulate)"

try {
    # Start checkout (add to cart + begin checkout) using On headers
    $opts = @{ BaseUrl = $BaseUrl; Headers = $headersOn }
    $partial = Run-SmokeScenario $opts
    # if checkout started but no order id yet, flip toggle and try again
    $orderId = $partial.checkout.orderId
    if (-not $orderId) {
        # flip toggle
        Set-Toggle $false | Out-Null
        if ($Mode -eq 'Header') { $opts.Headers["X-Feature-$ToggleKey"] = 'false' }
        # re-run finalization: attempt to query or finalize
        Start-Sleep -Seconds 1
        $final = Run-SmokeScenario $opts
    } else {
        $final = $partial
    }
    $out.runs += @{ name='TransactionSwitch'; result = $final }
} catch { $out.runs += @{ name='TransactionSwitch'; error = $_.Exception.Message } }

Write-Json $out $Output
if ($out.runs[0].result.add_to_cart.ok -and $out.runs[1].result.add_to_cart.ok) { exit 0 } else { exit 10 }
