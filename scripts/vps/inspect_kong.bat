@echo off
echo Recuperando arquivo de configuracao do Kong...
ssh root@72.62.137.73 "cat /opt/supabase/volumes/api/kong.yml"
pause
