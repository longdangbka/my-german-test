@echo off
echo Building My German Test for Windows...

REM Clean previous builds
if exist dist rmdir /s /q dist
if exist build rmdir /s /q build

echo.
echo Step 1: Installing dependencies...
call npm install

echo.
echo Step 2: Building React application...
call npm run build

echo.
echo Step 3: Building Windows executable...
call npm run dist-win

echo.
echo Build complete! Check the 'dist' folder for your executable.
echo.
pause
