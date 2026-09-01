@echo off
:menu
cls
echo ============================
echo   Desk Presence System
echo ============================
echo 1. Start Session
echo 2. End Session
echo 3. Check Status
echo 4. Exit
echo ============================
set /p choice="Choose an option: "

if "%choice%"=="1" goto start
if "%choice%"=="2" goto stop
if "%choice%"=="3" goto status
if "%choice%"=="4" goto exit
goto menu

:start
echo Starting Node-RED...
start "Node-RED" cmd /k "node-red"
timeout /t 3 /nobreak >nul
echo Starting FastAPI...
start "FastAPI" cmd /k "cd /d C:\Users\Alex\Documents\GitHub\shelly-presence-desk-tracking-system\api && uvicorn main:app --reload"
echo All services started.
pause
goto menu

:stop
echo Stopping Node-RED and FastAPI...
taskkill /FI "WINDOWTITLE eq Node-RED*" /T /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq FastAPI*" /T /F >nul 2>&1
echo Services stopped.
pause
goto menu

:status
echo.
echo Checking services...
echo.

docker ps --filter "name=mosquitto" --format "{{.Names}}: {{.Status}}" | findstr mosquitto >nul
if %errorlevel%==0 (
    echo [OK] Mosquitto Docker container is running
) else (
    echo [MISSING] Mosquitto Docker container is NOT running
)

netstat -an | findstr ":1880" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo [OK] Node-RED is running on port 1880
) else (
    echo [MISSING] Node-RED is NOT running
)

netstat -an | findstr ":8000" | findstr "LISTENING" >nul
if %errorlevel%==0 (
    echo [OK] FastAPI is running on port 8000
) else (
    echo [MISSING] FastAPI is NOT running
)

echo.
pause
goto menu

:exit
exit