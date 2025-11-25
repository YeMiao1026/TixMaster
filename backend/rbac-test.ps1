# RBAC/ABAC Verification Script
$baseUrl = "http://localhost:3000"

function Test-Endpoint {
    param($name, $url, $method, $token, $body, $expectedStatus)
    
    Write-Host "Testing $name..." -NoNewline
    
    $headers = @{}
    if ($token) { $headers["Authorization"] = "Bearer $token" }
    
    try {
        $params = @{
            Uri         = $url
            Method      = $method
            Headers     = $headers
            ContentType = "application/json"
        }
        if ($body) { $params.Body = ($body | ConvertTo-Json) }
        
        $response = Invoke-WebRequest @params -ErrorAction Stop
        $status = $response.StatusCode
    }
    catch {
        $status = $_.Exception.Response.StatusCode
        $response = $_.Exception.Response
    }
    
    if ($status -eq $expectedStatus) {
        Write-Host " PASS ($status)" -ForegroundColor Green
    }
    else {
        Write-Host " FAIL (Expected $expectedStatus, got $status)" -ForegroundColor Red
    }
    return $response
}

# 1. Register a new user (Default role: user)
$rand = Get-Random
$email = "user$rand@example.com"
$password = "password123"

Write-Host "`n--- 1. Register New User ---" -ForegroundColor Cyan
$regBody = @{ email = $email; password = $password; name = "Test User"; phone = "1234567890" }
$regRes = Test-Endpoint "Register" "$baseUrl/api/users/register" "POST" $null $regBody 201

# 2. Login
Write-Host "`n--- 2. Login ---" -ForegroundColor Cyan
$loginBody = @{ email = $email; password = $password }
$loginRes = Invoke-WebRequest -Uri "$baseUrl/api/users/login" -Method POST -Body ($loginBody | ConvertTo-Json) -ContentType "application/json"
$token = ($loginRes.Content | ConvertFrom-Json).token
Write-Host "Got Token" -ForegroundColor Gray

# 3. Test RBAC: Admin Only Endpoint (Should Fail)
Write-Host "`n--- 3. Test RBAC (Admin Only) ---" -ForegroundColor Cyan
Test-Endpoint "Get All Users (As User)" "$baseUrl/api/users/all" "GET" $token $null 403

# 4. Test ABAC: Update Own Profile (Should Succeed)
Write-Host "`n--- 4. Test ABAC (Own Profile) ---" -ForegroundColor Cyan
$updateBody = @{ name = "Updated Name"; phone = "0987654321" }
Test-Endpoint "Update Own Profile" "$baseUrl/api/users/profile" "PUT" $token $updateBody 200

# 5. Manual Admin Promotion (Simulated for test)
# In a real scenario, we'd need database access to promote.
# For this script, we'll just output instructions.
Write-Host "`n--- 5. Admin Test Instructions ---" -ForegroundColor Yellow
Write-Host "To test Admin access:"
Write-Host "1. Run: UPDATE users SET role = 'admin' WHERE email = '$email';"
Write-Host "2. Re-login to get new token with admin role"
Write-Host "3. Try GET /api/users/all again"
