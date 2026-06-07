import React, { useState, useMemo, useEffect, useCallback } from 'react';
import {
  Box, Typography, Paper, Card, CardContent, Chip, Button, Snackbar, Alert,
  Stack, Avatar, Divider, List, FormControl, InputLabel, Select, MenuItem,
  IconButton, Tooltip, LinearProgress, TextField, Pagination,
  Dialog, DialogTitle, DialogContent, DialogActions, CircularProgress,
} from '@mui/material';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import ContentCopyOutlined from '@mui/icons-material/ContentCopyOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import TodayOutlined from '@mui/icons-material/TodayOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import TimerOutlined from '@mui/icons-material/TimerOutlined';
import ErrorOutlineOutlined from '@mui/icons-material/ErrorOutlineOutlined';
import VolumeUpOutlined from '@mui/icons-material/VolumeUpOutlined';
import VolumeOffOutlined from '@mui/icons-material/VolumeOffOutlined';
import SmartToyOutlined from '@mui/icons-material/SmartToyOutlined';
import PlayArrowOutlined from '@mui/icons-material/PlayArrowOutlined';
import StopOutlined from '@mui/icons-material/StopOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import { ScheduleRecord } from '../types';
import StatusChip from '../components/StatusChip';
import PageHeader from '../components/PageHeader';
import { fetchAllRecords } from '../dataApi';
import { authGet, authPost } from '../auth';

// ===== API → ScheduleRecord 映射 =====
function mapToSchedule(api: any): ScheduleRecord {
  return {
    id: api.id,
    studentName: api.student_name || '',
    groupName: api.group_name || api.wechat_group_name || '',
    teachingDate: api.teaching_date,
    dayOfWeek: api.day_of_week,
    timePeriod: api.time_period,
    courseName: api.course_name,
    courseLink: api.course_link || '',
    supervisionScript: api.supervision_script || '',
    supervisionStatus: (api.supervision_status || '课前30分钟发送').trim(),
    sourceFile: api.source_file || '',
    importedAt: api.imported_at,
  };
}

// ===== 工具函数 =====
function getTodayStr(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
function parseStartTime(tp: string): string | null { if (!tp) return null; return tp.split('-')[0]?.trim() || null; }
function parseEndTime(tp: string): string | null { if (!tp) return null; return tp.split('-')[1]?.trim() || null; }
function getTodayAt(h: number, m: number): Date { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate(), h, m); }

