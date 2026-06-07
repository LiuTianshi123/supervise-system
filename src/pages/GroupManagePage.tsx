import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Typography, Button, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, IconButton, Dialog, DialogTitle,
  DialogContent, DialogActions, TextField, Alert, Chip, Tooltip, CircularProgress, Paper,
  Drawer, List, ListItem, ListItemAvatar, ListItemText, Divider,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import { authGet, authPost, authPut, authDelete } from '../auth';
import PageHeader from '../components/PageHeader';
import { fetchStudentsByGroup, ApiStudent } from '../dataApi';
import { getAvatarColor } from '../utils';

interface Group {
  id: number;
  name: string;
  description: string;
  webhook_url: string;
  memberCount: number;
  studentCount: number;
  leaders: { id: number; username: string; displayName: string }[];
}

const GroupManagePage: React.FC = () => {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editGroup, setEditGroup] = useState<Group | null>(null);
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({ name: '', description: '', webhook_url: '' });

  // ===== 学员列表 Drawer 状态 =====
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerGroup, setDrawerGroup] = useState<Group | null>(null);
  const [drawerStudents, setDrawerStudents] = useState<ApiStudent[]>([]);
  const [drawerLoading, setDrawerLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const data = await authGet('/api/admin/groups');
      setGroups(Array.isArray(data) ? data : (data.groups || []));
    } catch (err: any) {
      setMsg(err.message || '加载失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const openCreate = () => {
    setEditGroup(null);
    setForm({ name: '', description: '', webhook_url: '' });
    setDialogOpen(true);
  };

  const openEdit = (g: Group) => {
    setEditGroup(g);
    setForm({ name: g.name, description: g.description, webhook_url: g.webhook_url || '' });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      setMsg('分组名称不能为空');
      return;
    }
    try {
      if (editGroup) {
        await authPut(`/api/admin/groups/${editGroup.id}`, form);
      } else {
        await authPost('/api/admin/groups', form);
      }
      setDialogOpen(false);
      setMsg('');
      fetchData();
    } catch (err: any) {
      setMsg(err.message || '操作失败');
    }
  };

  const handleDelete = async (g: Group) => {
    if (g.id === 1) { setMsg('不能删除默认分组'); return; }
    if (!confirm(`确定要删除分组 "${g.name}" 吗？该分组下的所有学员数据也会被删除。`)) return;
    try {
      await authDelete(`/api/admin/groups/${g.id}`);
      fetchData();
    } catch (err: any) {
      setMsg(err.message || '删除失败');
    }
  };

  // ===== 点击学员数打开学员列表 Drawer =====
  const handleOpenStudentDrawer = useCallback(async (g: Group) => {
    setDrawerGroup(g);
    setDrawerOpen(true);
    setDrawerStudents([]);
    setDrawerLoading(true);
    try {
      const res = await fetchStudentsByGroup(g.id);
      setDrawerStudents(res.students);
    } catch {
      setDrawerStudents([]);
    } finally {
      setDrawerLoading(false);
    }
  }, []);

  const handleCloseDrawer = useCallback(() => {
    setDrawerOpen(false);
    setDrawerGroup(null);
    setDrawerStudents([]);
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><CircularProgress /></Box>;

  const totalStudents = groups.reduce((s, g) => s + (g.studentCount || 0), 0);

  return (
    <Box sx={{ p: 3 }}>
      {msg && <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setMsg('')}>{msg}</Alert>}

      <PageHeader
        title="分组管理"
        subtitle={`${groups.length} 个分组 · ${totalStudents} 名学员`}
        icon={<FolderOutlined sx={{ fontSize: 22 }} />}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={openCreate}>创建分组</Button>
        }
      />

      {/* 统一表格 — 无 Card 包裹 */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>分组名称</TableCell>
                <TableCell>描述</TableCell>
                <TableCell align="center">成员数</TableCell>
                <TableCell align="center">学员数</TableCell>
                <TableCell>组长</TableCell>
                <TableCell sx={{ minWidth: 120, position: 'sticky', right: 0, backgroundColor: '#F7F8FA', zIndex: 1 }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {groups.map((g) => (
                <TableRow key={g.id} hover>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {g.id === 1 && <Chip label="默认" size="small" color="primary" variant="outlined" sx={{ borderRadius: '4px' }} />}
                      <Typography fontWeight={600}>{g.name}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell sx={{ color: 'text.secondary' }}>{g.description || '-'}</TableCell>
                  <TableCell align="center">
                    <Chip label={g.memberCount || 0} size="small" variant="outlined" sx={{ borderRadius: '4px' }} />
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={g.studentCount || 0}
                      size="small"
                      color="info"
                      variant="outlined"
                      sx={{
                        borderRadius: '4px',
                        cursor: g.studentCount > 0 ? 'pointer' : 'default',
                        '&:hover': g.studentCount > 0 ? {
                          backgroundColor: '#E8F0FE',
                          borderColor: '#2563EB',
                          color: '#2563EB',
                        } : {},
                        transition: 'all 0.15s ease',
                      }}
                      onClick={() => g.studentCount > 0 && handleOpenStudentDrawer(g)}
                    />
                  </TableCell>
                  <TableCell>
                    {g.leaders && g.leaders.length > 0 ? g.leaders.map(l => (
                      <Chip key={l.id} label={l.displayName} size="small" color="warning" variant="outlined" sx={{ mr: 0.5, borderRadius: '4px' }} />
                    )) : <Typography variant="caption" color="text.secondary">暂无</Typography>}
                  </TableCell>
                  <TableCell sx={{ position: 'sticky', right: 0, backgroundColor: '#FFFFFF', zIndex: 1 }}>
                    <Tooltip title="编辑"><IconButton onClick={() => openEdit(g)} size="small" sx={{ '&:hover': { color: '#2563EB', backgroundColor: '#E8F0FE' } }}><EditOutlined fontSize="small" /></IconButton></Tooltip>
                    <Tooltip title="删除"><IconButton onClick={() => handleDelete(g)} size="small" color="error" disabled={g.id === 1} sx={{ '&:hover': { backgroundColor: '#FEF2F2' } }}><DeleteOutlined fontSize="small" /></IconButton></Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* 创建/编辑分组对话框 */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editGroup ? '编辑分组' : '创建分组'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="分组名称" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} sx={{ mt: 1, mb: 2 }} autoFocus />
          <TextField fullWidth label="描述" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} multiline rows={2} sx={{ mb: 2 }} />
          <TextField 
            fullWidth 
            label="企业微信群机器人 Webhook URL" 
            placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=..."
            value={form.webhook_url} 
            onChange={e => setForm({ ...form, webhook_url: e.target.value })}
            helperText="在群设置 → 群机器人 → 添加机器人，复制 Webhook 地址"
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)}>取消</Button>
          <Button variant="contained" onClick={handleSave}>{editGroup ? '保存' : '创建'}</Button>
        </DialogActions>
      </Dialog>

      {/* 学员列表 Drawer */}
      <Drawer
        anchor="right"
        open={drawerOpen}
        onClose={handleCloseDrawer}
        PaperProps={{
          sx: {
            width: 360,
            borderRadius: '16px 0 0 16px',
            boxShadow: '-4px 0 24px rgba(0,0,0,0.08)',
          },
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
          {/* Drawer Header */}
          <Box sx={{
            px: 3, py: 2.5,
            borderBottom: '1px solid #F0F0F0',
            backgroundColor: '#FAFBFC',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                width: 40, height: 40, borderRadius: '10px',
                background: 'linear-gradient(135deg, #E8F0FE 0%, #DBEAFE 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FolderOutlined sx={{ fontSize: 20, color: '#2563EB' }} />
              </Box>
              <Box>
                <Typography variant="subtitle1" sx={{ fontWeight: 700, color: '#1F1F1F', lineHeight: 1.3 }}>
                  {drawerGroup?.name}
                </Typography>
                <Typography variant="caption" sx={{ color: '#86909C' }}>
                  {drawerLoading ? '加载中...' : `${drawerStudents.length} 位学员`}
                </Typography>
              </Box>
            </Box>
            <IconButton onClick={handleCloseDrawer} size="small" sx={{ color: '#86909C' }}>
              <CloseOutlined />
            </IconButton>
          </Box>

          {/* Drawer Content */}
          <Box sx={{ flex: 1, overflow: 'auto', py: 1, px: 1.5 }}>
            {drawerLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', py: 6 }}>
                <CircularProgress size={28} />
              </Box>
            ) : drawerStudents.length === 0 ? (
              <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: '#86909C' }}>
                <PersonOutlined sx={{ fontSize: 40, mb: 1.5, opacity: 0.4 }} />
                <Typography variant="body2">暂无学员</Typography>
              </Box>
            ) : (
              <List sx={{ py: 0.5 }}>
                {drawerStudents.map((student, index) => {
                  const avatarColor = getAvatarColor(student.name);
                  return (
                    <React.Fragment key={student.id}>
                      <ListItem
                        sx={{
                          borderRadius: '10px',
                          py: 1,
                          px: 1.5,
                          mb: 0.5,
                          '&:hover': { backgroundColor: '#F7F8FA' },
                          transition: 'background-color 0.15s ease',
                        }}
                      >
                        <ListItemAvatar sx={{ minWidth: 44 }}>
                          <Box sx={{
                            width: 36, height: 36, borderRadius: '10px',
                            background: `linear-gradient(135deg, ${avatarColor}18, ${avatarColor}30)`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: avatarColor, fontSize: 15, fontWeight: 700,
                          }}>
                            {student.name.charAt(0)}
                          </Box>
                        </ListItemAvatar>
                        <ListItemText
                          primary={student.name}
                          secondary={`${student.record_count || 0} 条记录`}
                          primaryTypographyProps={{ fontSize: 14, fontWeight: 600, color: '#1F1F1F' }}
                          secondaryTypographyProps={{ fontSize: 12, color: '#86909C', mt: 0.25 }}
                        />
                      </ListItem>
                      {index < drawerStudents.length - 1 && (
                        <Divider sx={{ mx: 1.5, borderColor: '#F5F5F5' }} />
                      )}
                    </React.Fragment>
                  );
                })}
              </List>
            )}
          </Box>
        </Box>
      </Drawer>
    </Box>
  );
};

export default GroupManagePage;
