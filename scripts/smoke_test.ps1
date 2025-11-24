<#
.\scripts\smoke_test.ps1

簡介：最小化的 Smoke 測試腳本，模擬常見關鍵路徑：登入 -> 選票 -> 結帳 -> 訂單查詢。
使用 PowerShell 的 `Invoke-RestMethod` 對 API 進行 HTTP 請求，並輸出結果到 JSON 檔案。

使用方式（範例）：
  pwsh> .\scripts\smoke_test.ps1 -BaseUrl 'http://localhost:3000' -Username 'test' -Password 'test' -Output '.\tests\smoke_result.json'

參數說明：
- BaseUrl: API 根位址（必填）
- Username / Password: 測試帳號（若 API 不需要，可改用 -Token）
- Token: 若你已經有 JWT，可直接傳入，不用 Username/Password
- Output: 輸出檔案路徑（預設：`.\tests\smoke_result.json`）
- UseHeaderToggle: 以 HTTP header 模擬 Feature Toggle，格式會由 ToggleScript 使用

注意：此腳本為範例 runner，會依專案實際 API path 調整 `LoginPath`、`AddToCartPath`、`CheckoutPath`、`OrderQueryPath` 變數。
#>

param(
    [Parameter(Mandatory=$true)] [string]$BaseUrl,
    [string]$Username,
    [string]$Password,
    [string]$Token,
    [string]$Output = '.\tests\smoke_result.json'
)

function Write-Result($obj) {
    $json = $obj | ConvertTo-Json -Depth 5
    $dir = Split-Path -Parent $Output
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir | Out-Null }
    $json | Out-File -FilePath $Output -Encoding UTF8
    Write-Output "[INFO] Results written to $Output"
}

# --- 配置（依據你的 API 調整這些 path）
$LoginPath = '/api/login'
$AddToCartPath = '/api/cart'
$CheckoutPath = '/api/checkout'
$OrderQueryPath = '/api/orders'  # usage: /api/orders/{id}

$result = [ordered]@{
    timestamp = (Get-Date).ToString('s')
    baseUrl = $BaseUrl
    steps = @()
    overall = 'Not run'
}

# 1) Login（若 Token 已提供則跳過）
if (-not $Token) {
    if (-not ($Username -and $Password)) {
        Write-Error "No credentials or token provided. Provide -Token or both -Username and -Password."
        exit 2
    }
    try {
        $body = @{ username = $Username; password = $Password } | ConvertTo-Json
        $resp = Invoke-RestMethod -Method Post -Uri ($BaseUrl.TrimEnd('/') + $LoginPath) -Body $body -ContentType 'application/json'
        $Token = $resp.token; if (-not $Token) { $Token = $resp.access_token }
        $result.steps += @{ step='login'; ok = $true; detail = ($resp | ConvertTo-Json -Depth 3) }
        Write-Output "[INFO] Login succeeded. Token received."
    } catch {
        $result.steps += @{ step='login'; ok = $false; detail = $_.Exception.Message }
        Write-Result $result
        exit 3
    }
} else {
    $result.steps += @{ step='login'; ok = $true; detail = 'Token provided by caller' }
}

# 2) Add to cart
try {
    $cartBody = @{ ticketId = 'TEST-TICKET-001'; quantity = 1 } | ConvertTo-Json
    $headers = @{ Authorization = "Bearer $Token" }
    $resp = Invoke-RestMethod -Method Post -Uri ($BaseUrl.TrimEnd('/') + $AddToCartPath) -Body $cartBody -ContentType 'application/json' -Headers $headers
    $result.steps += @{ step='add_to_cart'; ok = $true; detail = ($resp | ConvertTo-Json -Depth 3) }
    Write-Output "[INFO] Add to cart succeeded."
} catch {
    $result.steps += @{ step='add_to_cart'; ok = $false; detail = $_.Exception.Message }
    Write-Result $result
    exit 4
}

# 3) Checkout (simulate payment via sandbox)
try {
    $checkoutBody = @{ paymentMethod = 'sandbox'; card = 'TEST_CARD'; billing = @{ name='QA Tester' } } | ConvertTo-Json
    $resp = Invoke-RestMethod -Method Post -Uri ($BaseUrl.TrimEnd('/') + $CheckoutPath) -Body $checkoutBody -ContentType 'application/json' -Headers $headers
    # expect order id in response
    $orderId = $resp.orderId; if (-not $orderId) { $orderId = $resp.id }
    $result.steps += @{ step='checkout'; ok = ($orderId -ne $null); detail = ($resp | ConvertTo-Json -Depth 3) }
    if ($orderId) { Write-Output "[INFO] Checkout succeeded. OrderId: $orderId" } else { Write-Output "[WARN] Checkout response did not include order id." }
} catch {
    $result.steps += @{ step='checkout'; ok = $false; detail = $_.Exception.Message }
    Write-Result $result
    exit 5
}

# 4) Order query
try {
    if (-not $orderId) { throw "No orderId available to query." }
    $resp = Invoke-RestMethod -Method Get -Uri ($BaseUrl.TrimEnd('/') + $OrderQueryPath + '/' + $orderId) -Headers $headers
    $result.steps += @{ step='order_query'; ok = $true; detail = ($resp | ConvertTo-Json -Depth 3) }
    Write-Output "[INFO] Order query succeeded for $orderId"
    $result.overall = 'Passed'
} catch {
    $result.steps += @{ step='order_query'; ok = $false; detail = $_.Exception.Message }
    $result.overall = 'Failed'
}

Write-Result $result
if ($result.overall -eq 'Passed') { exit 0 } else { exit 6 }
