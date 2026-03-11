@echo off
set VPS_USER=root
set VPS_IP=72.62.137.73

echo === DIAGNOSTICO VPS ===
echo 1. Status do Servico:
ssh %VPS_USER%@%VPS_IP% "docker service ps delukids_app --no-trunc | head -n 5"
echo.
echo 2. Logs recentes (Erros):
ssh %VPS_USER%@%VPS_IP% "docker service logs delukids_app --tail 20"
pause
