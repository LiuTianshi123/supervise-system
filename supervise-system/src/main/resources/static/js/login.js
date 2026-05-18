/**
 * login.js - 登录页面逻辑
 */

// 页面加载时检查状态
document.addEventListener('DOMContentLoaded', async () => {
    // 如果已登录，跳转到主页
    AUTH.requireGuest();

    // 检查系统是否需要初始化
    try {
        const resp = await fetch('/api/auth/setup-status');
        const data = await resp.json();
        if (data.data && data.data.needsSetup) {
            showRegister();
        } else {
            showLogin();
        }
    } catch (e) {
        showLogin();
    }
});

function showLogin() {
    document.getElementById('loginPanel').style.display = 'block';
    document.getElementById('registerPanel').style.display = 'none';
}

function showRegister() {
    document.getElementById('registerPanel').style.display = 'block';
    document.getElementById('loginPanel').style.display = 'none';
}

function showError(elId, msg) {
    const el = document.getElementById(elId);
    el.style.display = 'block';
    el.querySelector('.alert').textContent = msg;
}

function hideError(elId) {
    document.getElementById(elId).style.display = 'none';
}

async function handleLogin(e) {
    e.preventDefault();
    hideError('loginError');

    const username = document.getElementById('loginUsername').value.trim();
    const password = document.getElementById('loginPassword').value;
    const btn = document.getElementById('loginBtn');

    if (!username || !password) return;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>登录中...';

    try {
        const resp = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();

        if (data.code === 0 && data.data && data.data.token) {
            AUTH.saveLogin(data.data.token, data.data);
            window.location.href = '/';
        } else {
            showError('loginError', data.message || '用户名或密码错误');
        }
    } catch (err) {
        showError('loginError', '网络错误，请检查服务是否启动');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-box-arrow-in-right"></i> 登 录';
    }
}

async function handleRegister(e) {
    e.preventDefault();
    hideError('regError');

    const username = document.getElementById('regUsername').value.trim();
    const password = document.getElementById('regPassword').value;
    const password2 = document.getElementById('regPassword2').value;
    const btn = document.getElementById('registerBtn');

    if (!username || username.length < 3) {
        showError('regError', '用户名至少3个字符');
        return;
    }
    if (password.length < 6) {
        showError('regError', '密码至少6位');
        return;
    }
    if (password !== password2) {
        showError('regError', '两次输入的密码不一致');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>创建中...';

    try {
        const resp = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await resp.json();

        if (data.code === 0 && data.data && data.data.token) {
            AUTH.saveLogin(data.data.token, data.data);
            window.location.href = '/';
        } else {
            showError('regError', data.message || '注册失败');
        }
    } catch (err) {
        showError('regError', '网络错误，请检查服务是否启动');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="bi bi-check-circle"></i> 创建管理员并登录';
    }
}
