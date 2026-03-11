@echo off
setlocal enableextensions

REM Deploy completo do projeto para VPS (build e deploy na VPS).
REM Uso:
REM   deploy_vps_all.bat            -> atualiza apenas o app (recomendado)
REM   deploy_vps_all.bat --supabase -> atualiza app + stack supabase

set "VPS_USER=root"
set "VPS_IP=72.62.137.73"

set "REMOTE_PROJECT_DIR=/opt/delu-kids-store"
set "APP_IMAGE=delu-kids-store:latest"
set "APP_STACK=delukids"
set "APP_SERVICE=delukids_app"

set "SUPABASE_STACK=supabase"
set "DEPLOY_SUPABASE=0"

if /I "%~1"=="--supabase" set "DEPLOY_SUPABASE=1"

set "TAR_NAME=delu_kids_store_full_%RANDOM%%RANDOM%.tar"

echo === DeLu Kids Store - Deploy Completo (VPS) ===
echo VPS: %VPS_USER%@%VPS_IP%
echo Projeto remoto: %REMOTE_PROJECT_DIR%
echo Deploy Supabase: %DEPLOY_SUPABASE%
echo.

REM Checagens basicas (tar/scp/ssh) - sem blocos () para evitar erro de parse no cmd.
where tar >nul 2>nul || goto :missing_tar
where scp >nul 2>nul || goto :missing_scp
where ssh >nul 2>nul || goto :missing_ssh

echo [1/4] Empacotando projeto em %TAR_NAME%...
REM Envia o projeto todo, evitando arquivos grandes/gerados localmente
tar -cvf "%TAR_NAME%" --exclude="%TAR_NAME%" --exclude=".git" --exclude="node_modules" --exclude="dist" --exclude=".agent" --exclude="*.tar" --exclude="*.zip" --exclude="*.log" --exclude=".env" --exclude=".env.*" .
if errorlevel 1 goto :tar_failed

echo.
echo [2/4] Enviando pacote para a VPS (Digite a senha/chave)...
scp "%TAR_NAME%" %VPS_USER%@%VPS_IP%:/root/
if errorlevel 1 goto :scp_failed

echo.
echo [3/4] Extraindo, buildando e atualizando stack do app...
ssh %VPS_USER%@%VPS_IP% "set -e; mkdir -p %REMOTE_PROJECT_DIR%; tar -xvf /root/%TAR_NAME% -C %REMOTE_PROJECT_DIR%; cd %REMOTE_PROJECT_DIR%; if [ -f /root/delukids.env ]; then set -a; . /root/delukids.env; set +a; fi; if [ -z ${VITE_SUPABASE_URL:-} ]; then echo Missing VITE_SUPABASE_URL in /root/delukids.env; exit 1; fi; if [ -z ${VITE_SUPABASE_ANON_KEY:-} ]; then echo Missing VITE_SUPABASE_ANON_KEY in /root/delukids.env; exit 1; fi; if [ -z ${VITE_MP_PUBLIC_KEY:-} ]; then echo Missing VITE_MP_PUBLIC_KEY in /root/delukids.env; exit 1; fi; if [ -z ${PUBLIC_BASE_URL:-} ]; then echo Missing PUBLIC_BASE_URL in /root/delukids.env; exit 1; fi; if [ -z ${CORS_ORIGINS:-} ]; then echo Missing CORS_ORIGINS in /root/delukids.env; exit 1; fi; if [ -z ${ADMIN_EMAILS:-} ]; then echo Missing ADMIN_EMAILS in /root/delukids.env; exit 1; fi; if docker secret inspect --format '{{.ID}}' supabase_service_role_key; then :; else echo Missing docker secret supabase_service_role_key; exit 1; fi; if docker secret inspect --format '{{.ID}}' mercado_pago_access_token; then :; else echo Missing docker secret mercado_pago_access_token; exit 1; fi; if docker secret inspect --format '{{.ID}}' mp_webhook_secret; then :; else echo Missing docker secret mp_webhook_secret; exit 1; fi; docker build --no-cache --build-arg VITE_SUPABASE_URL=$VITE_SUPABASE_URL --build-arg VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY -t %APP_IMAGE% .; docker stack deploy -c docker-compose.stack.yml %APP_STACK%; docker service update --force %APP_SERVICE%; rm -f /root/%TAR_NAME%"
if errorlevel 1 goto :ssh_app_failed

if "%DEPLOY_SUPABASE%"=="1" goto :do_supabase
echo.
echo [4/4] Supabase: pulado. Para incluir, rode: deploy_vps_all.bat --supabase
goto :cleanup

:do_supabase
echo.
echo [4/4] Atualizando stack do Supabase (ATENCAO: pode reiniciar servicos)...
ssh %VPS_USER%@%VPS_IP% "set -e; cd %REMOTE_PROJECT_DIR% && docker stack deploy -c docker-compose.supabase.yml %SUPABASE_STACK%"
if errorlevel 1 goto :ssh_supabase_failed
goto :cleanup

:cleanup
REM Limpeza local
del "%TAR_NAME%" >nul 2>nul

echo.
echo === Deploy concluido! ===
pause

exit /b 0

:missing_tar
echo [ERRO] Comando 'tar' nao encontrado no PATH.
echo Instale Git Bash ou habilite tar no Windows.
goto :fail

:missing_scp
echo [ERRO] Comando 'scp' nao encontrado no PATH.
echo Instale OpenSSH Client (Windows) ou Git Bash.
goto :fail

:missing_ssh
echo [ERRO] Comando 'ssh' nao encontrado no PATH.
echo Instale OpenSSH Client (Windows) ou Git Bash.
goto :fail

:tar_failed
echo [ERRO] Falha ao criar tar.
goto :fail

:scp_failed
del "%TAR_NAME%" >nul 2>nul
echo [ERRO] Falha ao enviar pacote via scp.
goto :fail

:ssh_app_failed
del "%TAR_NAME%" >nul 2>nul
echo [ERRO] Falha no deploy remoto do app via ssh.
goto :fail

:ssh_supabase_failed
del "%TAR_NAME%" >nul 2>nul
echo [ERRO] Falha no deploy remoto do Supabase via ssh.
goto :fail

:fail
echo.
echo === Deploy interrompido ===
pause
exit /b 1
