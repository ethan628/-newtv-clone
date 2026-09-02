@echo off
chcp 65001 >nul
echo ========================================================
echo   正在啟動 NEWTV 環境知識題庫 本地伺服器...
echo   網址: http://localhost:8000/web/index.html
echo ========================================================
start http://localhost:8000/web/index.html
python -m http.server 8000
pause
