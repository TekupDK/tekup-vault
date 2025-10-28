$headers = @{
    "Content-Type" = "application/json"
    "X-API-Key" = "tekup_vault_api_key_2025_secure"
}

$body = @{
    query = "Billy API MCP server"
    limit = 5
    threshold = 0.5
    repository = "JonasAbde/Tekup-Billy"
} | ConvertTo-Json

Write-Host "Testing TekupVault Search API (Tekup-Billy specific)..." -ForegroundColor Cyan
Write-Host "Query: Billy API MCP server"
Write-Host "Repository: JonasAbde/Tekup-Billy"
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/search" -Method POST -Headers $headers -Body $body
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Results Count: $($response.count)"
    Write-Host ""
    
    if ($response.results) {
        foreach ($result in $response.results) {
            Write-Host "---" -ForegroundColor Yellow
            Write-Host "Repository: $($result.document.repository)"
            Write-Host "File: $($result.document.path)"
            Write-Host "Similarity: $($result.document.similarity)"
            Write-Host "Content Preview (first 150 chars):"
            Write-Host $result.document.content.Substring(0, [Math]::Min(150, $result.document.content.Length)) -ForegroundColor Gray
            Write-Host ""
        }
    } else {
        Write-Host "No results found" -ForegroundColor Red
        Write-Host ""
        Write-Host "This might mean:"
        Write-Host "1. Embeddings for Tekup-Billy files are not yet generated"
        Write-Host "2. Query doesn't match any content"
        Write-Host "3. Threshold is too high"
    }
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
