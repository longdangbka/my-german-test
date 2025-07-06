@echo off
echo =====================================
echo   German Test - Electron App Launcher
echo =====================================
echo.
echo Building React app...
npm run build
if %ERRORLEVEL% neq 0 (
    echo.
    echo ❌ Build failed!
    pause
    exit /b 1
)

echo.
echo ✅ Build successful!
echo.
echo 🚀 Starting Electron app...
echo.
echo 💡 TROUBLESHOOTING TIPS:
echo    - If buttons don't work, check console logs (F12)
echo    - LaTeX should render inline: $x^2$ and block: $$x^2$$
echo    - Short Answer questions should appear with text input
echo    - Try refreshing with Ctrl+R if content doesn't load
echo.
npm run electron
