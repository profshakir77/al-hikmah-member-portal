@echo off
title Al-Hikmah Member Portal - First Time Setup
color 0A
echo.
echo  ============================================
echo   Al-Hikmah Member Portal - Setup
echo  ============================================
echo.

:: Check Node.js
where node >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  ERROR: Node.js is not installed.
    echo  Please download and install from: https://nodejs.org
    echo  Then run this script again.
    pause
    exit /b 1
)
echo  [OK] Node.js found
node --version

:: Check pnpm
where pnpm >nul 2>&1
if %errorlevel% neq 0 (
    echo  Installing pnpm...
    npm install -g pnpm
)
echo  [OK] pnpm found

:: Check PostgreSQL
where psql >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo  ERROR: PostgreSQL is not installed or not in PATH.
    echo  Please download from: https://www.postgresql.org/download/windows/
    echo  Then run this script again.
    pause
    exit /b 1
)
echo  [OK] PostgreSQL found

echo.
echo  Setting up database...
echo.

:: Set environment variable for this session
set PGPASSWORD=postgres

:: Create database
psql -U postgres -c "CREATE DATABASE al_hikmah_portal;" 2>nul
echo  [OK] Database ready

:: Create .env file
echo DATABASE_URL=postgresql://postgres:postgres@localhost:5432/al_hikmah_portal > .env
echo SESSION_SECRET=al-hikmah-secret-key-2024 >> .env
echo NODE_ENV=production >> .env
echo PORT=8080 >> .env
echo  [OK] Environment file created

echo.
echo  Installing dependencies (this may take 2-3 minutes)...
call pnpm install
echo  [OK] Dependencies installed

echo.
echo  Setting up database tables...
call pnpm --filter @workspace/db run push
echo  [OK] Database tables created

echo.
echo  Building the application...
call pnpm --filter @workspace/api-server run build
call pnpm --filter @workspace/member-portal run build
echo  [OK] Build complete

echo.
color 0A
echo  ============================================
echo   Setup Complete!
echo  ============================================
echo.
echo  Now double-click START.BAT to run the app.
echo  Then open your browser at: http://localhost
echo.
pause
