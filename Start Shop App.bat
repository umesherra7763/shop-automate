@echo off
rem Double-click this file to start the shop app.
cd /d "%~dp0"
if not exist ".next\BUILD_ID" call npm run build
start "" http://localhost:3000
call npm run start
pause
