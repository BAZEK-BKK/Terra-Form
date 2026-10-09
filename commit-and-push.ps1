# Git Commit and Push Script
# This script commits and pushes the Web Vitals tracking changes to GitHub

Write-Host "🚀 Committing and pushing Web Vitals tracking changes..." -ForegroundColor Green

# Navigate to the repository
$repoPath = "C:\Users\Thibault  MERLIN\Documents\GitHub\Terra-Form"

if (-not (Test-Path $repoPath)) {
    Write-Host "❌ Error: Repository not found at $repoPath" -ForegroundColor Red
    exit 1
}

cd $repoPath

# Check git status
Write-Host "`n📊 Current Git Status:" -ForegroundColor Cyan
git status

# Stage all changes
Write-Host "`n📝 Staging all changes..." -ForegroundColor Yellow
git add .

# Create commit
Write-Host "`n✅ Creating commit..." -ForegroundColor Green
git commit -m "feat: add GA4 and Web Vitals tracking to all HTML files

- Added GA4 initialization script to all 42 HTML files
- Added Web Vitals tracking script (LCP, INP, CLS metrics)
- Metrics sent to GA4 property G-MYYW7108EZ
- Console logs Web Vitals measurements for debugging"

# Check if commit was successful
if ($LASTEXITCODE -eq 0) {
    Write-Host "`n🎯 Commit created successfully!" -ForegroundColor Green

    # Push to master
    Write-Host "`n📤 Pushing to master branch..." -ForegroundColor Yellow
    git push origin master

    if ($LASTEXITCODE -eq 0) {
        Write-Host "`n✨ Push successful! Web Vitals tracking is now deployed." -ForegroundColor Green
        Write-Host "`n📋 Next Steps:" -ForegroundColor Cyan
        Write-Host "1. Wait for GitHub Pages to deploy (2-5 minutes)"
        Write-Host "2. Visit https://www.terra-and-form.com/th/services/"
        Write-Host "3. Open DevTools (F12) → Console tab"
        Write-Host "4. You should see messages like: [Web Vitals] LCP: XXXms"
        Write-Host "5. Data will appear in GA4 after 24-48 hours"
    } else {
        Write-Host "`n❌ Push failed. Check your Git configuration." -ForegroundColor Red
        exit 1
    }
} else {
    Write-Host "`n⚠️  No changes to commit (everything already up to date)" -ForegroundColor Yellow
}

Write-Host "`n🎉 Done!" -ForegroundColor Green
