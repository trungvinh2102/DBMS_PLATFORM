@echo off
echo Starting DBMS Platform Desktop...
echo Make sure your backend is running (bun run backend:dev)
echo.
bun run desktop:standalone
pause
