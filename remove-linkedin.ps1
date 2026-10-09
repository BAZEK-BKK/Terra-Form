# Remove LinkedIn Links from All HTML Files
# This script removes all LinkedIn social links from the website

Write-Host "🔍 Removing LinkedIn links from all HTML files..." -ForegroundColor Green

$repoPath = "C:\Users\Thibault  MERLIN\Documents\GitHub\Terra-Form\SITE\2509"

if (-not (Test-Path $repoPath)) {
    Write-Host "❌ Error: Path not found: $repoPath" -ForegroundColor Red
    exit 1
}

# Pattern to find LinkedIn link blocks
$linkedInPattern = @'
<a aria-label="LinkedIn" href="#" title="LinkedIn"><svg fill="currentColor" height="18" stroke="none" viewbox="0 0 24 24" width="18"><rect height="12" width="4" x="3" y="9"></rect><circle cx="5" cy="4.5" r="2.3"></circle><path d="M11 9h3.8v1.9h.05c.53-.95 1.83-1.95 3.77-1.95 4.03 0 4.78 2.55 4.78 5.88V21h-4v-5.4c0-1.3-.02-2.96-1.8-2.96-1.82 0-2.1 1.4-2.1 2.87V21h-4V9z"></path></svg></a>
'@

# Find all HTML files
$htmlFiles = Get-ChildItem -Path $repoPath -Filter "*.html" -Recurse
Write-Host "`n📄 Found $($htmlFiles.Count) HTML files" -ForegroundColor Cyan

$updatedCount = 0
$errorCount = 0

foreach ($file in $htmlFiles) {
    try {
        $content = Get-Content -Path $file.FullName -Raw -Encoding UTF8

        # Check if LinkedIn link exists
        if ($content -like "*aria-label=`"LinkedIn`"*") {
            # Remove the LinkedIn link block
            $newContent = $content -replace [regex]::Escape($linkedInPattern), ""

            # Also remove any extra newlines left behind
            $newContent = $newContent -replace '(\r?\n\s*){2,}', "`r`n"

            # Write back
            Set-Content -Path $file.FullName -Value $newContent -Encoding UTF8

            $relativePath = $file.FullName -replace [regex]::Escape($repoPath), "."
            Write-Host "✅ Updated: $relativePath" -ForegroundColor Green
            $updatedCount++
        }
    }
    catch {
        Write-Host "❌ Error processing $($file.FullName): $_" -ForegroundColor Red
        $errorCount++
    }
}

Write-Host "`n" + "="*60 -ForegroundColor Cyan
Write-Host "📊 Summary" -ForegroundColor Cyan
Write-Host "="*60 -ForegroundColor Cyan
Write-Host "✅ Files updated: $updatedCount" -ForegroundColor Green
Write-Host "❌ Errors: $errorCount" -ForegroundColor Red
Write-Host "="*60 -ForegroundColor Cyan

if ($errorCount -eq 0) {
    Write-Host "`n🎉 All LinkedIn links removed successfully!" -ForegroundColor Green
    Write-Host "`n📋 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Run the commit-and-push script to push changes"
    Write-Host "2. Wait 2-5 minutes for GitHub Pages to deploy"
    Write-Host "3. Refresh the website - LinkedIn links should be gone"
} else {
    Write-Host "`n⚠️  Some files had errors" -ForegroundColor Yellow
}
