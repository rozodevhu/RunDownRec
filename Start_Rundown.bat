@echo off
setlocal enabledelayedexpansion
title RunDownRec Launcher Control Center
cls

echo ==================================================================
echo  ▒█▀▀█ ▒█░░▒█ ▒█▄░▒█ ▒█▀▀▄ ▒█▀▀▀█ ▒█░░▒█ ▒█▄░▒█ ▒█▀▀█ ▒█▀▀▀ ▒█▀▀█
echo  ▒█▄▄▀ ▒█░░▒█ ▒█▒█▒█ ▒█░▒█ ▒█░░▒█ ▒█░░▒█ ▒█▒█▒█ ▒█▄▄▀ ▒█▀▀▀ ▒█░░░
echo  ▒█░▒█ ░▀▄▄▄▀ ▒█░░▀█ ▒█▄▄▀ ▒█▄▄▄█ ░▀▄▄▄▀ ▒█░░▀█ ▒█░▒█ ▒█▄▄▄ ▒█▄▄█
echo ==================================================================
echo.

:: Environment Checkers
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed! Check: https://nodejs.org
    pause & exit
)

where python >nul 2>nul
if %errorlevel% neq 0 (set HAS_PYTHON=0) else (set HAS_PYTHON=1)

if not exist node_modules (
    echo [+] Downloading server dependencies...
    call npm install
)

:menu
cls
echo ==================================================================
echo                 RUNDOWNREC WINDOWS LAUNCHER MENU
echo ==================================================================
echo.
echo  [1] Start Automated Wizard (node setup.js)
echo  [2] Run Server Core Instantly (node server.js)
echo  [3] Run Client Binary Patcher Utility
echo  [4] Backup Server Database & Rooms
echo  [5] Restore Server Database from Backup
echo  [6] Find Local Network IP (For LAN Multiplayer)
echo  [7] Launch Patched Rec Room Client Build
echo  [8] Exit
echo.
echo ==================================================================
set /p choice="Enter selection [1-8]: "

if "%choice%"=="1" (cls & call npm start & pause & goto menu)
if "%choice%"=="2" (cls & echo Starting RunDownRec Server... & node server.js & pause & goto menu)

if "%choice%"=="3" (
    cls
    if %HAS_PYTHON%==0 (echo [ERROR] Python is required! & pause & goto menu)
    python tools/patch_engine.py
    pause & goto menu
)

if "%choice%"=="4" (
    cls
    echo [+] Creating a snapshot of rundown_database.db...
    if not exist backups mkdir backups
    copy /y rundown_database.db backups\rundown_database_bak.db >nul
    copy /y config.json backups\config_bak.json >nul
    echo [SUCCESS] Backup created inside the \backups\ directory.
    pause & goto menu
)

if "%choice%"=="5" (
    cls
    if not exist backups\rundown_database_bak.db (
        echo [ERROR] No backup snapshot found to restore!
        pause & goto menu
    )
    echo [WARNING] This will overwrite your current profile and rooms.
    set /p confirm="Are you sure? (y/N): "
    if /i "!confirm!"=="y" (
        copy /y backups\rundown_database_bak.db rundown_database.db >nul
        copy /y backups\config_bak.json config.json >nul
        echo [SUCCESS] Previous profile data restored successfully!
    }
    pause & goto menu
)

if "%choice%"=="6" (
    cls
    echo ==================================================================
    echo                     LAN MULTIPLAYER DISCOVERY
    echo ==================================================================
    echo.
    echo Share this IPv4 address with friends on your local Wi-Fi router network
    echo so they can change their patcher configurations to target your host:
    echo.
    for /f "tokens=2 delims=:" %%a in ('ipconfig ^| findstr /i "IPv4"') do (
        echo   --^> Your Host Network IP: %%a
    )
    echo.
    pause & goto menu
)

if "%choice%"=="7" (
    cls
    set /p gamepath="Drag-and-drop or type your RecRoom.exe location (Leave blank for local directory): "
    if "!gamepath!"=="" (set TARGET_EXE=RecRoom.exe) else (set TARGET_EXE=!gamepath!)
    
    if exist "!TARGET_EXE!" (
        echo [+] Booting patched 2019 game engine sandbox...
        start "" "!TARGET_EXE!"
    ) else (
        echo [ERROR] Game file not found at: !TARGET_EXE!
        echo Make sure you placed this script near your client build or entered the path right.
    )
    pause & goto menu
)

if "%choice%"=="8" (echo Exiting workspace. Have fun preserving! & exit)
goto menu
