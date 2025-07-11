@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM Define diretório de backup
set "ORIGEM=F:\Users\Caio89-W11\Documents\Caio89\SITES\SITES_CRIADOS\K-POP\MAKER_ALL\BACKUPS\BLACK_PINK"

REM Define diretório atual como destino
set "DESTINO=%CD%"

echo Restaurando arquivos de backup...

REM Copiar apenas arquivos alterados e excluir arquivos indesejados
robocopy "%ORIGEM%" "%DESTINO%" /E /XO /IS /IT /MT:8 /XD ".git" /XF ".gitattributes" "LICENSE" "README.md" /LOG:restore_log.txt

REM Exibir nomes dos arquivos restaurados
echo Arquivos restaurados:
findstr /C:"  *New File" restore_log.txt

echo Restauração concluída para: %DESTINO%
pause
endlocal