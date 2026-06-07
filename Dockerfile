FROM python:3.9-slim

WORKDIR /app

# 复制依赖文件
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt -i https://mirrors.tencent.com/pypi/simple

# 复制所有文件
COPY . .

# 暴露端口
EXPOSE 8080

# 生产环境用 gunicorn 启动
ENV PORT=8080
CMD ["sh", "-c", "cd backend && gunicorn -b 0.0.0.0:8080 -w 2 app:app"]
