@echo off
title Al-Hikmah Member Portal
color 0A
echo.
echo  ============================================
echo   Al-Hikmah Member Portal - Starting...
echo  ============================================
echo.

:: Load environment variables
if exist .env (
    for /f "tokens=1,2 delims==" %%a in (.env) do set %%a=%%b
)

:: Start API server in background
echo  Starting API server...
start "API Server" /min cmd /c "set PORT=8080 && node artifacts\api-server\dist\index.mjs"

:: Wait a moment for API to start
timeout /t 3 /nobreak >nul

:: Serve the frontend with a simple static server
echo  Starting web server...
start "Web Server" /min cmd /c "npx serve artifacts\member-portal\dist -p 80 -s"

timeout /t 2 /nobreak >nul

echo.
echo  ============================================
echo   App is running!
echo  ============================================
echo.
echo  Open your browser and go to:
echo.
echo      http://localhost
echo.
echo  To access from other devices on WiFi:
for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /r "IPv4.*192"') do echo      http://%%a
echo.
echo  Press any key to open browser automatically...
pause >nul

start http://localhost
