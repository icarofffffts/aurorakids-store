@echo off
set VPS_USER=root
set VPS_IP=72.62.137.73

echo === Buscando Logs da Aplicacao na VPS ===
echo.
ssh %VPS_USER%@%VPS_IP% "docker service logs delukids_app --tail 100"
echo.
echo === Fim dos Logs ===
pause
