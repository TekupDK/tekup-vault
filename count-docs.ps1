$supabaseUrl = "https://twaoebtlusudzxshjral.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YW9lYnRsdXN1ZHp4c2hqcmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MzIxMCwiZXhwIjoyMDc2MDM5MjEwfQ.eBdhCLPdXoO6B6k1GrybkswcOjL1InwJo6qwoqH7ec8"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Prefer" = "count=exact"
}

Write-Host "Counting documents..." -ForegroundColor Cyan

# Get total count
$response = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_documents?select=*" -Headers $headers -Method GET

$contentRange = $response.Headers['Content-Range']
Write-Host "Content-Range: $contentRange"

# Parse count from content-range header
if ($contentRange -match '(\d+)$') {
    $totalCount = $matches[1]
    Write-Host "Total Documents: $totalCount" -ForegroundColor Green
}

# Get count per repository
Write-Host ""
Write-Host "Documents per repository:"
$repos = @("JonasAbde/Tekup-Billy", "JonasAbde/renos-backend", "JonasAbde/renos-frontend")

foreach ($repo in $repos) {
    $repoResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_documents?repository=eq.$repo&select=*" -Headers $headers -Method GET
    $repoRange = $repoResponse.Headers['Content-Range']
    if ($repoRange -match '(\d+)$') {
        Write-Host "  $repo : $($matches[1])"
    }
}
