import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, Button, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, MenuItem, Chip, Alert,
  FormControl, InputLabel, Select, OutlinedInput, Checkbox, ListItemText,
  Tooltip, CircularProgress,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import VpnKeyOutlined from '@mui/icons-material/VpnKeyOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { authGet, authPost, authPut, authDelete, type AuthUser } from '../auth';
import PageHeader from '../components/PageHeader';

interface User {
  id: number;
  username: string;
  displayName: string;
  role: string;
  isActive: number;
  createdAt: string;
  groupIds: number[];
  leaderGroupIds: number[];
}

interface DataGroup {
  id: number;
  name: string;
  description: string;
}

const ROLE_LABELS: Record<string, { label: string; color: 'info' | 'warning' | 'default' }> = {
  admin: { label: '管理员', color: 'info' },
  leader: { label: '组长', color: 'warning' },
  user: { label: '普通用户', color: 'default' },
};

const UserManagePage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<DataGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [pwdDialogOpen, setPwdDialogOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [msg, setMsg] = useState('');

  const [form, setForm] = useState({
    username: '', password: '', displayName: '', role: 'user',
    groupIds: [] as number[], leaderGroupIds: [] as number[], isActive: true,
  });
  const [pwdForm, setPwdForm] = useState({ userId: 0, password: '' });

  const fetchData = useCallback(async () => {
    try {
      const [uRaw, gRaw] = await Promise.all([authGet('/api/admin/users'), authGet('/api/admin/groups')]);
      setUsers(Array.isArray(uRaw) ? uRaw : (uRaw.users || []));
      setGroups(Array.isArray(gRaw) ? gRaw : (gRaw.groups || []));
    } catch (err: any) {
      setMsg(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditUser(null);
    setForm({ username: '', password: '', displayName: '', role: 'user', groupIds: [], leaderGroupIds: [], isActive: true });
    setDialogOpen(true);
  };

  const openEdit = (user: User) => {
    setEditUser(user);
    setForm({
      username: user.username,
      password: '',
      displayName: user.displayName,
      role: user.role,
      groupIds: user.groupIds || [],
      leaderGroupIds: user.leaderGroupIds || [],
      isActive: !!user.isActive,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!editUser && (!form.username || !form.password || !form.displayName)) {
      setMsg('用户名、密码、显示名称不能为空');
      return;
    }
    if (editUser && !form.displayName) {
      setMsg('显示名称不能为空');
      return;
    }

    try {
      if (editUser) {
        const body: any = { displayName: form.displayName, role: form.role, isActive: form.isActive, groupIds: form.groupIds, leaderGroupIds: form.leaderGroupIds };
        if (form.password) body.password = form.password;
        await authPut(`/api/admin/users/${editUser.id}`, body);
      } else {
        await authPost('/api/admin/users', form);
      }
      setDialogOpen(false);
      setMsg('');
      fetchData();
    } catch (err: any) {
      setMsg(err.message || '操作失败');
    }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`确定要删除用户 "${user.displayName}" 吗？`)) return;
    try {
      await authDelete(`/api/admin/users/${user.id}`);
      fetchData();
    } catch (err: any) {
      setMsg(err.message || '删除失败');
    }
  };

  const handleResetPwd = async () => {
    if (!pwdForm.password || pwdForm.password.length < 4) {
      setMsg('密码至少4个字符');
      return;
    }
    try {
      await authPost('/api/admin/users/' + pwdForm.userId + '/reset-password', { newPassword: pwdForm.password });
      await authPut(`/api/admin/users/${pwdForm.userId}`, { password: pwdForm.password });
      setPwdDialogOpen(false);
      setMsg('');
    } catch (err: any) {
      setMsg(err.message || '重置失败');
    }
  };

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ p: 3 }}>
      {msg && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg('')}>{msg}</Alert>}

      <PageHeader
        title="用户管理"
        subtitle={`${users.length} 位用户`}
        icon={<PeopleOutlined sx={{ fontSize: 22 }} />}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>创建用户</Button>
        }
      />

      {/* 统一表格 — 无 Card 包裹 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>用户名</TableCell>
                <TableCell>显示名称</TableCell>
                <TableCell>角色</TableCell>
                <TableCell>分组</TableCell>
                <TableCell>状态</TableCell>
                <TableCell>创建时间</TableCell>
                <TableCell sx={{ minWidth: 120, position: 'sticky', right: 0, backgroundColor: '#F7F8FA', zIndex: 1 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((u) => {
                const userGroups = groups.filter(g => (u.groupIds || []).includes(g.id));
                return (
                  <TableRow key={u.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{u.username}</TableCell>
                    <TableCell>{u.displayName}</TableCell>
                    <TableCell>
                      <Chip label={ROLE_LABELS[u.role]?.label || u.role} color={ROLE_LABELS[u.role]?.color || 'default'} size="small" sx={{ borderRadius: '4px' }} />
                    </TableCell>
                    <TableCell>
                      {userGroups.length > 0 ? userGroups.map(g => (
                        <Chip key={g.id} label={g.name} size="small" variant="outlined" sx={{ mr: 0.5, mb: 0.5, borderRadius: '4px' }} />
                      )) : <Typography variant="caption" color="text.secondary">未分配</Typography>}
                    </TableCell>
                    <TableCell>
                      <Chip label={u.isActive ? '正常' : '禁用'} color={u.isActive ? 'success' : 'error'} size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
                    </TableCell>
                    <TableCell sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
                      {u.createdAt ? u.createdAt.substring(0, 16) : '-'}
                    </TableCell>
                    <TableCell sx={{ position: 'sticky', right: 0, backgroundColor: '#FFFFFF', zIndex: 1 }}>
                      <Tooltip title="编辑"><IconButton onClick={() => openEdit(u)} size="small" sx={{ '&:hover': { color: '#2563EB', backgroundColor: '#E8F0FE' } }}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="重置密码"><IconButton onClick={() => { setPwdForm({ userId: u.id, password: '' }); setPwdDialogOpen(true); }} size="small" sx={{ '&:hover': { color: '#2563EB', backgroundColor: '#E8F0FE' } }}><VpnKeyOutlined fontSize="small" /></IconButton></Tooltip>
                      <Tooltip title="删除"><IconButton onClick={() => handleDelete(u)} size="small" color="error" sx={{ '&:hover': { backgroundColor: '#FEF2F2' } }}><DeleteOutlined fontSize="small" /></IconButton></Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 创建/编辑用户对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editUser ? '编辑用户' : '创建用户'}</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <TextField fullWidth label="用户名" value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} disabled={!!editUser} sx={{ mb: 2 }} />
          <TextField fullWidth label={editUser ? '新密码（留空不修改）' : '密码'} type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth label="显示名称" value={form.displayName} onChange={e => setForm({ ...form, displayName: e.target.value })} sx={{ mb: 2 }} />
          <TextField fullWidth select label="角色" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} sx={{ mb: 2 }}>
            <MenuItem value="admin">管理员</MenuItem>
            <MenuItem value="leader">组长</MenuItem>
            <MenuItem value="user">普通用户</MenuItem>
          </TextField>

          {/* 分组多选 */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>所属分组</InputLabel>
            <Select
              multiple
              value={form.groupIds}
              onChange={e => setForm({ ...form, groupIds: e.target.value as number[] })}
              input={<OutlinedInput label="所属分组" />}
              renderValue={selected => (selected as number[]).map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
            >
              {groups.map(g => (
                <MenuItem key={g.id} value={g.id}>
                  <Checkbox checked={form.groupIds.includes(g.id)} />
                  <ListItemText primary={g.name} />
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* 组长发送权限多选 (仅组长) */}
          {(form.role === 'leader' || form.role === 'admin') && (
            <FormControl fullWidth sx={{ mb: 2 }}>
              <InputLabel>可发送的分组</InputLabel>
              <Select
                multiple
                value={form.leaderGroupIds}
                onChange={e => setForm({ ...form, leaderGroupIds: e.target.value as number[] })}
                input={<OutlinedInput label="可发送的分组" />}
                renderValue={selected => (selected as number[]).map(id => groups.find(g => g.id === id)?.name).filter(Boolean).join(', ')}
              >
                {groups.map(g => (
                  <MenuItem key={g.id} value={g.id}>
                    <Checkbox checked={form.leaderGroupIds.includes(g.id)} />
                    <ListItemText primary={g.name} />
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {editUser && (
            <TextField fullWidth select label="状态" value={form.isActive ? 1 : 0} onChange={e => setForm({ ...form, isActive: !!e.target.value })}>
              <MenuItem value={1}>正常</MenuItem>
              <MenuItem value={0}>禁用</MenuItem>
            </TextField>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>{editUser ? '保存' : '创建'}</Button>
        </DialogActions>
      </Dialog>

      {/* 重置密码对话框 */}
      <Dialog open={pwdDialogOpen} onClose={() => setPwdDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <VpnKeyOutlined color="primary" />
            重置密码
          </Box>
        </DialogTitle>
        <DialogContent>
          <TextField fullWidth label="新密码" type="password" value={pwdForm.password} onChange={e => setPwdForm({ ...pwdForm, password: e.target.value })} sx={{ mt: 1 }} autoFocus />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setPwdDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleResetPwd}>确认重置</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserManagePage;
