import React, { useState, useEffect } from 'react';
import {
  Box, Drawer, AppBar, Toolbar, Typography, List, ListItem, ListItemButton,
  ListItemIcon, ListItemText, IconButton, useMediaQuery, useTheme,
  CircularProgress, Chip, Avatar, Menu, MenuItem, Divider, Tooltip,
} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import PeopleOutlined from '@mui/icons-material/PeopleOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import MenuOutlined from '@mui/icons-material/MenuOutlined';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import AdminPanelSettingsOutlined from '@mui/icons-material/AdminPanelSettingsOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import ChevronLeftOutlined from '@mui/icons-material/ChevronLeftOutlined';
import ChevronRightOutlined from '@mui/icons-material/ChevronRightOutlined';
import KeyboardArrowDownOutlined from '@mui/icons-material/KeyboardArrowDownOutlined';
import { AuthUser, isAuthenticated, getStoredUser, fetchCurrentUser, logout, clearAuth } from './auth';
import LoginPage from './pages/LoginPage';
import ImportPage from './pages/ImportPage';
import StudentPage from './pages/StudentPage';
import DashboardPage from './pages/DashboardPage';
import SupervisionPage from './pages/SupervisionPage';
import UserManagePage from './pages/UserManagePage';
import GroupManagePage from './pages/GroupManagePage';

const DRAWER_WIDTH_EXPANDED = 240;
const DRAWER_WIDTH_COLLAPSED = 64;

type PageKey = 'import' | 'students' | 'supervision' | 'dashboard' | 'users' | 'groups';

