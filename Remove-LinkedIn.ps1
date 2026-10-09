# PowerShell script to remove all LinkedIn references from HTML files

$repoPath = "C:\Users\Thibault  MERLIN\Documents\GitHub\Terra-Form"
$linkedInPattern = '<a\s+[^>]*aria-label="LinkedIn"[^>]*>.*?</a>'

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  LinkedIn Removal Tool" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Repository: $repoPath" -ForegroundColor Yellow
Write-Host ""

if (-not (Test-Path $repoPath)) {
    Write-Host "ERROR: Repository path not found!" -ForegroundColor Red
    exit 1
}

$cleanedFiles = @()
$htmlFiles = Get-ChildItem -Path $repoPath -Filter "*.html" -Recurse -File

Write-Host "Found $($htmlFiles.Count) HTML file(s)" -ForegroundColor Yellow
Write-Host ""

foreach ($file in $htmlFiles) {
    try {
        $originalContent = Get-Content -Path $file.FullName -Raw -Encoding UTF8
        $newContent = $originalContent -replace $linkedInPattern, ''

        if ($originalContent -ne $newContent) {
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8 -NoNewline
            $cleanedFiles += $file.FullName
            Write-Host "✓ Cleaned: $($file.FullName)" -ForegroundColor Green
        } else {
            Write-Host "  Skipped: $($file.FullName)" -ForegroundColor Gray
        }
    } catch {
        Write-Host "✗ Error: $($file.FullName)" -ForegroundColor Red
        Write-Host "  $_" -ForegroundColor Red
    }
}

Write-Host ""
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Cleanup Complete" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleaned $($cleanedFiles.Count) file(s)" -ForegroundColor Green
Write-Host ""

if ($cleanedFiles.Count -gt 0) {
    Write-Host "Files modified:" -ForegroundColor Yellow
    $cleanedFiles | ForEach-Object {
        Write-Host "  - $_" -ForegroundColor Gray
    }
}

Write-Host ""
Write-Host "Next step: Open GitHub Desktop to review and commit changes" -ForegroundColor Cyan
Read-Host "Press Enter to continue"