function getSendTime(r: ScheduleRecord): Date | null {
  const st = parseStartTime(r.timePeriod);
  if (!st) return null;
  const [sh, sm] = st.split(':').map(Number);
  const start = getTodayAt(sh, sm);
  switch (r.supervisionStatus) {
    case '课前30分钟发送': return new Date(start.getTime() - 30 * 60 * 1000);
    case '上课发送': return start;
    case '课后1小时发送': {
      const et = parseEndTime(r.timePeriod);
      if (!et) return null;
      const [eh, em] = et.split(':').map(Number);
      return new Date(getTodayAt(eh, em).getTime() + 3600000);
    }
    default: return null;
  }
}
function isDueAt(r: ScheduleRecord, now: Date): boolean {
  if (r.teachingDate !== getTodayStr()) return false;
  const t = getSendTime(r);
  return t ? now >= t : false;
}
function isUpcomingAt(r: ScheduleRecord, now: Date): boolean {
  if (r.teachingDate !== getTodayStr()) return false;
  const t = getSendTime(r);
  if (!t) return false;
  const d = t.getTime() - now.getTime();
  return d > 0 && d <= 30 * 60 * 1000;
}
function getOverdueMin(r: ScheduleRecord, now: Date): number | null {
  const t = getSendTime(r);
  if (!t) return null;
  const d = now.getTime() - t.getTime();
  return d > 0 ? Math.floor(d / 60000) : null;
}
function fmtOverdue(m: number): string {
  if (m < 60) return `逾期 ${m} 分钟`;
  const h = Math.floor(m / 60);
  const mins = m % 60;
  return mins === 0 ? `逾期 ${h} 小时` : `逾期 ${h}h${mins}m`;
}
function timeStatus(r: ScheduleRecord, now: Date, sent: boolean, expired?: boolean, failed?: boolean) {
  if (failed) return { label: '发送失败', color: 'error' as const };
  if (expired) return { label: '已过期', color: 'warning' as const };
  if (sent) return { label: '已发送', color: 'success' as const };
  if (r.teachingDate !== getTodayStr()) return { label: '非今日', color: 'default' as const };
  if (isDueAt(r, now)) return { label: '逾期未发', color: 'error' as const };
  if (isUpcomingAt(r, now)) return { label: '即将发送', color: 'warning' as const };
  return { label: '未到时间', color: 'default' as const };
}
function generateMessage(r: ScheduleRecord): string {
  let s = r.supervisionScript || '';
  const st = parseStartTime(r.timePeriod);
  if (st) { const [h, m] = st.split(':'); s = s.replace(/XX点XX分/g, `${h}点${m}分`).replace(/xx点xx分/gi, `${h}点${m}分`); }
  s = s.replace(/XX课程/g, r.courseName).replace(/xx课程/gi, r.courseName).replace(/XX课\b/g, r.courseName).replace(/xx课\b/gi, r.courseName);
  if (r.courseLink) s = s.replace(/课程链接[:：]\s*XX/g, `课程链接:${r.courseLink}`).replace(/课程链接[:：]\s*xx/gi, `课程链接:${r.courseLink}`);
  s = s.replace(/\bxx同学\b/gi, `${r.studentName}同学`).replace(/\bxx\b/g, r.studentName).replace(/\bXX\b/g, r.studentName);
  return s;
}
function statusWeight(s: string): number {
  return s === '课前30分钟发送' ? 1 : s === '上课发送' ? 2 : s === '课后1小时发送' ? 3 : 0;
}
function playAlert(): void {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    [0, 0.2, 0.4].forEach(d => {
      const o = ctx.createOscillator(), g = ctx.createGain();
      o.connect(g); g.connect(ctx.destination);
      o.frequency.value = 880; o.type = 'sine'; g.gain.value = 0.3;
      g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + d + 0.15);
      o.start(ctx.currentTime + d); o.stop(ctx.currentTime + d + 0.15);
    });
  } catch { /* */ }
}
function getSentKey(): string { return `supervision-sent-${getTodayStr()}`; }
function getExpiredKey(): string { return `supervision-expired-${getTodayStr()}`; }
function getFailedKey(): string { return `supervision-failed-${getTodayStr()}`; }
function loadSentRecords(): Set<string> { try { const r = localStorage.getItem(getSentKey()); if (r) return new Set(JSON.parse(r)); } catch { /* */ } return new Set(); }
function saveSentRecords(rs: Set<string>): void { localStorage.setItem(getSentKey(), JSON.stringify([...rs])); }
function loadExpiredRecords(): Set<string> { try { const r = localStorage.getItem(getExpiredKey()); if (r) return new Set(JSON.parse(r)); } catch { /* */ } return new Set(); }
function saveExpiredRecords(rs: Set<string>): void { localStorage.setItem(getExpiredKey(), JSON.stringify([...rs])); }
function loadFailedRecords(): Set<string> { try { const r = localStorage.getItem(getFailedKey()); if (r) return new Set(JSON.parse(r)); } catch { /* */ } return new Set(); }
function saveFailedRecords(rs: Set<string>): void { localStorage.setItem(getFailedKey(), JSON.stringify([...rs])); }

