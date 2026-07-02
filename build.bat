@ECHO OFF
SETLOCAL
PUSHD "%~dp0"

REM Build typescript
CALL tsc -p gen

REM Reset out dir
RD /S /Q dist
MD dist
ROBOCOPY /MIR files dist\files
ROBOCOPY /MIR static dist\static

REM Generate static files
node gen\js\build.js docs dist

POPD
ENDLOCAL
