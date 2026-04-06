@echo off
echo =========================================
echo  StreetSolve - Windows Setup Script
echo =========================================
echo.

REM Copy env files if they don't exist
if not exist "backend\.env" (
    copy "backend\.env.example" "backend\.env"
    echo [OK] Created backend\.env - Please edit it with your API keys!
) else (
    echo [SKIP] backend\.env already exists
)

if not exist "frontend\.env" (
    copy "frontend\.env.example" "frontend\.env"
    echo [OK] Created frontend\.env
) else (
    echo [SKIP] frontend\.env already exists
)

echo.
echo Installing root dependencies...
call npm install
if %errorlevel% neq 0 (echo [ERROR] Root npm install failed & pause & exit /b 1)

echo.
echo Installing backend dependencies...
cd backend
call npm install
if %errorlevel% neq 0 (echo [ERROR] Backend npm install failed & pause & exit /b 1)
cd ..

echo.
echo Installing frontend dependencies...
cd frontend
call npm install
if %errorlevel% neq 0 (echo [ERROR] Frontend npm install failed & pause & exit /b 1)
cd ..

echo.
echo =========================================
echo  Setup complete!
echo =========================================
echo.
echo NEXT STEPS:
echo 1. Edit backend\.env with your MongoDB URI and JWT secret
echo 2. Run: cd backend ^& npm run seed    (load demo data)
echo 3. Run: npm run dev                   (start the app)
echo.
echo App will open at: http://localhost:5173
echo.
pause
