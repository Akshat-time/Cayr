$baseUrl = "http://localhost:5000/api"
try {
    Write-Host "--- Health Check ---"
    $health = Invoke-RestMethod -Uri "$baseUrl/health" -Method Get -ErrorAction Stop
    Write-Host "Health Status: $($health.status)"
    Write-Host "DB State: $($health.dbState)"

    if ($health.dbState -eq "connected") {
        Write-Host "`n--- Registration ---"
        $email = "testUser_$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
        $body = @{
            name = "Test User"
            email = $email
            password = "password123"
            role = "PATIENT"
        } | ConvertTo-Json
        $reg = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $body -ContentType "application/json" -ErrorAction Stop
        Write-Host "Registration: $($reg.message)"

        Write-Host "`n--- Login ---"
        $loginBody = @{
            email = $email
            password = "password123"
        } | ConvertTo-Json
        $login = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method Post -Body $loginBody -ContentType "application/json" -ErrorAction Stop
        $token = $login.token
        Write-Host "Login Token Received: $(if ($token) {'Yes'} else {'No'})"

        if ($token) {
            Write-Host "`n--- Verify Session (/me) ---"
            $me = Invoke-RestMethod -Uri "$baseUrl/auth/me" -Method Get -Headers @{ Authorization = "Bearer $token" } -ErrorAction Stop
            Write-Host "User Email: $($me.email)"
            Write-Host "User Role: $($me.role)"
        }
    } else {
        Write-Host "Skipping Auth tests because DB is not connected."
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        Write-Host "Response Body: $($reader.ReadToEnd())"
    }
}
