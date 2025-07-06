@echo off
echo ==============================================
echo  Testing My German Test App - Web vs Electron
echo ==============================================
echo.
echo This script will help you compare the web and Electron versions
echo to ensure they show the same behavior.
echo.
echo INSTRUCTIONS:
echo 1. Both versions should load with the same UI
echo 2. Test the "See Answer" functionality in both versions
echo 3. Check that CLOZE and True/False questions show:
echo    - User input (if any) with green/red background
echo    - Check/cross symbol  
echo    - Expected answer in gray background
echo 4. Verify that no auto-filling occurs when clicking "See Answer"
echo.
echo Starting Web Version...
start http://localhost:3002
echo.
echo Starting Electron Development Version...
npm run electron-dev
echo.
echo Both versions should now be running.
echo Compare their behavior and press any key to continue...
pause
