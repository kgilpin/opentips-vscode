@echo off
setlocal

REM -------------------------------------------------
REM 1) DEFINE VARIABLES
REM -------------------------------------------------
set "PYTHON_VERSION=3.11.2"
set "PYTHON_EMBED=python-%PYTHON_VERSION%-embed-amd64"
set "PYTHON_EMBED_ZIP=%PYTHON_EMBED%.zip"
set "PYTHON_EMBED_URL=https://www.python.org/ftp/python/%PYTHON_VERSION%/%PYTHON_EMBED_ZIP%"

echo.
echo ======================================================
echo   Downloading Embedded Python %PYTHON_VERSION%
echo ======================================================
echo.

REM -------------------------------------------------
REM 2) DOWNLOAD THE EMBEDDED PYTHON ZIP
REM -------------------------------------------------
powershell -Command "Invoke-WebRequest -Uri '%PYTHON_EMBED_URL%' -OutFile '%PYTHON_EMBED_ZIP%'"
if errorlevel 1 (
    echo [ERROR] Failed to download Python embedded ZIP.
    exit /b 1
)

REM -------------------------------------------------
REM 3) EXTRACT THE ZIP
REM -------------------------------------------------
echo.
echo ======================================================
echo   Extracting Embedded Python
echo ======================================================
powershell -Command "Expand-Archive -Path '%PYTHON_EMBED_ZIP%' -DestinationPath '%PYTHON_EMBED%'"
if errorlevel 1 (
    echo [ERROR] Failed to extract Python embedded ZIP.
    exit /b 1
)

REM -------------------------------------------------
REM 4) ALLOW IMPORT OF SITE PACKAGES (ENABLE pip)
REM    The embedded distribution by default won't load "site".
REM    We'll remove the '#' from the "import site" line in pythonXY._pth
REM -------------------------------------------------
echo.
echo ======================================================
echo   Enabling site-packages in the embedded Python
echo ======================================================
cd "%PYTHON_EMBED%"
for %%F in (python*._pth) do set "PTH_FILE=%%F"

if not exist "%PTH_FILE%" (
    echo [ERROR] Could not find python*._pth file to modify.
    exit /b 1
)

(
    for /f "usebackq tokens=*" %%i in ("%PTH_FILE%") do (
        echo %%i | findstr /r /c:"^#import site" > nul
        if errorlevel 1 (
            echo %%i
        ) else (
            REM Remove '#' to enable 'import site'
            echo import site
        )
    )
) > "%PTH_FILE%.tmp"

move /y "%PTH_FILE%.tmp" "%PTH_FILE%" > nul

REM -------------------------------------------------
REM 5) INSTALL pip AND UPGRADE IT
REM -------------------------------------------------
echo.
echo ======================================================
echo   Installing and upgrading pip
echo ======================================================
.\python.exe -m ensurepip --upgrade
.\python.exe -m pip install --upgrade pip

REM -------------------------------------------------
REM 6) CREATE AND ACTIVATE A VIRTUAL ENVIRONMENT
REM -------------------------------------------------
echo.
echo ======================================================
echo   Creating a virtual environment
echo ======================================================
.\python.exe -m venv venv

call venv\Scripts\activate.bat

REM -------------------------------------------------
REM 7) INSTALL THE opentips PACKAGE
REM -------------------------------------------------
echo.
echo ======================================================
echo   Installing opentips
echo ======================================================
pip install --ignore-requires-python opentips

echo.
echo ======================================================
echo   Setup complete!
echo   To use the virtual environment:
echo       call "%CD%\venv\Scripts\activate.bat"
echo ======================================================
echo.
endlocal

REM Once complete:
REM call "%CD%\venv\Scripts\activate.bat"
