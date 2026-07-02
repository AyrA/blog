@ECHO OFF
SETLOCAL
PUSHD "%~dp0"

REM Ensure base directories exist
IF NOT EXIST docs MD docs
IF NOT EXIST files MD files
IF NOT EXIST static MD static

REM Build typescript
PUSHD gen
IF NOT EXIST node_modules CALL npm ci
CALL tsc
POPD

REM Reset out dir
RD /S /Q dist
MD dist\docs
ROBOCOPY /MIR files dist\files
ROBOCOPY /MIR static dist\static

REM Generate static files
node gen\js\build.js docs dist

POPD
ENDLOCAL
