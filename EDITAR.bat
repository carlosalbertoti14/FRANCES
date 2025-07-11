@echo off
setlocal enabledelayedexpansion

echo Lendo arquivos...

REM Variáveis para armazenar os caminhos dos programas
set "PROGRAMA1="
set "ARQUIVOS1="
set "PROGRAMA2="
set "ARQUIVOS2="
set "PROGRAMA3="
set "ARQUIVOS3="
set "PROGRAMA4="
set "ARQUIVOS4="
set "PROGRAMA5="
set "ARQUIVOS5="
set "MODE=NONE"

REM Loop para ler o arquivo de configuração
for /f "tokens=* delims=" %%A in (caminhos_edit.txt) do (
    if "%%A"=="PROGRAMA1path:" (
        set MODE=PROGRAMA1
    ) else if "%%A"=="arquivos1path:" (
        set MODE=ARQUIVOS1
    ) else if "%%A"=="PROGRAMA2path:" (
        set MODE=PROGRAMA2
    ) else if "%%A"=="arquivos2path:" (
        set MODE=ARQUIVOS2
    ) else if "%%A"=="PROGRAMA3path:" (
        set MODE=PROGRAMA3
    ) else if "%%A"=="arquivos3path:" (
        set MODE=ARQUIVOS3
    ) else if "%%A"=="PROGRAMA4path:" (
        set MODE=PROGRAMA4
    ) else if "%%A"=="arquivos4path:" (
        set MODE=ARQUIVOS4
    ) else if "%%A"=="PROGRAMA5path:" (
        set MODE=PROGRAMA5
    ) else if "%%A"=="arquivos5path:" (
        set MODE=ARQUIVOS5
    ) else (
        if "!MODE!"=="PROGRAMA1" set "PROGRAMA1=%%A"
        if "!MODE!"=="ARQUIVOS1" set "ARQUIVOS1=!ARQUIVOS1! "%%A""
        if "!MODE!"=="PROGRAMA2" set "PROGRAMA2=%%A"
        if "!MODE!"=="ARQUIVOS2" set "ARQUIVOS2=!ARQUIVOS2! "%%A""
        if "!MODE!"=="PROGRAMA3" set "PROGRAMA3=%%A"
        if "!MODE!"=="ARQUIVOS3" set "ARQUIVOS3=!ARQUIVOS3! "%%A""
        if "!MODE!"=="PROGRAMA4" set "PROGRAMA4=%%A"
        if "!MODE!"=="ARQUIVOS4" set "ARQUIVOS4=!ARQUIVOS4! "%%A""
        if "!MODE!"=="PROGRAMA5" set "PROGRAMA5=%%A"
        if "!MODE!"=="ARQUIVOS5" set "ARQUIVOS5=!ARQUIVOS5! "%%A""
    )
)

REM Exibir valores para depuração
echo PROGRAMA 1: !PROGRAMA1!
echo ARQUIVOS 1: !ARQUIVOS1!
echo PROGRAMA 2: !PROGRAMA2!
echo ARQUIVOS 2: !ARQUIVOS2!
echo PROGRAMA 3: !PROGRAMA3!
echo ARQUIVOS 3: !ARQUIVOS3!
echo PROGRAMA 4: !PROGRAMA4!
echo ARQUIVOS 4: !ARQUIVOS4!
echo PROGRAMA 5: !PROGRAMA5!
echo ARQUIVOS 5: !ARQUIVOS5!


REM Executar os programas com os arquivos
if defined PROGRAMA1 (
    start "" !PROGRAMA1! !ARQUIVOS1!
) else (
    for %%F in (!ARQUIVOS1!) do start "" "%%F"
)

if defined PROGRAMA2 (
    start "" !PROGRAMA2! !ARQUIVOS2!
) else (
    for %%F in (!ARQUIVOS2!) do start "" "%%F"
)

if defined PROGRAMA3 (
    start "" !PROGRAMA3! !ARQUIVOS3!
) else (
    for %%F in (!ARQUIVOS3!) do start "" "%%F"
)

if defined PROGRAMA4 (
    start "" !PROGRAMA4! !ARQUIVOS4!
) else (
    for %%F in (!ARQUIVOS4!) do start "" "%%F"
)

if defined PROGRAMA5 (
    start "" !PROGRAMA5! !ARQUIVOS5!
) else (
    for %%F in (!ARQUIVOS5!) do start "" "%%F"
)

echo Script concluído!
pause
endlocal