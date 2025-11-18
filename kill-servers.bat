@echo off
echo Killing processes on port 3000 and 8000...

REM Find and kill processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :3000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 3000
    taskkill /PID %%a /F 2>nul
)

REM Find and kill processes on port 8000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :8000 ^| findstr LISTENING') do (
    echo Killing process %%a on port 8000
    taskkill /PID %%a /F 2>nul
)

echo Done! All development servers stopped.
