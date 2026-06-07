# 督学管理系统 - 腾讯云 CloudBase 部署指南（方案B）

## 改了什么
- `database.py`：从 SQLite 迁移到 CloudBase NoSQL 数据库（保持函数接口不变）
- `index.py`：CloudBase 云函数 HTTP 触发器入口（WSGI 适配器）
- `app.py`：修复 ID 类型（integer → string）
- `requirements.txt`：添加 `cloudbase` SDK

## 部署步骤

### 第一步：开通腾讯云 CloudBase
1. 访问：https://console.cloud.tencent.com/tcb
2. 微信扫码登录（需实名认证，中国身份证）
3. 点**「新建环境」**
   - 环境名称：`supervision-env`
   - 套餐：**按需付费**（有免费额度，每月 15000 次调用）
4. 等待环境创建（约 1 分钟）
5. 记住你的**环境 ID**（格式：`xxx-xxx`）

---

### 第二步：安装 CloudBase CLI（本地电脑）
打开终端（PowerShell/CMD），运行：

```bash
npm install -g @cloudbase/cli
tcb login
# 弹出二维码 → 微信扫码登录
```

---

### 第三步：下载代码并配置
```bash
git clone https://github.com/LiuTianshi123/supervise-system.git cloudbase-supervision
cd cloudbase-supervision
```

编辑 `cloudbaserc.json`，把 `{{ENV_ID}}` 替换为你的环境 ID。

---

### 第四步：部署云函数
```bash
cd backend
pip install cloudbase -t .
cd ..

tcb fn deploy supervision-system -e <你的环境ID>
```

---

### 第五步：配置 HTTP 访问
1. 登录 CloudBase 控制台：https://console.cloud.tencent.com/tcb
2. 进入你的环境 → **云函数**
3. 点击 `supervision-system` → **触发方式**
4. 如果还没有 HTTP 触发器，点**创建触发器**：
   - 触发方式：**HTTP 触发器**
   - 鉴权方式：**免鉴权**
5. 复制触发器提供的 URL

---

### 第六步：部署前端静态文件
```bash
# 上传静态文件到 CloudBase 静态托管
tcb hosting deploy backend/static -e <你的环境ID>
```

然后在 CloudBase 控制台的**静态网站托管**中找到前端访问地址。

---

### 第七步：访问系统
打开 CloudBase 提供的 URL → 看到登录页面
- 账号：`admin`
- 密码：`admin123`

---

## 免费额度
| 资源 | 免费额度/月 |
|------|-----------|
| 云函数调用次数 | 15000 次 |
| 云函数资源 | 40000 GBs |
| 数据库读操作 | 50000 次 |
| 数据库写操作 | 30000 次 |
| 静态托管流量 | 5 GB |

正常使用完全足够。

---

## 注意
- CloudBase 云函数有**冷启动延迟**（首次访问约 1-3 秒）
- 数据库是 NoSQL，不支持复杂 JOIN 查询（已在代码中处理）
- 定期检查数据库容量（免费 2GB）
