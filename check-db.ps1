Write-Host "Checking Database Content..." -ForegroundColor Cyan
Write-Host ""

# Using Supabase REST API
$supabaseUrl = "https://twaoebtlusudzxshjral.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YW9lYnRsdXN1ZHp4c2hqcmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MzIxMCwiZXhwIjoyMDc2MDM5MjEwfQ.eBdhCLPdXoO6B6k1GrybkswcOjL1InwJo6qwoqH7ec8"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
}

try {
    # Check documents
    $docsResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/vault_documents?select=count" -Headers $headers -Method HEAD
    $docsCount = $docsResponse.Headers.'Content-Range' -replace '.*/', ''
    
    Write-Host "Documents in vault_documents: $docsCount" -ForegroundColor Green
    
    # Check embeddings
    $embeddingsResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/vault_embeddings?select=count" -Headers $headers -Method HEAD
    $embeddingsCount = $embeddingsResponse.Headers.'Content-Range' -replace '.*/', ''
    
    Write-Host "Embeddings in vault_embeddings: $embeddingsCount" -ForegroundColor Green
    
    Write-Host ""
    Write-Host "Sample documents from Tekup-Billy:"
    $sampleDocs = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/vault_documents?repository=eq.JonasAbde/Tekup-Billy&select=path&limit=10" -Headers $headers
    
    foreach ($doc in $sampleDocs) {
        Write-Host "  - $($doc.path)"
    }
    
} catch {
    Write-Host "ERROR!" -ForegroundColor Red
    Write-Host $_.Exception.Message
}
