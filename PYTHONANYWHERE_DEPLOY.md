# 督学管理系统 - PythonAnywhere 部署指南

## 部署步骤

### 1. 注册 PythonAnywhere 账号
- 访问 https://www.pythonanywhere.com
- 注册免费账号（Free tier 足够用）
- 免费版提供：`username.pythonanywhere.com` 公网访问

---

### 2. 创建 Web App
1. 登录后点击 **Dashboard**
2. 点击 **Web** 标签 → **Add a new web app**
3. 选择 **Manual configuration**
4. 选择 **Python 3.10**（免费版最高 3.10）
5. 域名确认（默认 `username.pythonanywhere.com`）

---

### 3. 上传代码（通过 Git）
在 PythonAnywhere 的 **Consoles** → 打开 **Bash** 控制台：

```bash
# 克隆代码仓库
cd ~
git clone https://github.com/LiuTianshi123/supervise-system.git mysite

# 创建虚拟环境
cd mysite
python3.10 -m venv venv

# 激活虚拟环境并安装依赖
source venv/bin/activate
pip install -r requirements.txt
pip install gunicorn

# 初始化数据库
python -c "import sys; sys.path.insert(0, 'backend'); import database; database.init_db()"
```

---

### 4. 配置 WSGI 文件
在 PythonAnywhere 的 **Web** 标签页，找到 **WSGI configuration file**，点击路径打开编辑器，替换为：

```python
import sys
import os

# 项目路径
PROJECT_DIR = '/home/username/mysite'       # 替换 username 为你的用户名
BACKEND_DIR  = '/home/username/mysite/backend'

# 添加到 sys.path
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)
if PROJECT_DIR not in sys.path:
    sys.path.insert(0, PROJECT_DIR)

# 切换工作目录（让 SQLite 文件落在正确位置）
os.chdir(BACKEND_DIR)

# 导入 Flask app
from app import app as application
```

> ⚠️ 把两处 `username` 替换成你的 PythonAnywhere 用户名！

保存后关闭编辑器。

---

### 5. 配置静态文件
在 **Web** 标签页，找到 **Static files** 部分，添加映射：

| URL | Directory |
|-----|-----------|
| `/static/` | `/home/username/mysite/backend/static` |

> 同样替换 `username`

---

### 6. 配置虚拟环境
在 **Web** 标签页，找到 **Virtualenv** 部分，填入：
```
/home/username/mysite/venv
```

---

### 7. 重新加载
点击 **Reload** 按钮（Web 标签页最上方）。

访问 `https://username.pythonanywhere.com` 查看效果。

---

## 默认账号
| 用户名 | 密码 |
|--------|------|
| admin | admin123 |

登录后请及时修改密码！

---

## 免费版限制
- ⚠️ **出站网络受限**：免费版只能访问白名单域名（GitHub、PyPI 等），不能访问任意外网
- ⚠️ **每天唤醒**：免费版长时间无访问会休眠，首次访问需要等几秒唤醒
- ✅ SQLite 数据库完全支持
- ✅ 静态文件服务正常

> 由于出站网络限制，**wecom-sender 桌面自动化**无法在 PythonAnywhere 上运行（它是 Windows 程序，也无法在 Linux 上运行）。发送功能仍需在你本地电脑运行。

---

## 本地 wecom-sender 连接云端
部署后，你的本地 `wecom-sender/wecom_sender.py` 需要连接云端 URL：

1. 确保云端 `BotScheduler` API 已开启
2. 修改 `wecom_sender.py` 中的 `API_BASE` 为：
   ```
   https://username.pythonanywhere.com
   ```
3. 本地运行 `wecom-sender/start.bat`，输入云端 Token

---

## 故障排查

### 500 Internal Server Error
查看 **Web** 标签页的 **Error log**，或在 Bash 控制台手动测试：
```bash
cd ~/mysite
source venv/bin/activate
cd backend
python -c "from app import app; print('OK')"
```

### 静态文件 404
检查 Static files 映射路径是否正确，`backend/static/index.html` 是否存在。

### 数据库 locked
SQLite 在同时读写时会锁住，免费版单进程没问题。如果看到 locked 错误，重启 Web app 即可。
