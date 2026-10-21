@echo off
setlocal
cd /d "%~dp0"
where node >nul 2>nul
if errorlevel 1 (
  echo Node.js nao encontrado. Instale uma versao suportada pelo Vite.
  pause
  exit /b 1
)
if not exist "node_modules\.bin\vite.cmd" (
  call npm ci
  if errorlevel 1 goto :falha
)
if not exist "public\migration\catalog.json" (
  if defined DDTANK_EXPORTS (
    python scripts\audit_assets.py "%DDTANK_EXPORTS%"
  ) else (
    python scripts\audit_assets.py "D:\nova flash em html\arquivos"
  )
  if errorlevel 1 goto :falha
)
call npm run dev -- --open /migration.html
exit /b %errorlevel%
:falha
echo Falha ao preparar o cliente. Confira a mensagem acima.
pause
exit /b 1
