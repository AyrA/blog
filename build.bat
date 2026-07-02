@ECHO OFF
SETLOCAL
PUSHD "%~dp0"

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
