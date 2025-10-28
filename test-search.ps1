$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "tekup_vault_api_key_2025_secure"
}

$body = @{
    query = "How to create invoice in Billy"
    limit = 5
    threshold = 0.7
} | ConvertTo-Json

Write-Host "Testing TekupVault Search API..."
Write-Host "Query: How to create invoice in Billy"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/search" -Method POST -Headers $headers -Body $body
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results Count: $($response.count)"
    Write-Host ""
    
    if ($response.results) {
        foreach ($result in $response.results) {
            Write-Host "---"
            Write-Host "Repository: $($result.document.repository)"
            Write-Host "File: $($result.document.path)"
            Write-Host "Similarity: $($result.document.similarity)"
            Write-Host "Content Preview: $($result.document.content.Substring(0, [Math]::Min(200, $result.document.content.Length)))..."
            Write-Host ""
        }
    } else {
        Write-Host "No results found" -ForegroundColor Yellow
    }
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
    Write-Host ""
    Write-Host "Response:" $_.Exception.Response
}
