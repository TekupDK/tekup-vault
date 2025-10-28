$supabaseUrl = "https://twaoebtlusudzxshjral.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YW9lYnRsdXN1ZHp4c2hqcmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MzIxMCwiZXhwIjoyMDc2MDM5MjEwfQ.eBdhCLPdXoO6B6k1GrybkswcOjL1InwJo6qwoqH7ec8"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
}

Write-Host "Checking embeddings by repository..." -ForegroundColor Cyan
Write-Host ""

$repos = @("JonasAbde/Tekup-Billy", "JonasAbde/renos-backend", "JonasAbde/renos-frontend")

foreach ($repo in $repos) {
    # Get documents for this repo
    $docsResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/vault_documents?repository=eq.$repo&select=id" -Headers $headers
    $docsCount = $docsResponse.Count
    
    # Get embeddings for documents in this repo
    $embResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/vault_embeddings?select=document_id&limit=2000" -Headers $headers
    
    $embeddingsInRepo = 0
    foreach ($doc in $docsResponse) {
        if ($embResponse.document_id -contains $doc.id) {
            $embeddingsInRepo++
        }
    }
    
    $percentage = if ($docsCount -gt 0) { [math]::Round(($embeddingsInRepo / $docsCount) * 100, 1) } else { 0 }
    
    Write-Host "$repo :" -ForegroundColor Yellow
    Write-Host "  Documents: $docsCount"
    Write-Host "  Embeddings: $embeddingsInRepo ($percentage%)"
    Write-Host ""
}
