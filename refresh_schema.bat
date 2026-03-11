@echo off
echo === Atualizando Cache do Banco de Dados (PostgREST) ===
echo.
echo O Supabase precisa "perceber" que criamos novas colunas.
echo Reiniciando o servico REST para recarregar o schema...
echo.
ssh root@72.62.137.73 "docker service update --force supabase_rest && echo [SUCESSO] Schema recarregado!"
pause
