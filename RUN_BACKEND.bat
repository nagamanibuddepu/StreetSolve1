@echo off
cd /d "%~dp0backend"
echo Starting StreetSolve Backend...
echo Working directory: %CD%
node src/server.js
pause
