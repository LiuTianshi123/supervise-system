@echo off
echo ========================================
echo   中公网校督学系统 启动脚本
echo ========================================

set JAVA_HOME=C:\Users\49782\jdk17\jdk-17.0.15+6
set JAR_FILE=target\supervise-system-1.0.0.jar

REM 创建data目录（如果不存在）
if not exist "data" mkdir data

echo 正在启动服务，请稍候...
echo 启动后请访问: http://localhost:8080
echo 按 Ctrl+C 停止服务
echo ========================================

"%JAVA_HOME%\bin\java.exe" -jar "%JAR_FILE%" --server.port=8080
