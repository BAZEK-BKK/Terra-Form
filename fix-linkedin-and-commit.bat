@echo off
REM Remove LinkedIn and commit changes
REM This batch file removes LinkedIn links from all HTML files and commits the changes

cd /d "C:\Users\Thibault  MERLIN\Documents\GitHub\Terra-Form"

echo.
echo ================================
echo Removing LinkedIn from all HTML files...
echo ================================
echo.

REM Run PowerShell script to remove LinkedIn
powershell -NoProfile -ExecutionPolicy Bypass -File "remove-linkedin.ps1"

echo.
echo ================================
echo Committing and pushing changes...
echo ================================
echo.

REM Run PowerShell script to commit and push
powershell -NoProfile -ExecutionPolicy Bypass -File "commit-and-push.ps1"

echo.
echo ================================
echo Done!
echo ================================
pause
