@echo off
echo Creating portable Windows package...

if not exist "dist\win-unpacked\My German Test.exe" (
    echo Error: Windows executable not found!
    echo Please run the build first: npm run build && npx electron-builder --win --publish=never
    pause
    exit
)

echo.
echo Packaging files...

REM Create portable package directory
if exist "MyGermanTest-Portable" rmdir /s /q "MyGermanTest-Portable"
mkdir "MyGermanTest-Portable"

REM Copy all files from win-unpacked
xcopy "dist\win-unpacked\*" "MyGermanTest-Portable\" /E /I /Y

REM Create a simple readme
echo My German Test - Portable Version > "MyGermanTest-Portable\README.txt"
echo. >> "MyGermanTest-Portable\README.txt"
echo To run the application: >> "MyGermanTest-Portable\README.txt"
echo 1. Double-click "My German Test.exe" >> "MyGermanTest-Portable\README.txt"
echo 2. The application will start automatically >> "MyGermanTest-Portable\README.txt"
echo. >> "MyGermanTest-Portable\README.txt"
echo This is a portable version - no installation required! >> "MyGermanTest-Portable\README.txt"

echo.
echo Portable package created successfully!
echo Location: MyGermanTest-Portable\
echo.
echo To run the app: MyGermanTest-Portable\My German Test.exe
echo.
pause
