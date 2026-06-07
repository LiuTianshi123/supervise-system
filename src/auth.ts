/**
 * 认证工具模块
 * 处理登录、登出、Token 管理、API 请求带认证头
 */

const TOKEN_KEY = 'supervision-token';
const USER_KEY = 'supervision-user';

export interface AuthUser {
  id: number;
  username: string;
  displayName: string;
  role: 'admin' | 'leader' | 'user';
  groupIds?: number[];
  leaderGroupIds?: number[];
}

/** 获取保存的 Token */
export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

/** 获取保存的用户信息 — 兼容 snake_case 和 camelCase */
export function getStoredUser(): AuthUser | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    const obj = JSON.parse(raw);
    return normalizeAuthUser(obj);
  } catch {
    return null;
  }
}

/** 将后端返回的用户对象标准化为 AuthUser */
function normalizeAuthUser(raw: any): AuthUser {
  return {
    id: raw.id,
    username: raw.username,
    displayName: raw.displayName || raw.display_name || '',
    role: raw.role,
    groupIds: raw.groupIds || raw.group_ids || [],
    leaderGroupIds: raw.leaderGroupIds || raw.leader_group_ids || [],
  };
}

/** 保存登录信息 */
export function setAuth(token: string, user: AuthUser): void {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

/** 清除登录信息 */
export function clearAuth(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

/** 是否已登录 */
export function isAuthenticated(): boolean {
  return !!getToken();
}

/** 登录 API */
export async function login(username: string, password: string): Promise<{ token: string; user: AuthUser }> {
  const resp = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  const data = await resp.json();
  if (!resp.ok) throw new Error(data.message || data.error || '登录失败');
  return data;
}

/** 登出 API */
export async function logout(): Promise<void> {
  const token = getToken();
  if (token) {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch {
      // ignore
    }
  }
  clearAuth();
}

/** 获取当前用户信息 API */
export async function fetchCurrentUser(): Promise<AuthUser | null> {
  const token = getToken();
  if (!token) return null;
  try {
    const resp = await fetch('/api/auth/verify', {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await resp.json();
    if (data.user) {
      return normalizeAuthUser(data.user);
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * 带认证的 fetch 封装
 * 自动附加 Authorization header
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }
  if (!headers.has('Content-Type') && options.body) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, { ...options, headers });
}

/**
 * 带认证的 GET 请求
 */
export async function authGet(url: string): Promise<any> {
  const resp = await authFetch(url);
  if (resp.status === 401) {
    clearAuth();
    throw new AuthExpiredError();
  }
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err.error || `请求失败 (${resp.status})`);
  }
  return resp.json();
}

export class AuthExpiredError extends Error {
  constructor() { super('登录已过期'); this.name = 'AuthExpiredError'; }
}

/**
 * 带认证的 POST 请求
 */
export async function authPost(url: string, body?: any): Promise<any> {
  const resp = await authFetch(url, {
    method: 'POST',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (resp.status === 401) { clearAuth(); throw new AuthExpiredError(); }
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `请求失败 (${resp.status})`); }
  return resp.json();
}

export async function authPut(url: string, body?: any): Promise<any> {
  const resp = await authFetch(url, {
    method: 'PUT',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (resp.status === 401) { clearAuth(); throw new AuthExpiredError(); }
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `请求失败 (${resp.status})`); }
  return resp.json();
}

export async function authDelete(url: string, body?: any): Promise<any> {
  const resp = await authFetch(url, {
    method: 'DELETE',
    body: body ? JSON.stringify(body) : undefined,
  });
  if (resp.status === 401) { clearAuth(); throw new AuthExpiredError(); }
  if (!resp.ok) { const err = await resp.json().catch(() => ({})); throw new Error(err.error || `请求失败 (${resp.status})`); }
  return resp.json();
}
