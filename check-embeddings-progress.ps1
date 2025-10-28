$supabaseUrl = "https://twaoebtlusudzxshjral.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YW9lYnRsdXN1ZHp4c2hqcmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MzIxMCwiZXhwIjoyMDc2MDM5MjEwfQ.eBdhCLPdXoO6B6k1GrybkswcOjL1InwJo6qwoqH7ec8"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Prefer" = "count=exact"
}

Write-Host "Checking Embeddings Progress..." -ForegroundColor Cyan
Write-Host ""

# Get documents count
$docsResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_documents?select=*" -Headers $headers -Method GET
$docsRange = $docsResponse.Headers['Content-Range']
if ($docsRange -match '(\d+)$') {
    $totalDocs = [int]$matches[1]
    Write-Host "Total Documents: $totalDocs" -ForegroundColor Yellow
}

# Get embeddings count
$embResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_embeddings?select=*" -Headers $headers -Method GET
$embRange = $embResponse.Headers['Content-Range']
if ($embRange -match '(\d+)$') {
    $totalEmb = [int]$matches[1]
    Write-Host "Total Embeddings: $totalEmb" -ForegroundColor Yellow
}

# Calculate progress
if ($totalDocs -gt 0) {
    $progress = [math]::Round(($totalEmb / $totalDocs) * 100, 2)
    Write-Host ""
    Write-Host "Progress: $progress%" -ForegroundColor Green
    Write-Host "Remaining: $($totalDocs - $totalEmb) documents" -ForegroundColor Cyan
}
