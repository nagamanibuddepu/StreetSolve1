@echo off
cd /d "%~dp0backend"
echo Seeding database...
echo Working directory: %CD%
echo.
node src/utils/seeder.js
pause
