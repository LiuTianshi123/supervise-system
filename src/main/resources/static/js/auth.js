/**
 * auth.js - Token 管理与认证工具
 * 所有 API 请求通过这里统一注入 Authorization header
 */

const AUTH = {
    TOKEN_KEY: 'supervise_token',
    USER_KEY: 'supervise_user',

    /** 保存登录信息 */
    saveLogin(token, user) {
        localStorage.setItem(this.TOKEN_KEY, token);
        localStorage.setItem(this.USER_KEY, JSON.stringify(user));
    },

    /** 清除登录信息 */
    clearLogin() {
        localStorage.removeItem(this.TOKEN_KEY);
        localStorage.removeItem(this.USER_KEY);
    },

    /** 获取 Token */
    getToken() {
        return localStorage.getItem(this.TOKEN_KEY);
    },

    /** 获取当前用户信息 */
    getUser() {
        const u = localStorage.getItem(this.USER_KEY);
        return u ? JSON.parse(u) : null;
    },

    /** 判断是否已登录 */
    isLoggedIn() {
        return !!this.getToken();
    },

    /** 判断是否为管理员 */
    isAdmin() {
        const user = this.getUser();
        return user && user.role === 'ADMIN';
    },

    /** 获取当前用户名 */
    getUsername() {
        const user = this.getUser();
        return user ? (user.nickname || user.username) : '';
    },

    /** 获取当前用户角色显示文字 */
    getRoleLabel() {
        const user = this.getUser();
        return user ? (user.role === 'ADMIN' ? '管理员' : '普通用户') : '';
    },

    /**
     * 检查是否已登录，未登录则跳转到登录页
     */
    requireAuth() {
        if (!this.isLoggedIn()) {
            window.location.href = '/login.html';
            return false;
        }
        return true;
    },

    /**
     * 检查是否已登录，已登录则跳转到主页
     */
    requireGuest() {
        if (this.isLoggedIn()) {
            window.location.href = '/';
        }
    }
};

/**
 * 封装 fetch，自动注入 Authorization header
 * 同时处理 401/403 响应
 */
async function authFetch(url, options = {}) {
    const token = AUTH.getToken();
    const headers = options.headers || {};

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    if (!(options.body instanceof FormData)) {
        headers['Content-Type'] = 'application/json';
    }

    const response = await fetch(url, {
        ...options,
        headers
    });

    // 401 未登录 → 跳转登录页
    if (response.status === 401) {
        AUTH.clearLogin();
        window.location.href = '/login.html';
        throw new Error('请先登录');
    }

    // 403 权限不足
    if (response.status === 403) {
        const body = await response.json().catch(() => ({}));
        throw new Error(body.message || '权限不足');
    }

    return response;
}

/**
 * 简化版 GET 请求
 */
async function apiGet(url) {
    const resp = await authFetch(url);
    return resp.json();
}

/**
 * 简化版 POST 请求
 */
async function apiPost(url, body) {
    const resp = await authFetch(url, {
        method: 'POST',
        body: body instanceof FormData ? body : JSON.stringify(body)
    });
    return resp.json();
}

/**
 * 简化版 PUT 请求
 */
async function apiPut(url, body) {
    const resp = await authFetch(url, {
        method: 'PUT',
        body: JSON.stringify(body)
    });
    return resp.json();
}

/**
 * 简化版 DELETE 请求
 */
async function apiDelete(url) {
    const resp = await authFetch(url, { method: 'DELETE' });
    return resp.json();
}

/** 退出登录 */
function logout() {
    AUTH.clearLogin();
    window.location.href = '/login.html';
}
