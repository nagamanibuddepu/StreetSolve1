@echo off
cd /d "%~dp0frontend"
echo Starting StreetSolve Frontend...
npx vite --port 5173
pause
