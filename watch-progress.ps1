# Simple kontinuerlig progress monitor
# Viser status hver 5. sekund uden at starte worker

$supabaseUrl = "https://twaoebtlusudzxshjral.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YW9lYnRsdXN1ZHp4c2hqcmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MzIxMCwiZXhwIjoyMDc2MDM5MjEwfQ.eBdhCLPdXoO6B6k1GrybkswcOjL1InwJo6qwoqH7ec8"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Prefer" = "count=exact"
}

Clear-Host
Write-Host "TekupVault Progress Watcher - Opdaterer hver 5. sekund" -ForegroundColor Cyan
Write-Host "Tryk Ctrl+C for at stoppe" -ForegroundColor Yellow
Write-Host ""

$iteration = 0

try {
    while ($true) {
        $iteration++
        $timestamp = Get-Date -Format "HH:mm:ss"
        
        # Get documents
        $docsResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_documents?select=id" -Headers $headers -Method GET -ErrorAction SilentlyContinue
        $docsRange = $docsResponse.Headers['Content-Range']
        $totalDocs = 0
        if ($docsRange -match '(\d+)$') {
            $totalDocs = [int]$matches[1]
        }

        # Get embeddings
        $embResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_embeddings?select=id" -Headers $headers -Method GET -ErrorAction SilentlyContinue
        $embRange = $embResponse.Headers['Content-Range']
        $totalEmb = 0
        if ($embRange -match '(\d+)$') {
            $totalEmb = [int]$matches[1]
        }

        $remaining = $totalDocs - $totalEmb
        $progress = if ($totalDocs -gt 0) { [math]::Round(($totalEmb / $totalDocs) * 100, 2) } else { 0 }
        
        # Progress bar
        $barLength = 40
        $filled = [math]::Floor(($progress / 100) * $barLength)
        $empty = $barLength - $filled
        $bar = "[" + ("█" * $filled) + ("░" * $empty) + "]"
        
        Write-Host "`r[$timestamp] $bar $progress% | Docs: $totalDocs | Embeddings: $totalEmb | Remaining: $remaining " -NoNewline
        
        if ($remaining -eq 0 -and $totalDocs -gt 0) {
            Write-Host ""
            Write-Host ""
            Write-Host "✅ FÆRDIG! Alle embeddings er genereret!" -ForegroundColor Green
            break
        }
        
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host ""
    Write-Host "Monitoring stoppet" -ForegroundColor Yellow
}

Write-Host ""
