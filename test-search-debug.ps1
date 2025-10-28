$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "tekup_vault_api_key_2025_secure"
}

$body = @{
    query = "Billy API MCP server documentation"
    limit = 3
    threshold = 0.5
} | ConvertTo-Json

Write-Host "Testing TekupVault Search API (Full Debug)..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/search" -Method POST -Headers $headers -Body $body
    
    Write-Host "Response JSON:" -ForegroundColor Yellow
    $response | ConvertTo-Json -Depth 10 | Write-Host
    
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
