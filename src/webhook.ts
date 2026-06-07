/**
 * 督学机器人通信模块
 *
 * 所有 bot API 调用通过 Flask 后端 (含 JWT 认证)。
 * Vite 开发模式下代理到 Python bot，生产模式下 Flask 直接处理。
 */

import { getToken } from './auth';

const DAEMON_URL = '/api/bot';

const STORAGE_KEY_AUTO_SEND = 'supervision-auto-send';
const STORAGE_KEY_SEND_LOG = 'supervision-send-log';
const STORAGE_KEY_TEST_GROUP = 'supervision-test-group';

/** 机器人状态 */
export interface DaemonStatus {
  running: boolean;
  weworkRunning: boolean;
  pendingCount: number;
  completedCount: number;
  time: string;
}

/** 发送任务 */
export interface DaemonTask {
  id: string;
  groupName: string;
  studentName: string;
  courseName: string;
  statusMsg: string;
  message: string;
  sendTime: string;
}

/** 发送日志 */
export interface SendLogEntry {
  id: string;
  groupName: string;
  studentName: string;
  courseName: string;
  statusMsg: string;
  sendTime: string;
  success: boolean;
  errorMsg?: string;
}

/** 发送结果 */
export interface SendResult {
  success: boolean;
  error?: string;
}

// ============================================================
// 内部工具
// ============================================================

/** 带 JWT 认证的 fetch，返回 parsed JSON。失败返回 null。 */
async function authJson(url: string, options: RequestInit = {}): Promise<any> {
  const token = getToken();
  const headers = new Headers(options.headers || {});
  if (token) headers.set('Authorization', `Bearer ${token}`);
  if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
  try {
    const resp = await fetch(url, { ...options, headers });
    if (!resp.ok) {
      const text = await resp.text().catch(() => '');
      console.error(`[authJson] ${url} -> HTTP ${resp.status}: ${text.slice(0, 200)}`);
      return null;
    }
    return await resp.json();
  } catch (e) {
    console.error(`[authJson] ${url} -> fetch error:`, e);
    return null;
  }
}

// ============================================================
// 机器人控制 API
// ============================================================

/** 启动机器人 */
export async function startBot(): Promise<{ success: boolean; message: string }> {
  const data = await authJson('/api/bot-control/start', { method: 'POST', signal: AbortSignal.timeout(5000) });
  if (!data) return { success: false, message: '无法启动机器人' };
  return data;
}

/** 停止机器人 */
export async function stopBot(): Promise<{ success: boolean; message: string }> {
  const data = await authJson('/api/bot-control/stop', { method: 'POST', signal: AbortSignal.timeout(5000) });
  if (!data) return { success: false, message: '无法停止机器人' };
  return data;
}

// ============================================================
// 机器人业务 API
// ============================================================

/** 检查机器人状态 */
export async function checkDaemonStatus(): Promise<DaemonStatus | null> {
  return await authJson(`${DAEMON_URL}/api/status`, { signal: AbortSignal.timeout(3000) });
}

/** 同步任务到机器人 */
export async function syncTasksToDaemon(tasks: DaemonTask[]): Promise<{ success: boolean; pendingCount: number; newCount: number } | null> {
  return await authJson(`${DAEMON_URL}/api/tasks`, {
    method: 'POST',
    body: JSON.stringify(tasks),
    signal: AbortSignal.timeout(10000),
  });
}

/** 测试发送 */
export async function testDaemonSend(groupName: string, message: string): Promise<SendResult> {
  const data = await authJson(`${DAEMON_URL}/api/test`, {
    method: 'POST',
    body: JSON.stringify({ groupName, message }),
    signal: AbortSignal.timeout(20000),
  });
  if (!data) return { success: false, error: '无法连接到机器人或发送超时' };
  return { success: data.success, error: data.error };
}

/** 获取机器人日志 */
export async function getDaemonLogs(): Promise<SendLogEntry[]> {
  const data = await authJson(`${DAEMON_URL}/api/logs`, { signal: AbortSignal.timeout(3000) });
  return Array.isArray(data) ? data : [];
}

/** 获取机器人任务列表 */
export async function getDaemonTasks(): Promise<{ pending: DaemonTask[]; completed: any[] }> {
  const data = await authJson(`${DAEMON_URL}/api/tasks`, { signal: AbortSignal.timeout(3000) });
  if (!data) return { pending: [], completed: [] };
  return data;
}

/** 清空已完成任务 */
export async function clearCompletedTasks(): Promise<void> {
  await authJson(`${DAEMON_URL}/api/clear-completed`, { method: 'POST', signal: AbortSignal.timeout(3000) });
}

// ============================================================
// 本地设置存储
// ============================================================

export function saveAutoSend(enabled: boolean): void {
  localStorage.setItem(STORAGE_KEY_AUTO_SEND, String(enabled));
}

export function loadAutoSend(): boolean {
  return localStorage.getItem(STORAGE_KEY_AUTO_SEND) === 'true';
}

export function saveTestGroup(name: string): void {
  localStorage.setItem(STORAGE_KEY_TEST_GROUP, name);
}

export function loadTestGroup(): string {
  return localStorage.getItem(STORAGE_KEY_TEST_GROUP) || '';
}

export function clearSendLogs(): void {
  localStorage.removeItem(STORAGE_KEY_SEND_LOG);
}
