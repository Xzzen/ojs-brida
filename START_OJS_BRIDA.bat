@echo off
title Launcher Portal OJS Multi-Journal BRIDA Kota Makassar
echo ============================================================
echo   MEMULAI SISTEM INOVASI OJS (MULTI-JOURNAL) BRIDA MAKASSAR
echo ============================================================
echo.
echo [1/3] Menyalakan Database MySQL (XAMPP)...
start "" /B "C:\xampp\mysql\bin\mysqld.exe" --defaults-file="C:\xampp\mysql\bin\my.ini"
timeout /t 3 /nobreak >nul

echo [2/3] Menyalakan Server Backend Laravel API (http://0.0.0.0:8000)...
start "Backend Laravel OJS BRIDA" cmd /k "cd /d C:\ojs brida\backend-ojs && C:\xampp\php\php.exe artisan serve --host=0.0.0.0 --port=8000"

echo [3/3] Menyalakan Server Frontend React Vite (http://0.0.0.0:5173)...
start "Frontend React OJS BRIDA" cmd /k "cd /d C:\ojs brida\frontend-ojs && npm run dev -- --host 0.0.0.0"

echo.
echo ============================================================
echo   SISTEM TELAH BERJALAN & SIAP DIAKSES SATU JARINGAN WIFI!
echo ============================================================
echo - Akses di Laptop ini   : http://localhost:5173
echo - Akses di Laptop Lain  : http://192.168.1.31:5173 (atau IP Wi-Fi Anda)
echo ============================================================
pause
