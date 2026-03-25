@echo off
setlocal

start "Pennywise Backend" cmd /k "cd /d %~dp0backend && node server.js"
start "Pennywise Frontend" cmd /k "cd /d %~dp0frontend && npm start"

echo Pennywise frontend and backend are starting in separate windows.
