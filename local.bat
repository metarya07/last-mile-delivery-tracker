@echo off
title Last Mile Delivery - Local Development

echo ==========================================
echo     LAST MILE DELIVERY - LOCAL START
echo ==========================================
echo.

echo Starting Backend...
start "Last Mile Backend" cmd /k "cd /d %~dp0backend && mvn spring-boot:run"

echo Starting Frontend...
start "Last Mile Frontend" cmd /k "cd /d %~dp0frontend && npm run dev"

echo.
echo Backend:  http://localhost:8080
echo Frontend: http://localhost:5173
echo.
