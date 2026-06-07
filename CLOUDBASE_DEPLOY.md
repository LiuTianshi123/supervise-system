# 督学管理系统 - 腾讯云 CloudBase 部署指南

## 方案说明

CloudBase 提供两种部署方式：
- **云函数（推荐）**：免费额度充足，适合 Flask 应用
- **云托管**：支持 Docker，更灵活但配置复杂

本指南使用**云函数**方式部署。

---

## 第一步：开通 CloudBase

1. 访问：https://console.cloud.tencent.com/tcb
2. 微信扫码登录（需实名认证）
3. 点**「新建环境」**
   - 环境名称：`supervision-env`
   - 套餐选择：**按需付费（有免费额度）**
4. 等待环境创建完成（约 1 分钟）

---

## 第二步：安装 CloudBase CLI

在**你的本地电脑**（Windows）打开终端（PowerShell 或 CMD）：

```powershell
# 安装 Node.js（如果还没有）
# 访问 https://nodejs.org 下载安装 LTS 版本

# 安装 CloudBase CLI
npm install -g @cloudbase/cli

# 验证安装
tcb --version
```

---

## 第三步：登录 CloudBase

```powershell
# 在终端运行，会弹出二维码，微信扫码登录
tcb login
```

---

## 第四步：初始化项目

进入项目目录：

```powershell
cd C:\Users\49782\WorkBuddy\2026-06-03-14-04-31\supervision-system

# 初始化 CloudBase 项目
tcb init
# - 选择环境：选择你刚创建的环境
# - 选择语言：Python
```

---

## 第五步：部署到云端

```powershell
# 部署云函数
tcb fn deploy supervision-system -e <你的环境ID>

# 或者一键部署所有函数（根据 cloudbaserc.json）
tcb fn deploy -e <你的环境ID>
```

---

## 第六步：配置 HTTP 访问

1. 登录腾讯云控制台：https://console.cloud.tencent.com/tcb
2. 进入你的环境 → **「云函数」**
3. 找到 `supervision-system` 函数
4. 点**「触发管理」** → **「创建触发器」**
   - 触发方式：**HTTP 触发器**
   - auth 鉴权：**免鉴权**（让所有人能访问）
5. 保存后会得到一个 URL，类似：
   ```
   https://<环境ID>.service.tcloudbase.com/supervision-system
   ```

---

## 第七步：访问系统

用浏览器打开上一步得到的 URL，应该能看到登录页面。

默认账号：`admin` / `admin123`

---

## 常见问题

### 部署后访问 404
检查 `cloudbaserc.json` 中的 `handler` 字段是否正确指向 `index.main_handler`。

### 静态文件丢失
CloudBase 云函数不直接支持静态文件服务，需要：
1. 使用 CloudBase **静态网站托管** 功能
2. 或者将静态文件上传到**云存储**

**推荐方案**：将 `backend/static/` 目录上传到 CloudBase 静态托管：

```powershell
tcb hosting deploy backend/static -e <环境ID>
```

---

## 免费额度说明

| 资源 | 免费额度 |
|------|---------|
| 云函数调用次数 | 每月 20 万次 |
| 云函数资源用量 | 每月 40 万 GBs |
| 静态托管流量 | 每月 5 GB |
| 数据库容量 | 2 GB |

完全够用！

---

## 下一步

部署成功后：
1. 修改默认管理员密码
2. 配置 `wecom-sender` 连接云端 URL
3. 邀请其他人通过公网 URL 访问

如有问题，查看 CloudBase 控制台 → **「日志」** 中的错误信息。
