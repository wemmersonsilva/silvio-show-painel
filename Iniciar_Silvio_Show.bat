@echo off
title Painel Silvio Show - Operador e Telao
cd /d "%~dp0"
echo Iniciando servidor local de alta performance para o Painel Silvio Show...
where python >nul 2>nul
if %errorlevel%==0 (
    start "" "http://localhost:8090/index.html"
    python -m http.server 8090
) else (
    start "" "%~dp0index.html"
)