// ============================================================
const SupervisionPage: React.FC = () => {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [snackOpen, setSnackOpen] = useState(false);
  const [snackMsg, setSnackMsg] = useState('');
  const [snackSev, setSnackSev] = useState<'success' | 'warning' | 'error' | 'info'>('success');
  const [dateFilter, setDateFilter] = useState(getTodayStr());
  const [statusFilter, setStatusFilter] = useState('');
  const [now, setNow] = useState(new Date());
  const [sentRecords, setSentRecords] = useState(loadSentRecords);
  const [expiredRecords, setExpiredRecords] = useState(loadExpiredRecords);
  const [failedRecords, setFailedRecords] = useState(loadFailedRecords);
  const [soundEnabled, setSoundEnabled] = useState(() => localStorage.getItem('supervision-sound') !== 'false');
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [supervisionPage, setSupervisionPage] = useState(1);
  const [allRecords, setAllRecords] = useState<ScheduleRecord[]>([]);
  const [loadingData, setLoadingData] = useState(true);

  const today = getTodayStr();

  const loadData = useCallback(async () => {
    setLoadingData(true);
    try {
      const recs = await fetchAllRecords();
      setAllRecords(recs.map((r: any) => mapToSchedule(r)));
    } catch { /* ignore */ }
    setLoadingData(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  // ===== Bot 桌面自动化状态 =====
  const [botRunning, setBotRunning] = useState(false);
  const [botPending, setBotPending] = useState(0);
  const [botSent, setBotSent] = useState(0);
  const [botTotal, setBotTotal] = useState(0);
  const [botLoading, setBotLoading] = useState(false);
  const [botDialogOpen, setBotDialogOpen] = useState(false);

  const fetchBotStatus = useCallback(async () => {
    try {
      const data = await authGet('/api/bot/status');
      setBotRunning(data.running);
      setBotPending(data.pending);
      setBotSent(data.sent);
      setBotTotal(data.total_tasks);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchBotStatus(); const t = setInterval(fetchBotStatus, 10000); return () => clearInterval(t); }, [fetchBotStatus]);

  const handleBotStart = async () => {
    setBotLoading(true);
    try {
      await authPost('/api/bot/start', {});
      showSnack('督学调度已启动，请运行 wecom-sender/start.bat 连接桌面自动发送', 'success');
      fetchBotStatus();
    } catch (e: any) {
      showSnack(`启动失败: ${e.message || e}`, 'error');
    }
    setBotLoading(false);
  };

  const handleBotStop = async () => {
    setBotLoading(true);
    try {
      await authPost('/api/bot/stop', {});
      showSnack('督学调度已停止', 'info');
      fetchBotStatus();
    } catch (e: any) {
      showSnack(`停止失败: ${e.message || e}`, 'error');
    }
    setBotLoading(false);
  };

  // ===== 定时器 =====
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30000); return () => clearInterval(t); }, []);
  useEffect(() => { saveSentRecords(sentRecords); }, [sentRecords]);
  useEffect(() => { saveExpiredRecords(expiredRecords); }, [expiredRecords]);
  useEffect(() => { saveFailedRecords(failedRecords); }, [failedRecords]);
  useEffect(() => { localStorage.setItem('supervision-sound', String(soundEnabled)); }, [soundEnabled]);

  const todayTasks = useMemo(() =>
    allRecords.filter(r => !dateFilter || r.teachingDate === dateFilter)
      .sort((a, b) => statusWeight(a.supervisionStatus) - statusWeight(b.supervisionStatus)),
    [allRecords, dateFilter]);
  const filteredTasks = useMemo(() =>
    statusFilter ? todayTasks.filter(r => r.supervisionStatus === statusFilter) : todayTasks,
    [todayTasks, statusFilter]);
  const overdueUnsent = useMemo(() =>
    todayTasks.filter(r => isDueAt(r, now) && !sentRecords.has(r.id) && !expiredRecords.has(r.id) && !failedRecords.has(r.id)),
    [todayTasks, now, sentRecords, expiredRecords, failedRecords]);
  const stats = useMemo(() => {
    const ts = new Set(todayTasks.map(r => r.studentName)).size;
    return {
      total: todayTasks.length, students: ts,
      overdue: overdueUnsent.length,
      sent: todayTasks.filter(r => sentRecords.has(r.id)).length,
      expired: todayTasks.filter(r => expiredRecords.has(r.id)).length,
      failed: todayTasks.filter(r => failedRecords.has(r.id)).length,
    };
  }, [todayTasks, now, sentRecords, expiredRecords, failedRecords, overdueUnsent]);

  useEffect(() => {
    const c = todayTasks.filter(r => isDueAt(r, now) && !sentRecords.has(r.id) && !expiredRecords.has(r.id) && !failedRecords.has(r.id)).length;
    document.title = c > 0 ? `(${c}条待发!) 督学中心` : '督学中心';
    return () => { document.title = '课表管理系统'; };
  }, [now, sentRecords, expiredRecords, failedRecords, todayTasks]);

  // 到期提示音
  useEffect(() => {
    const c = overdueUnsent.length;
    if (c > 0 && soundEnabled) playAlert();
  }, [overdueUnsent.length]);

  const grouped = useMemo(() => {
    const g: Record<string, ScheduleRecord[]> = {};
    const sorted = [...filteredTasks].sort((a, b) => {
      const ad = isDueAt(a, now) && !sentRecords.has(a.id) && !expiredRecords.has(a.id) && !failedRecords.has(a.id);
      const bd = isDueAt(b, now) && !sentRecords.has(b.id) && !expiredRecords.has(b.id) && !failedRecords.has(b.id);
      if (ad && !bd) return -1; if (!ad && bd) return 1;
      if (failedRecords.has(a.id) && !failedRecords.has(b.id)) return -1;
      if (!failedRecords.has(a.id) && failedRecords.has(b.id)) return 1;
      if (expiredRecords.has(a.id) && !expiredRecords.has(b.id)) return -1;
      if (!expiredRecords.has(a.id) && expiredRecords.has(b.id)) return 1;
      if (sentRecords.has(a.id) && !sentRecords.has(b.id)) return 1;
      if (!sentRecords.has(a.id) && sentRecords.has(b.id)) return -1;
      return statusWeight(a.supervisionStatus) - statusWeight(b.supervisionStatus);
    });
    sorted.forEach(r => { if (!g[r.studentName]) g[r.studentName] = []; g[r.studentName].push(r); });
    return g;
  }, [filteredTasks, now, sentRecords, expiredRecords, failedRecords]);

  const SUPERVISION_PAGE_SIZE = 30;
  const groupedEntries = useMemo(() => Object.entries(grouped), [grouped]);
  const supervisionTotalPages = Math.max(1, Math.ceil(groupedEntries.length / SUPERVISION_PAGE_SIZE));
  const pagedGroupedEntries = useMemo(() => {
    const start = (supervisionPage - 1) * SUPERVISION_PAGE_SIZE;
    return groupedEntries.slice(start, start + SUPERVISION_PAGE_SIZE);
  }, [groupedEntries, supervisionPage]);

  const showSnack = useCallback((msg: string, sev: 'success' | 'warning' | 'error' | 'info' = 'success') => {
    setSnackMsg(msg); setSnackSev(sev); setSnackOpen(true);
  }, []);

  const handleCopy = async (r: ScheduleRecord) => {
    const msg = generateMessage(r);
    try { await navigator.clipboard.writeText(msg); } catch { const ta = document.createElement('textarea'); ta.value = msg; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    setCopiedId(r.id); showSnack('消息已复制！'); setTimeout(() => setCopiedId(null), 2000);
  };
  const handleMarkSent = (id: string) => {
    setSentRecords(prev => { const n = new Set(prev); n.add(id); return n; });
    setExpiredRecords(prev => { const n = new Set(prev); n.delete(id); return n; });
    setFailedRecords(prev => { const n = new Set(prev); n.delete(id); return n; });
    showSnack('已标记为已发送');
  };
  const handleCopyAllOverdue = async () => {
    if (overdueUnsent.length === 0) return;
    const msgs = overdueUnsent.sort((a, b) => a.studentName.localeCompare(b.studentName, 'zh-CN')).map(r => `======= ${r.studentName} =======\n【${r.supervisionStatus}】\n${generateMessage(r)}`).join('\n\n');
    try { await navigator.clipboard.writeText(msgs); } catch { const ta = document.createElement('textarea'); ta.value = msgs; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    showSnack(`已复制 ${overdueUnsent.length} 条消息`, 'info');
  };
  const handleCopyAll = async (name: string) => {
    const recs = (grouped[name] || []).filter(r => isDueAt(r, now) && !sentRecords.has(r.id) && !expiredRecords.has(r.id) && !failedRecords.has(r.id));
    const msgs = recs.map(r => `【${r.supervisionStatus}】\n${generateMessage(r)}`).join('\n\n');
    try { await navigator.clipboard.writeText(msgs); } catch { const ta = document.createElement('textarea'); ta.value = msgs; document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta); }
    showSnack(`${name} 的消息已复制！`);
  };

  const isToday = dateFilter === today;
  const oc = stats.overdue;
  const showBanner = isToday && oc > 0 && !bannerDismissed;
  const timeStr = now.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      {/* 逾期横幅 */}
      {showBanner && (
        <Paper sx={{ mb: 3, backgroundColor: '#FFFFFF', border: '1px solid #FCA5A5', borderLeft: '3px solid #EF4444', borderRadius: '12px', overflow: 'hidden', animation: 'fadeInUp 0.4s ease-out' }}>
          <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
            <WarningAmberOutlined sx={{ fontSize: 28, color: '#EF4444' }} />
            <Box sx={{ flex: 1, minWidth: 200 }}>
              <Typography variant="h6" sx={{ color: '#B91C1C', fontWeight: 600, fontSize: '1rem' }}>督学消息待发送！</Typography>
              <Typography variant="body2" sx={{ color: '#DC2626' }}>
                当前有 <strong>{oc}</strong> 条消息已到发送时间
                {overdueUnsent.length > 0 && <> — 最早：{overdueUnsent[0]?.studentName}（{overdueUnsent[0]?.courseName}）</>}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" startIcon={<ContentCopyOutlined />} onClick={handleCopyAllOverdue}
                sx={{ whiteSpace: 'nowrap', borderRadius: '6px', fontWeight: 600 }}>一键复制({oc}条)</Button>
              <IconButton size="small" onClick={() => setBannerDismissed(true)} sx={{ color: '#86909C' }}>✕</IconButton>
            </Stack>
          </Box>
        </Paper>
      )}
      {/* Bot 桌面自动化控制面板 */}
      <Paper sx={{ mb: 2, backgroundColor: botRunning ? '#E8F6F0' : '#F7F8FA', border: botRunning ? '1px solid #86EFAC' : '1px solid #E5E6EB', borderRadius: '12px', overflow: 'hidden' }}>
        <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
          <SmartToyOutlined sx={{ fontSize: 28, color: botRunning ? '#00A870' : '#86909C' }} />
          <Box sx={{ flex: 1, minWidth: 200 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1F1F1F' }}>
              桌面自动化督学 {botRunning ? <Chip label="运行中" color="success" size="small" sx={{ ml: 1, borderRadius: '4px' }} /> : <Chip label="已停止" size="small" sx={{ ml: 1, borderRadius: '4px' }} />}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {botRunning
                ? `今日 ${botTotal} 条任务 · 已发 ${botSent} 条 · 待发 ${botPending} 条（需运行 wecom-sender/start.bat）`
                : '点击启动激活任务队列，再运行 wecom-sender/start.bat 连接桌面自动发送'}
            </Typography>
          </Box>
          <Stack direction="row" spacing={1}>
            {botRunning ? (
              <Button variant="outlined" color="error" size="small" startIcon={<StopOutlined />}
                onClick={handleBotStop} disabled={botLoading} sx={{ borderRadius: '6px' }}>
                {botLoading ? <CircularProgress size={16} /> : '停止'}
              </Button>
            ) : (
              <Button variant="contained" color="success" size="small" startIcon={<PlayArrowOutlined />}
                onClick={handleBotStart} disabled={botLoading} sx={{ borderRadius: '6px', backgroundColor: '#00A870', '&:hover': { backgroundColor: '#008F5F' } }}>
                {botLoading ? <CircularProgress size={16} sx={{ color: '#fff' }} /> : '启动调度'}
              </Button>
            )}
            <IconButton size="small" onClick={() => setBotDialogOpen(true)} title="使用说明"><SettingsOutlined fontSize="small" /></IconButton>
          </Stack>
        </Box>
      </Paper>

      {/* Bot 使用说明弹窗 */}
      <Dialog open={botDialogOpen} onClose={() => setBotDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <SmartToyOutlined /> 桌面自动化督学 — 使用说明
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            <Box sx={{ p: 2, bgcolor: '#F0F7FF', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>原理</Typography>
              <Typography variant="body2" color="text.secondary">
                通过 pywinauto 控制 Windows 桌面上的企业微信客户端，自动搜索群聊并发送督学提醒。
                不需要管理员权限、不需要 webhook，只要企业微信客户端已登录即可。
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#FFF8E5', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>启动步骤</Typography>
              <Typography variant="body2" color="text.secondary" component="div">
                1. 确认企业微信客户端已打开并登录<br/>
                2. 点击上方「启动调度」激活任务队列<br/>
                3. 双击 <b>wecom-sender/start.bat</b> 启动桌面发送器<br/>
                4. 输入浏览器中获取的 API Token<br/>
                5. 到时间自动弹窗发消息，无需人工干预
              </Typography>
            </Box>
            <Box sx={{ p: 2, bgcolor: '#F0FFF4', borderRadius: 2 }}>
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>获取 Token</Typography>
              <Typography variant="body2" color="text.secondary">
                F12 → Application → Local Storage → 找到 "token" → 复制值
              </Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setBotDialogOpen(false)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 标题栏 */}
      <PageHeader
        title="督学中心"
        subtitle={`今日 ${stats.total} 条任务 · ${stats.students} 位学员`}
        icon={<NotificationsActiveOutlined sx={{ fontSize: 22 }} />}
        action={
          <Stack direction="row" spacing={0.75} alignItems="center" flexWrap="wrap" useFlexGap>
            {oc > 0 && (
              <Chip label={`${oc}条待发`} color="error" size="small" icon={<WarningAmberOutlined sx={{ fontSize: 14 }} />}
                sx={{ borderRadius: '4px', height: 24, animation: 'blink 1.5s ease-in-out infinite' }} />
            )}
            <Chip icon={<TimerOutlined sx={{ fontSize: 14 }} />} label={timeStr} size="small" variant="outlined" color="primary"
              onClick={() => setNow(new Date())} clickable sx={{ fontWeight: 600, borderRadius: '4px', height: 24 }} />
            <Button variant="contained" size="small" startIcon={<ContentCopyOutlined sx={{ fontSize: 16 }} />}
              onClick={handleCopyAllOverdue} disabled={oc === 0}
              sx={{ borderRadius: '6px', textTransform: 'none', py: 0.4 }}>一键复制</Button>
            <Tooltip title={soundEnabled ? '关闭提示音' : '开启提示音'}>
              <IconButton size="small" sx={{ p: 0.5 }} onClick={() => setSoundEnabled(!soundEnabled)}>
                {soundEnabled ? <VolumeUpOutlined sx={{ fontSize: 18, color: '#2563EB' }} /> : <VolumeOffOutlined sx={{ fontSize: 18, color: '#86909C' }} />}
              </IconButton>
            </Tooltip>
          </Stack>
        }
      />

      {/* 统计卡片 */}
      <Stack direction="row" spacing={1.5} sx={{ mb: 2 }} flexWrap="wrap" useFlexGap>
        {[
          { icon: <TodayOutlined sx={{ fontSize: 18 }} />, label: '今日任务', value: stats.total, color: '#2563EB', bg: '#E8F0FE' },
          { icon: <PeopleOutlined sx={{ fontSize: 18 }} />, label: '涉及学员', value: stats.students, color: '#00A870', bg: '#E8F6F0' },
          { icon: <WarningAmberOutlined sx={{ fontSize: 18 }} />, label: '待发送', value: oc, color: '#EF4444', bg: '#FEF2F2', pulse: oc > 0 },
          { icon: <CheckCircleOutlined sx={{ fontSize: 18 }} />, label: '已发送', value: stats.sent, color: '#00A870', bg: '#E8F6F0' },
          ...(stats.expired > 0 ? [{ icon: <TimerOutlined sx={{ fontSize: 18 }} />, label: '已过期', value: stats.expired, color: '#FF8800', bg: '#FFF3E8' }] : []),
          ...(stats.failed > 0 ? [{ icon: <ErrorOutlineOutlined sx={{ fontSize: 18 }} />, label: '发送失败', value: stats.failed, color: '#EF4444', bg: '#FEF2F2' }] : []),
        ].map((item, idx) => (
          <Card key={idx} sx={{ flex: 1, minWidth: 110 }}>
            <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 1.25, px: 1.5, '&:last-child': { pb: 1.25 } }}>
              <Box sx={{ width: 34, height: 34, borderRadius: '8px', backgroundColor: item.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: item.color }}>{item.icon}</span>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.65rem', fontWeight: 500, display: 'block', lineHeight: 1.3 }}>{item.label}</Typography>
                <Typography variant="h6" sx={{ fontWeight: 700, color: (item as any).pulse ? '#EF4444' : '#1F1F1F', fontSize: '1.1rem', lineHeight: 1.2 }}>
                  {(item as any).pulse ? (
                    <Chip label={`${item.value}`} color="error" size="small" sx={{ animation: 'blink 1.5s ease-in-out infinite', fontWeight: 700, borderRadius: '4px', height: 20, '& .MuiChip-label': { px: 0.8, py: 0 } }} />
                  ) : item.value}
                </Typography>
              </Box>
            </CardContent>
          </Card>
        ))}
      </Stack>
      <style>{`@keyframes blink { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }`}</style>

      {/* 筛选栏 + 进度条 */}
      <Paper sx={{ p: 1.5, mb: 2 }}>
        <Stack direction="row" spacing={1.5} alignItems="center" flexWrap="wrap" useFlexGap>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500 }}>日期</Typography>
            <TextField
              type="date" size="small" value={dateFilter}
              onChange={e => setDateFilter(e.target.value)}
              InputLabelProps={{ shrink: true }} sx={{ width: 160 }}
            />
            <Button size="small" variant="text" onClick={() => setDateFilter(today)} sx={{ color: '#2563EB', fontWeight: 600, py: 0.3, minWidth: 0 }}>今天</Button>
          </Box>
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel sx={{ fontSize: '0.8rem' }}>督学类型</InputLabel>
            <Select value={statusFilter} label="督学类型" onChange={e => setStatusFilter(e.target.value)} sx={{ fontSize: '0.85rem' }}>
              <MenuItem value="" sx={{ fontSize: '0.85rem' }}>全部</MenuItem>
              <MenuItem value="课前30分钟发送" sx={{ fontSize: '0.85rem' }}>课前30分钟</MenuItem>
              <MenuItem value="上课发送" sx={{ fontSize: '0.85rem' }}>上课发送</MenuItem>
              <MenuItem value="课后1小时发送" sx={{ fontSize: '0.85rem' }}>课后1小时</MenuItem>
            </Select>
          </FormControl>
          {isToday && todayTasks.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 200 }}>
              <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, whiteSpace: 'nowrap' }}>
                进度 {stats.sent}/{stats.total}
              </Typography>
              <LinearProgress variant="determinate" value={stats.total > 0 ? stats.sent / stats.total * 100 : 0}
                sx={{ flex: 1, height: 6, borderRadius: '4px', backgroundColor: '#E5E6EB',
                  '& .MuiLinearProgress-bar': { backgroundColor: stats.sent === stats.total ? '#00A870' : oc > 0 ? '#FF8800' : '#2563EB', borderRadius: '4px', transition: 'all 0.5s ease' } }} />
              <Typography variant="caption" sx={{ fontWeight: 600, color: stats.sent === stats.total ? '#00A870' : '#4E5969', whiteSpace: 'nowrap' }}>
                {stats.total > 0 ? Math.round(stats.sent / stats.total * 100) : 0}%
                {stats.sent === stats.total && stats.total > 0 && ' ✅'}
              </Typography>
            </Box>
          )}
        </Stack>
      </Paper>

      {/* 任务列表 */}
      {groupedEntries.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <Box sx={{ width: 72, height: 72, borderRadius: '20px', mx: 'auto', mb: 2, backgroundColor: '#F2F3F5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <NotificationsActiveOutlined sx={{ fontSize: 36, color: '#86909C' }} />
          </Box>
          <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 600 }}>{isToday ? '今天没有督学任务' : `${dateFilter} 没有督学任务`}</Typography>
          <Typography variant="body2" color="#C9CDD4" sx={{ mt: 0.5 }}>去导入管理上传课表文件吧</Typography>
        </Paper>
      ) : pagedGroupedEntries.map(([name, records]) => {
        const so = records.filter(r => isDueAt(r, now) && !sentRecords.has(r.id) && !expiredRecords.has(r.id) && !failedRecords.has(r.id)).length;
        const allSent = records.every(r => sentRecords.has(r.id));
        const hasExpired = records.some(r => expiredRecords.has(r.id));
        const hasFailed = records.some(r => failedRecords.has(r.id));
        return (
          <Paper key={name} sx={{
            mb: 2.5, overflow: 'hidden',
            borderLeft: hasFailed ? '3px solid #EF4444' : so > 0 ? '3px solid #EF4444' : hasExpired ? '3px solid #FF8800' : allSent ? '3px solid #00A870' : '3px solid #E5E6EB',
            border: hasFailed ? '1px solid #FCA5A5' : so > 0 ? '1px solid #FCA5A5' : hasExpired ? '1px solid #FDE68A' : allSent ? '1px solid #86EFAC' : '1px solid #E5E6EB',
            borderLeftWidth: '3px', borderRadius: '12px', animation: 'fadeInUp 0.3s ease-out',
          }}>
            <Box sx={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2.5, py: 2,
              backgroundColor: hasFailed ? '#FEF2F2' : so > 0 ? '#FEF2F2' : hasExpired ? '#FFF3E8' : allSent ? '#E8F6F0' : '#F7F8FA',
              flexWrap: 'wrap', gap: 1,
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                <Avatar sx={{ width: 32, height: 32, bgcolor: hasFailed ? '#EF4444' : so > 0 ? '#EF4444' : hasExpired ? '#FF8800' : allSent ? '#00A870' : '#2563EB', fontSize: 14, fontWeight: 700 }}>
                  {name.charAt(0)}
                </Avatar>
                <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#1F1F1F' }}>{name}</Typography>
                <Chip label={records[0]?.groupName || ''} size="small" variant="outlined" sx={{ borderColor: '#E5E6EB', borderRadius: '4px' }} />
                <Chip label={`${records.length}条`} size="small" color="primary" sx={{ fontWeight: 600, borderRadius: '4px' }} />
                {so > 0 && <Chip label={`${so}条待发`} color="error" size="small" icon={<WarningAmberOutlined sx={{ fontSize: 14 }} />} sx={{ borderRadius: '4px' }} />}
                {allSent && <Chip label="全部已发" color="success" size="small" icon={<CheckCircleOutlined sx={{ fontSize: 14 }} />} sx={{ borderRadius: '4px' }} />}
                {hasExpired && !allSent && <Chip label="有过期任务" color="warning" size="small" icon={<TimerOutlined sx={{ fontSize: 14 }} />} sx={{ borderRadius: '4px' }} />}
                {hasFailed && <Chip label="有失败任务" color="error" size="small" icon={<ErrorOutlineOutlined sx={{ fontSize: 14 }} />} sx={{ borderRadius: '4px' }} />}
              </Box>
              <Button size="small" variant="outlined" startIcon={<ContentCopyOutlined />} onClick={() => handleCopyAll(name)} sx={{ borderRadius: '6px' }}>复制</Button>
            </Box>
            <List sx={{ py: 0 }}>
              {records.map((r, idx) => {
                const msg = generateMessage(r);
                const isSent = sentRecords.has(r.id);
                const isExpired = expiredRecords.has(r.id);
                const isFailed = failedRecords.has(r.id);
                const due = isDueAt(r, now) && !isSent && !isExpired && !isFailed;
                const ts = timeStatus(r, now, isSent, isExpired, isFailed);
                const om = due ? getOverdueMin(r, now) : null;
                return (
                  <React.Fragment key={r.id}>
                    {idx > 0 && <Divider component="li" />}
                    <ListItem sx={{
                      flexDirection: 'column', alignItems: 'flex-start', py: 2, px: 2.5,
                      backgroundColor: isFailed ? '#FEF2F2' : isExpired ? '#FFF3E8' : isSent ? '#E8F6F0' : due ? '#FFF3E8' : isUpcomingAt(r, now) ? '#FFF3E8' : 'inherit',
                      borderLeft: isFailed ? '3px solid #EF4444' : isExpired ? '3px solid #FF8800' : isSent ? '3px solid #00A870' : due ? '3px solid #FF8800' : '3px solid transparent',
                      pl: (isSent || due || isExpired || isFailed) ? '12px !important' : undefined,
                      opacity: isSent ? 0.65 : 1, transition: 'all 0.2s ease',
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, width: '100%', flexWrap: 'wrap' }}>
                        <StatusChip status={r.supervisionStatus} />
                        <Typography variant="body2" sx={{ color: '#4E5969' }}>{r.courseName} · {r.timePeriod}</Typography>
                        <Chip label={ts.label} color={ts.color} size="small"
                          icon={isSent ? <CheckCircleOutlined sx={{ fontSize: 14 }} /> : isFailed ? <ErrorOutlineOutlined sx={{ fontSize: 14 }} /> : isExpired ? <TimerOutlined sx={{ fontSize: 14 }} /> : due ? <WarningAmberOutlined sx={{ fontSize: 14 }} /> : <TimerOutlined sx={{ fontSize: 14 }} />}
                          sx={{ borderRadius: '4px' }} />
                        {om !== null && <Chip label={fmtOverdue(om)} size="small"
                          sx={{ backgroundColor: '#FEF2F2', color: '#DC2626', fontWeight: 700, border: '1px solid #FCA5A5', borderRadius: '4px' }} />}
                        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
                          {!isSent && (
                            <>
                              <Tooltip title="复制"><IconButton size="small" onClick={() => handleCopy(r)}
                                color={copiedId === r.id ? 'success' : 'default'}>
                                {copiedId === r.id ? <CheckCircleOutlined /> : <ContentCopyOutlined />}
                              </IconButton></Tooltip>
                              <Tooltip title="标记已发送"><IconButton size="small" color="success" onClick={() => handleMarkSent(r.id)}>
                                <CheckCircleOutlined fontSize="small" />
                              </IconButton></Tooltip>
                            </>
                          )}
                        </Box>
                      </Box>
                      <Paper variant="outlined" sx={{
                        p: 2, backgroundColor: isFailed ? '#FEF2F2' : isExpired ? '#FFF8F0' : isSent ? '#F7FEF9' : '#FAFBFC', width: '100%',
                        borderRadius: '12px', borderLeft: `3px solid ${isFailed ? '#EF4444' : isExpired ? '#FF8800' : isSent ? '#00A870' : '#2563EB'}`, position: 'relative',
                      }}>
                        {isSent && <Typography variant="caption" sx={{ position: 'absolute', top: 6, right: 10, color: '#00A870', fontWeight: 700 }}>✓</Typography>}
                        {isExpired && <Typography variant="caption" sx={{ position: 'absolute', top: 6, right: 10, color: '#FF8800', fontWeight: 700 }}>⏰ 已过期</Typography>}
                        {isFailed && <Typography variant="caption" sx={{ position: 'absolute', top: 6, right: 10, color: '#EF4444', fontWeight: 700 }}>✗ 失败</Typography>}
                        <Typography variant="body2" sx={{
                          whiteSpace: 'pre-wrap', lineHeight: 1.8, fontSize: '0.85rem',
                          textDecoration: isSent ? 'line-through' : 'none', color: isSent ? '#86909C' : isFailed ? '#DC2626' : isExpired ? '#92400E' : '#1F1F1F',
                        }}>
                          {msg}
                        </Typography>
                      </Paper>
                    </ListItem>
                  </React.Fragment>
                );
              })}
            </List>
          </Paper>
        );
      })}

      {/* 分页 */}
      {groupedEntries.length > SUPERVISION_PAGE_SIZE && (
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 2, gap: 2 }}>
          <Typography variant="body2" color="text.secondary">
            第 {(supervisionPage - 1) * SUPERVISION_PAGE_SIZE + 1}-{Math.min(supervisionPage * SUPERVISION_PAGE_SIZE, groupedEntries.length)} 位学员，共 {groupedEntries.length} 位
          </Typography>
          <Pagination
            count={supervisionTotalPages} page={supervisionPage}
            onChange={(e, p) => setSupervisionPage(p)}
            color="primary" size="small" showFirstButton showLastButton siblingCount={1} boundaryCount={1}
          />
        </Box>
      )}

      <Snackbar open={snackOpen} autoHideDuration={3000} onClose={() => setSnackOpen(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
        <Alert severity={snackSev} variant="filled" onClose={() => setSnackOpen(false)} sx={{ borderRadius: '12px', fontWeight: 500 }}>{snackMsg}</Alert>
      </Snackbar>
    </Box>
  );
};

export default SupervisionPage;
