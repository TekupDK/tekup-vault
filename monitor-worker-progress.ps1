# TekupVault Worker Progress Monitor
# Dette script viser real-time progress mens worker kører

$supabaseUrl = "https://twaoebtlusudzxshjral.supabase.co"
$serviceKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3YW9lYnRsdXN1ZHp4c2hqcmFsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MDQ2MzIxMCwiZXhwIjoyMDc2MDM5MjEwfQ.eBdhCLPdXoO6B6k1GrybkswcOjL1InwJo6qwoqH7ec8"

$headers = @{
    "apikey" = $serviceKey
    "Authorization" = "Bearer $serviceKey"
    "Prefer" = "count=exact"
}

function Get-Progress {
    try {
        # Get documents count
        $docsResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_documents?select=id" -Headers $headers -Method GET -ErrorAction SilentlyContinue
        $docsRange = $docsResponse.Headers['Content-Range']
        $totalDocs = 0
        if ($docsRange -match '(\d+)$') {
            $totalDocs = [int]$matches[1]
        }

        # Get embeddings count
        $embResponse = Invoke-WebRequest -Uri "$supabaseUrl/rest/v1/vault_embeddings?select=id" -Headers $headers -Method GET -ErrorAction SilentlyContinue
        $embRange = $embResponse.Headers['Content-Range']
        $totalEmb = 0
        if ($embRange -match '(\d+)$') {
            $totalEmb = [int]$matches[1]
        }

        return @{
            TotalDocs = $totalDocs
            TotalEmb = $totalEmb
            Progress = if ($totalDocs -gt 0) { [math]::Round(($totalEmb / $totalDocs) * 100, 2) } else { 0 }
            Remaining = $totalDocs - $totalEmb
        }
    } catch {
        return $null
    }
}

function Show-ProgressBar {
    param(
        [int]$Percent,
        [int]$Total,
        [int]$Current,
        [int]$Remaining
    )
    
    $barLength = 50
    $filled = [math]::Floor(($Percent / 100) * $barLength)
    $empty = $barLength - $filled
    
    $bar = "[" + ("█" * $filled) + ("░" * $empty) + "]"
    
    Write-Host "`r$bar $Percent% " -NoNewline -ForegroundColor Cyan
    Write-Host "($Current/$Total) " -NoNewline -ForegroundColor Yellow
    Write-Host "Remaining: $Remaining" -NoNewline -ForegroundColor Magenta
}

# Clear screen
Clear-Host

Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║       TekupVault Worker - Real-Time Progress Monitor      ║" -ForegroundColor Cyan
Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Cyan
Write-Host ""

# Get initial status
Write-Host "[INFO] Henter initial status..." -ForegroundColor Gray
$initial = Get-Progress

if ($null -eq $initial) {
    Write-Host "[ERROR] Kunne ikke forbinde til Supabase!" -ForegroundColor Red
    exit 1
}

Write-Host "[OK] Forbindelse etableret!" -ForegroundColor Green
Write-Host ""
Write-Host "Initial Status:" -ForegroundColor Yellow
Write-Host "  Documents: $($initial.TotalDocs)" -ForegroundColor White
Write-Host "  Embeddings: $($initial.TotalEmb)" -ForegroundColor White
Write-Host "  Progress: $($initial.Progress)%" -ForegroundColor White
Write-Host ""

# Check if already complete
if ($initial.Remaining -eq 0 -and $initial.TotalDocs -gt 0) {
    Write-Host "✅ Embeddings er allerede 100% færdige!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Total: $($initial.TotalDocs) documents, $($initial.TotalEmb) embeddings" -ForegroundColor Cyan
    exit 0
}

# Ask if user wants to start worker
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "Vil du starte worker for at færdiggøre embeddings?" -ForegroundColor Yellow
Write-Host "  1) Ja - Start worker og monitorer progress" -ForegroundColor White
Write-Host "  2) Nej - Bare monitorer eksisterende process" -ForegroundColor White
Write-Host ""
$choice = Read-Host "Vælg (1/2)"

$workerProcess = $null

if ($choice -eq "1") {
    Write-Host ""
    Write-Host "[INFO] Bygger projektet først..." -ForegroundColor Cyan
    
    # Build project
    $buildOutput = pnpm build 2>&1
    
    Write-Host "[OK] Build færdig!" -ForegroundColor Green
    Write-Host ""
    Write-Host "[INFO] Starter worker i baggrunden..." -ForegroundColor Cyan
    
    # Start worker in background
    $workerProcess = Start-Process -FilePath "node" `
        -ArgumentList "apps/vault-worker/dist/index.js" `
        -WorkingDirectory $PSScriptRoot `
        -WindowStyle Hidden `
        -PassThru
    
    Write-Host "[OK] Worker startet (PID: $($workerProcess.Id))" -ForegroundColor Green
    Write-Host ""
    Start-Sleep -Seconds 3
}

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
Write-Host "Monitorer progress - Tryk Ctrl+C for at stoppe" -ForegroundColor Yellow
Write-Host ""

# Monitor progress
$lastProgress = -1
$iterations = 0
$startTime = Get-Date

try {
    while ($true) {
        $current = Get-Progress
        
        if ($null -ne $current) {
            # Only update if progress changed
            if ($current.Progress -ne $lastProgress) {
                $elapsed = (Get-Date) - $startTime
                $elapsedStr = "{0:mm}:{0:ss}" -f $elapsed
                
                Write-Host "`r" -NoNewline
                Show-ProgressBar -Percent $current.Progress -Total $current.TotalDocs -Current $current.TotalEmb -Remaining $current.Remaining
                Write-Host " | Elapsed: $elapsedStr" -NoNewline -ForegroundColor Gray
                
                $lastProgress = $current.Progress
                
                # Check if complete
                if ($current.Remaining -eq 0 -and $current.TotalDocs -gt 0) {
                    Write-Host ""
                    Write-Host ""
                    Write-Host "╔═══════════════════════════════════════════════════════════╗" -ForegroundColor Green
                    Write-Host "║                  ✅ EMBEDDINGS FÆRDIGE!                   ║" -ForegroundColor Green
                    Write-Host "╚═══════════════════════════════════════════════════════════╝" -ForegroundColor Green
                    Write-Host ""
                    Write-Host "Total Documents: $($current.TotalDocs)" -ForegroundColor Cyan
                    Write-Host "Total Embeddings: $($current.TotalEmb)" -ForegroundColor Cyan
                    Write-Host "Progress: $($current.Progress)%" -ForegroundColor Green
                    Write-Host "Tid brugt: $elapsedStr" -ForegroundColor Yellow
                    Write-Host ""
                    
                    # Stop worker if we started it
                    if ($null -ne $workerProcess -and !$workerProcess.HasExited) {
                        Write-Host "[INFO] Stopper worker process..." -ForegroundColor Cyan
                        Stop-Process -Id $workerProcess.Id -Force
                        Write-Host "[OK] Worker stoppet!" -ForegroundColor Green
                    }
                    
                    break
                }
            }
        }
        
        $iterations++
        Start-Sleep -Seconds 5
    }
} catch {
    Write-Host ""
    Write-Host ""
    Write-Host "[INFO] Monitoring stoppet af bruger" -ForegroundColor Yellow
    
    # Stop worker if we started it
    if ($null -ne $workerProcess -and !$workerProcess.HasExited) {
        Write-Host "[INFO] Stopper worker process..." -ForegroundColor Cyan
        Stop-Process -Id $workerProcess.Id -Force
        Write-Host "[OK] Worker stoppet!" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Gray
Write-Host ""