const App: React.FC = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [currentPage, setCurrentPage] = useState<PageKey>('import');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  // 验证登录状态
  useEffect(() => {
    if (!isAuthenticated()) {
      setAuthLoading(false);
      return;
    }
    const stored = getStoredUser();
    if (stored) setUser(stored);
    fetchCurrentUser().then(u => {
      if (u) {
        setUser(u);
      } else {
        clearAuth();
        setUser(null);
      }
      setAuthLoading(false);
    }).catch(() => {
      setAuthLoading(false);
    });
  }, []);

  const handleLogout = async () => {
    setAnchorEl(null);
    await logout();
    setUser(null);
  };

  const handleNavClick = (key: PageKey) => {
    setCurrentPage(key);
    if (isMobile) setMobileOpen(false);
  };

  const drawerWidth = collapsed ? DRAWER_WIDTH_COLLAPSED : DRAWER_WIDTH_EXPANDED;

  // 加载中
  if (authLoading) {
    return (
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', flexDirection: 'column', gap: 3, backgroundColor: '#F2F3F5' }}>
        <Box sx={{ width: 56, height: 56, borderRadius: '12px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <AutoAwesomeOutlined sx={{ color: '#fff', fontSize: 28 }} />
        </Box>
        <CircularProgress size={28} sx={{ color: '#2563EB' }} />
      </Box>
    );
  }

  // 未登录 → 登录页
  if (!user) {
    return <LoginPage />;
  }

  // 构建导航项
  const navItems: { key: PageKey; label: string; icon: React.ReactNode; desc: string; adminOnly?: boolean }[] = [
    { key: 'import', label: '导入管理', icon: <CloudUploadOutlined />, desc: '上传课表数据' },
    { key: 'students', label: '学员档案', icon: <PeopleOutlined />, desc: '管理学员信息' },
    { key: 'supervision', label: '督学中心', icon: <NotificationsActiveOutlined />, desc: '自动督学发送' },
    { key: 'dashboard', label: '汇总总览', icon: <DashboardOutlined />, desc: '全局数据查看' },
    { key: 'users', label: '用户管理', icon: <AdminPanelSettingsOutlined />, desc: '管理账号权限', adminOnly: true },
    { key: 'groups', label: '分组管理', icon: <FolderOutlined />, desc: '管理数据分组', adminOnly: true },
  ];

  const visibleNavItems = navItems.filter(item => !item.adminOnly || user.role === 'admin');

  const roleLabel = user.role === 'admin' ? '管理员' : user.role === 'leader' ? '组长' : '用户';

  const drawerContent = (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', backgroundColor: '#0F172A' }}>
      {/* Logo 区 — 深色背景 */}
      <Box sx={{
        px: collapsed ? 1 : 3,
        py: 2.5,
        textAlign: collapsed ? 'center' : 'left',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        gap: collapsed ? 0 : 1.5,
        justifyContent: collapsed ? 'center' : 'flex-start',
      }}>
        <Box sx={{
          width: 36, height: 36, borderRadius: '10px',
          background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
        }}>
          <AutoAwesomeOutlined sx={{ color: '#fff', fontSize: 20 }} />
        </Box>
        {!collapsed && (
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 700, fontSize: '1rem', color: '#F1F5F9', lineHeight: 1.3 }}>
              督学管理系统
            </Typography>
            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>智能督学 · 高效管理</Typography>
          </Box>
        )}
      </Box>

      {/* 导航列表 — 深色风格 */}
      <List sx={{ px: 1, py: 1.5, flex: 1 }}>
        {visibleNavItems.map((item) => (
          <ListItem key={item.key} disablePadding sx={{ mb: 0.3 }}>
            {collapsed ? (
              <Tooltip title={item.label} placement="right" arrow>
                <ListItemButton
                  selected={currentPage === item.key}
                  onClick={() => handleNavClick(item.key)}
                  sx={{
                    py: 1.2, px: 0, borderRadius: '8px',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease',
                    '&.Mui-selected': {
                      backgroundColor: 'rgba(59,130,246,0.15)',
                      '&:hover': { backgroundColor: 'rgba(59,130,246,0.2)' },
                      '& .MuiListItemIcon-root': { color: '#60A5FA' },
                    },
                    '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 0, justifyContent: 'center', color: currentPage === item.key ? '#60A5FA' : '#94A3B8' }}>
                    {item.icon}
                  </ListItemIcon>
                </ListItemButton>
              </Tooltip>
            ) : (
              <ListItemButton
                selected={currentPage === item.key}
                onClick={() => handleNavClick(item.key)}
                sx={{
                  py: 1.2, px: 2, borderRadius: '8px', transition: 'all 0.2s ease',
                  '&.Mui-selected': {
                    backgroundColor: 'rgba(59,130,246,0.15)',
                    '&:hover': { backgroundColor: 'rgba(59,130,246,0.2)' },
                    '& .MuiListItemIcon-root': { color: '#60A5FA' },
                    '& .MuiListItemText-primary': { fontWeight: 600, color: '#F1F5F9' },
                    '& .MuiListItemText-secondary': { color: '#64748B' },
                  },
                  '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40, color: currentPage === item.key ? '#60A5FA' : '#94A3B8' }}>{item.icon}</ListItemIcon>
                <ListItemText
                  primary={item.label}
                  secondary={item.desc}
                  secondaryTypographyProps={{ sx: { fontSize: '0.7rem', mt: 0.2, color: '#64748B' } }}
                  primaryTypographyProps={{ sx: { fontSize: '0.9rem', color: '#CBD5E1' } }}
                />
              </ListItemButton>
            )}
          </ListItem>
        ))}
      </List>

      {/* 底部折叠按钮 + 版本信息 — 深色风格 */}
      <Box sx={{ px: 1, py: 1.5, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
        {!isMobile && (
          <IconButton
            onClick={() => setCollapsed(!collapsed)}
            sx={{
              width: '100%',
              borderRadius: '8px',
              color: '#64748B',
              '&:hover': { backgroundColor: 'rgba(255,255,255,0.05)', color: '#94A3B8' },
            }}
          >
            {collapsed ? <ChevronRightOutlined /> : <ChevronLeftOutlined />}
          </IconButton>
        )}
        {!collapsed && (
          <Typography variant="caption" sx={{ color: '#475569', fontSize: '0.7rem', display: 'block', textAlign: 'center', mt: 0.5 }}>
            v2.0 · Flask + SQLite
          </Typography>
        )}
      </Box>
    </Box>
  );

  const renderPage = () => {
    switch (currentPage) {
      case 'import': return <ImportPage />;
      case 'students': return <StudentPage />;
      case 'supervision': return <SupervisionPage />;
      case 'dashboard': return <DashboardPage />;
      case 'users': return <UserManagePage />;
      case 'groups': return <GroupManagePage />;
      default: return <ImportPage />;
    }
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? mobileOpen : true}
        onClose={() => setMobileOpen(false)}
        sx={{
          width: isMobile ? DRAWER_WIDTH_EXPANDED : drawerWidth,
          flexShrink: 0,
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          '& .MuiDrawer-paper': {
            width: isMobile ? DRAWER_WIDTH_EXPANDED : drawerWidth,
            boxSizing: 'border-box',
            backgroundColor: '#0F172A',
            borderRight: 'none',
            transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
            overflowX: 'hidden',
          },
        }}
      >
        {drawerContent}
      </Drawer>

      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, backgroundColor: '#F2F3F5' }}>
        {/* 顶栏：白底 + 面包屑风格 */}
        <AppBar position="sticky" elevation={0} sx={{
          backgroundColor: '#FFFFFF',
          borderBottom: '1px solid #E5E6EB',
          color: 'text.primary',
        }}>
          <Toolbar sx={{ minHeight: '52px !important', px: 3 }}>
            {isMobile && (
              <IconButton edge="start" onClick={() => setMobileOpen(!mobileOpen)} sx={{ mr: 2 }}>
                <MenuOutlined />
              </IconButton>
            )}
            {/* 面包屑：首页 > 当前页 */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75, flex: 1 }}>
              <Typography variant="body2" sx={{ color: '#86909C', fontSize: '0.85rem' }}>首页</Typography>
              <Typography variant="body2" sx={{ color: '#C9CDD4', fontSize: '0.7rem' }}>/</Typography>
              <Typography variant="body2" sx={{ color: '#1F1F1F', fontWeight: 600, fontSize: '0.9rem' }}>
                {navItems.find((item) => item.key === currentPage)?.label || '督学管理系统'}
              </Typography>
            </Box>

            {/* 用户区：头像 + 用户名 + 下拉 */}
            <Box
              sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer', px: 1.5, py: 0.5, borderRadius: '6px', border: '1px solid transparent', '&:hover': { backgroundColor: '#F2F3F5', border: '1px solid #E5E6EB', transition: 'all 0.2s ease' } }}
              onClick={(e) => setAnchorEl(e.currentTarget)}
            >
              <Avatar sx={{ width: 30, height: 30, fontSize: '0.8rem', bgcolor: '#2563EB', fontWeight: 600 }}>
                {user.displayName?.[0]}
              </Avatar>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#1F1F1F', display: { xs: 'none', sm: 'block' } }}>
                {user.displayName}
              </Typography>
              <KeyboardArrowDownOutlined sx={{ fontSize: 18, color: '#86909C' }} />
            </Box>

            <Menu
              anchorEl={anchorEl}
              open={!!anchorEl}
              onClose={() => setAnchorEl(null)}
              transformOrigin={{ horizontal: 'right', vertical: 'top' }}
              anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
              PaperProps={{
                sx: { borderRadius: '12px', boxShadow: '0 3px 6px -4px rgba(0,0,0,0.05), 0 6px 18px 0 rgba(0,0,0,0.06)', mt: 1 },
              }}
            >
              <MenuItem disabled>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <Avatar sx={{ width: 28, height: 28, fontSize: '0.75rem', bgcolor: '#2563EB' }}>{user.displayName?.[0]}</Avatar>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#1F1F1F' }}>{user.displayName}</Typography>
                    <Typography variant="caption" sx={{ color: '#86909C' }}>{roleLabel}</Typography>
                  </Box>
                </Box>
              </MenuItem>
              <Divider />
              <MenuItem onClick={handleLogout}>
                <ListItemIcon><LogoutOutlined fontSize="small" sx={{ color: '#EF4444' }} /></ListItemIcon>
                <Typography variant="body2" sx={{ color: '#EF4444' }}>退出登录</Typography>
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, overflow: 'auto', backgroundColor: '#F2F3F5' }}><Box key={currentPage} sx={{ animation: 'fadeIn 0.2s ease-out' }}>{renderPage()}</Box></Box>
      </Box>
    </Box>
  );
};

export default App;
