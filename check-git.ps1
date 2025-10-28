# Check git status
cd "c:\Users\empir\TekupVault"
Write-Host "🔍 Checking git status..." -ForegroundColor Cyan
& git status
Write-Host ""

# Check if we need to commit anything
$status = & git status --porcelain
if ($status) {
    Write-Host "⚠️  Uncommitted changes:" -ForegroundColor Yellow
    $status | ForEach-Object { Write-Host "   $_" -ForegroundColor Gray }
    Write-Host ""
    Write-Host "💡 Consider committing before deployment:" -ForegroundColor Cyan
    Write-Host "   git add ." -ForegroundColor Green
    Write-Host "   git commit -m 'feat: Complete TekupVault implementation'" -ForegroundColor Green
    Write-Host "   git push origin main" -ForegroundColor Green
} else {
    Write-Host "✅ No uncommitted changes - ready for deployment!" -ForegroundColor Green
}

