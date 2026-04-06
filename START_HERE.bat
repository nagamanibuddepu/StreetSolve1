@echo off
echo.
echo =============================================
echo  StreetSolve - Fresh Start (All keys pre-filled)
echo =============================================
echo.
echo Step 1: Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 ( echo FAILED. Check internet connection. & pause & exit /b 1 )
echo Done!
echo.
echo Step 2: Seeding demo data...
call npm run seed
echo Done!
echo.
echo Step 3: Installing frontend dependencies...
cd ..\frontend
call npm install
if %errorlevel% neq 0 ( echo FAILED. & pause & exit /b 1 )
echo Done!
echo.
cd ..
echo =============================================
echo  SETUP COMPLETE!
echo =============================================
echo.
echo Now open TWO terminals and run:
echo.
echo   Terminal 1 (Backend):
echo     cd backend
echo     npm run dev
echo.
echo   Terminal 2 (Frontend):
echo     cd frontend
echo     npm run dev
echo.
echo Then open: http://localhost:5173
echo.
echo Demo logins:
echo   Citizen:  priya@example.com / Test@1234
echo   NGO:      ngo@greenearth.org / Test@1234
echo.
pause
