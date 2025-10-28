Write-Host "Checking TekupVault Sync Status..." -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "http://localhost:3002/api/sync-status" -Method GET
    
    Write-Host "SUCCESS!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Total Repositories: $($response.items.Count)"
    Write-Host ""
    
    foreach ($item in $response.items) {
        Write-Host "---"
        Write-Host "Repository: $($item.repository)" -ForegroundColor Yellow
        Write-Host "Source: $($item.source)"
        Write-Host "Status: $($item.status)"
        Write-Host "Last Sync: $($item.last_sync_at)"
        if ($item.error_message) {
            Write-Host "Error: $($item.error_message)" -ForegroundColor Red
        }
        Write-Host ""
    }
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
