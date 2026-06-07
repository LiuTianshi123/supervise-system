FROM python:3.9-slim

WORKDIR /app

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.tencent.com/pypi/simple

# 复制所有文件
COPY . .

# 暴露端口（CloudBase 云托管默认用 8080）
EXPOSE 8080

# 启动命令
CMD ["sh", "-c", "cd backend && python app.py"]
