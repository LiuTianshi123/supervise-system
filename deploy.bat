@echo off
echo ========================================
echo  督学系统部署脚本 - 一键安装运行
echo ========================================
echo.

REM 检查Java
echo [1/5] 检查Java环境...
java -version >nul 2>&1
if %errorlevel%==0 (
    echo Java已安装，跳过安装步骤
    goto :maven_check
)

echo Java未安装，开始下载安装...
powershell -Command "Invoke-WebRequest -Uri 'https://download.oracle.com/java/17/latest/jdk-17_windows-x64_bin.exe' -OutFile 'C:\jdk-17.exe'"
echo 安装Java，请等待...
start /wait C:\jdk-17.exe /s
echo Java安装完成

:maven_check
REM 设置Java环境变量
setx /M JAVA_HOME "C:\Program Files\Java\jdk-17"
setx /M PATH "%PATH%;C:\Program Files\Java\jdk-17\bin"

REM 检查Git
echo [2/5] 检查Git...
git --version >nul 2>&1
if %errorlevel%==0 (
    echo Git已安装
    goto :clone
)

echo Git未安装，开始下载安装...
powershell -Command "Invoke-WebRequest -Uri 'https://github.com/git-for-windows/git/releases/download/v2.45.1.windows.1/Git-2.45.1-64-bit.exe' -OutFile 'C:\git-installer.exe'"
start /wait C:\git-installer.exe /VERYSILENT /NORESTART
echo Git安装完成

:clone
REM 下载项目
echo [3/5] 下载督学系统项目...
cd C:\
if exist supervise-system (
    echo 项目已存在，更新代码...
    cd supervise-system
    git pull
    cd ..
) else (
    echo 正在从GitHub克隆项目...
    git clone https://github.com/LiuTianshi123/supervise-system.git
)

REM 检查Maven
echo [4/5] 检查Maven...
where mvn >nul 2>&1
if %errorlevel%==0 (
    echo Maven已安装
    goto :build
)

echo Maven未安装，下载安装...
powershell -Command "Invoke-WebRequest -Uri 'https://dlcdn.apache.org/maven/maven-3/3.9.6/binaries/apache-maven-3.9.6-bin.zip' -OutFile 'C:\maven.zip'"
powershell -Command "Expand-Archive -Path 'C:\maven.zip' -DestinationPath 'C:\' -Force"
setx /M PATH "%PATH%;C:\apache-maven-3.9.6\bin"
set MAVEN_HOME=C:\apache-maven-3.9.6

:build
REM 构建项目
echo [5/5] 构建项目（请耐心等待）...
cd C:\supervise-system
call mvn clean package -DskipTests

REM 运行项目
echo.
echo ========================================
echo  构建完成，正在启动督学系统...
echo ========================================
java -jar target\supervise-system-1.0.0.jar

pause
