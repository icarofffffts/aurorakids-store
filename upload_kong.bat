@echo off
echo === Atualizando Configuracao do Kong (Resolucao Definitiva) ===
echo.
echo [1/2] Enviando arquivo corrigido para /root/kong.yml...
scp kong.yml root@72.62.137.73:/root/kong.yml
if %errorlevel% neq 0 (
    echo Falha ao enviar arquivo. Verifique a senha.
    pause
    exit /b
)

echo.
echo [2/2] Movendo arquivo para pasta de volume (/opt/supabase/volumes/api/kong.yml)...
ssh root@72.62.137.73 "mv /root/kong.yml /opt/supabase/volumes/api/kong.yml && echo [SUCESSO] Arquivo substituido. && echo [IMPORTANTE] Agora reinicie o container 'supabase-kong' no Portainer."

pause
