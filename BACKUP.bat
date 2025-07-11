@echo off
chcp 65001 > nul
setlocal enabledelayedexpansion

REM Diretórios de origem e destino
set "ORIGEM=%CD%"
set "DESTINO=F:\Users\Caio89-W11\Documents\Caio89\SITES\SITES_CRIADOS\K-POP\MAKER_ALL\BACKUPS"

REM Nome da pasta baseado no nome da origem
for %%A in ("%ORIGEM%") do set "PASTA_ATUAL=%%~nxA"

REM Cria a pasta de destino se não existir
mkdir "%DESTINO%\%PASTA_ATUAL%" >nul 2>nul

echo.
echo -------------------------------------
echo Iniciando Backup Espelhado (Mirroring)...
echo -------------------------------------
echo.

REM Realiza o backup espelhado (mirroring)
REM /MIR: Espelha uma árvore de diretórios (copia novos, atualiza existentes, deleta inexistentes no destino)
REM /E: Copia subdiretórios, incluindo vazios.
REM /NFL: Não lista nomes de arquivos.
REM /NDL: Não lista nomes de diretórios.
REM /NP: Não mostra o progresso (percentual copiado).
REM /NS: Não lista os tamanhos de arquivo.
REM /NC: Não lista as classes de arquivo.
REM /NJH: Não mostra o cabeçalho do trabalho.
REM /NJS: Não mostra o resumo do trabalho.
REM /LOG+: Adiciona o output a um arquivo de log, para que você possa revisar se necessário.
robocopy "%ORIGEM%" "%DESTINO%\%PASTA_ATUAL%" /MIR /E /NFL /NDL /NP /NS /NC /NJH /NJS /LOG+:"%TEMP%\robocopy_summary.log"

REM Exibe apenas as linhas que indicam cópia ou exclusão
echo.
echo -------------------------------------
echo Resumo das Ações:
echo -------------------------------------
findstr /I /C:"Copied" /C:"New File" /C:"Extra File" /C:"Newer" /C:"Older" "%TEMP%\robocopy_summary.log"

echo.
echo -------------------------------------
echo Backup concluído em: "%DESTINO%\%PASTA_ATUAL%"
echo (Detalhes completos no log: %TEMP%\robocopy_summary.log)
echo -------------------------------------
echo.
pause
endlocal