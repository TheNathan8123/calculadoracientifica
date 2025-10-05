@echo off
echo.
git status

echo.
echo Adicionando arquivos modificados...
git add .

echo.
set /p mensagem=Digite a mensagem do commit:
git commit -m "%mensagem%"

echo.
echo Enviando para o GitHub...
git push origin main

echo.
echo Calculadora atualizado com sucesso! :)
pause
