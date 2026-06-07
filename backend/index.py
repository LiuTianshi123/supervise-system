"""
CloudBase 云函数入口文件
将 Flask 应用包装为 CloudBase HTTP 触发器格式
"""
import sys
import os
import io
import json
import urllib.parse

# 添加 backend 目录到 Python 路径
BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

# 设置 CloudBase 环境变量（云函数自动提供，本地需手动设置）
os.environ.setdefault('TCB_ENV_ID', os.environ.get('TCB_ENV_ID', ''))

# 导入 Flask 应用
from app import app as flask_app


def main_handler(event, context):
    """
    CloudBase 云函数 HTTP 触发器入口
    将 event 转换为 WSGI 请求，交给 Flask 处理，返回 HTTP 响应
    """
    # 如果 event 为空（冷启动探测），返回 OK
    if not event:
        return {
            'statusCode': 200,
            'headers': {'Content-Type': 'application/json'},
            'body': json.dumps({'message': '督学管理系统运行中'})
        }

    # 构建 WSGI environ
    http_method = event.get('httpMethod', 'GET')
    path = event.get('path', '/')
    query_string = event.get('queryStringParameters', {})
    if isinstance(query_string, dict):
        query_string = urllib.parse.urlencode(query_string) if query_string else ''
    headers = event.get('headers', {})
    body = event.get('body', '') or ''

    # 处理 base64 编码的 body
    if event.get('isBase64Encoded'):
        import base64
        body = base64.b64decode(body)

    if isinstance(body, dict):
        body = json.dumps(body)

    environ = {
        'REQUEST_METHOD': http_method,
        'PATH_INFO': path,
        'QUERY_STRING': query_string,
        'SERVER_PROTOCOL': 'HTTP/1.1',
        'SERVER_NAME': 'cloudbase',
        'SERVER_PORT': '443',
        'wsgi.version': (1, 0),
        'wsgi.url_scheme': 'https',
        'wsgi.input': io.BytesIO(body.encode() if isinstance(body, str) else body),
        'wsgi.errors': sys.stderr,
        'wsgi.multithread': False,
        'wsgi.multiprocess': False,
        'wsgi.run_once': False,
        'CONTENT_TYPE': headers.get('content-type', headers.get('Content-Type', 'application/json')),
        'CONTENT_LENGTH': str(len(body.encode() if isinstance(body, str) else body)),
        'HTTP_HOST': headers.get('host', headers.get('Host', 'cloudbase.net')),
    }

    # 添加 HTTP 头部
    for k, v in headers.items():
        key = 'HTTP_' + k.upper().replace('-', '_')
        if key not in ('HTTP_CONTENT_TYPE', 'HTTP_CONTENT_LENGTH', 'HTTP_HOST'):
            environ[key] = v

    # 收集响应
    response_headers = {}
    response_status = [200]
    response_body = [io.BytesIO()]

    def start_response(status, response_headers_list, exc_info=None):
        response_status[0] = int(status.split()[0])
        for h in response_headers_list:
            response_headers[h[0]] = h[1]
        return response_body[0].write

    # 调用 Flask 应用
    result = flask_app(environ, start_response)
    body_chunks = []
    for chunk in result:
        if isinstance(chunk, bytes):
            body_chunks.append(chunk)
        else:
            body_chunks.append(chunk.encode())
    response_body_str = b''.join(body_chunks).decode('utf-8', errors='replace')

    # 构建 CloudBase 响应
    resp = {
        'statusCode': response_status[0],
        'headers': {
            'Content-Type': response_headers.get('Content-Type', response_headers.get('content-type', 'text/html')),
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        },
        'body': response_body_str,
    }

    return resp


# 如果是直接运行（本地开发），启动 Flask 开发服务器
if __name__ == '__main__':
    from database import init_db
    init_db()
    port = int(os.environ.get('PORT', 8888))
    print(f"督学管理系统开发服务器: http://localhost:{port}")
    flask_app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
