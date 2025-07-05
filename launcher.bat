@echo off
title My German Test Launcher

:menu
cls
echo =====================================================
echo           My German Test - Launcher
echo =====================================================
echo.
echo 1. Run My German Test
echo 2. Build new executable
echo 3. Create portable package
echo 4. Open project folder
echo 5. Exit
echo.
set /p choice="Please choose an option (1-5): "

if "%choice%"=="1" goto run
if "%choice%"=="2" goto build
if "%choice%"=="3" goto package
if "%choice%"=="4" goto folder
if "%choice%"=="5" goto exit

echo Invalid choice. Please try again.
pause
goto menu

:run
echo.
echo Starting My German Test...
if exist "MyGermanTest-Portable\My German Test.exe" (
    start "" "MyGermanTest-Portable\My German Test.exe"
    echo Application started!
) else (
    echo Error: Executable not found!
    echo Please build the application first (option 2).
)
pause
goto menu

:build
echo.
echo Building Windows executable...
echo This may take a few minutes...
call npm run build
call npx electron-builder --win --publish=never
if errorlevel 1 (
    echo Build failed!
) else (
    echo Build completed successfully!
)
pause
goto menu

:package
echo.
echo Creating portable package...
call create-portable.bat
echo Portable package created!
pause
goto menu

:folder
echo.
echo Opening project folder...
start explorer .
goto menu

:exit
echo.
echo Thank you for using My German Test!
echo.
exit
