import React, { useState } from 'react';
import {
  Box,
  TextField,
  Button,
  Typography,
  Alert,
  InputAdornment,
  IconButton,
  CircularProgress,
} from '@mui/material';
import AutoAwesomeOutlined from '@mui/icons-material/AutoAwesomeOutlined';
import VisibilityOutlined from '@mui/icons-material/VisibilityOutlined';
import VisibilityOffOutlined from '@mui/icons-material/VisibilityOffOutlined';
import LoginOutlined from '@mui/icons-material/LoginOutlined';
import CheckCircleOutlineOutlined from '@mui/icons-material/CheckCircleOutlineOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import NotificationsActiveOutlined from '@mui/icons-material/NotificationsActiveOutlined';
import { login, setAuth } from '../auth';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const doLogin = async () => {
    setError('');

    if (!username.trim() || !password) {
      setError('请输入用户名和密码');
      return;
    }

    setLoading(true);
    try {
      const result = await login(username.trim(), password);
      setAuth(result.token, result.user);
      window.location.reload();
    } catch (err: any) {
      setError(err.message || '登录失败');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      doLogin();
    }
  };

  return (
    <Box sx={{
      minHeight: '100vh',
      display: 'flex',
      backgroundColor: '#F2F3F5',
    }}>
      {/* 左侧品牌展示区 */}
      <Box sx={{
        flex: 1,
        backgroundColor: '#2563EB',
        display: { xs: 'none', md: 'flex' },
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 6,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* 装饰圆 */}
        <Box sx={{
          position: 'absolute',
          width: 400,
          height: 400,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.05)',
          top: -100,
          right: -100,
        }} />
        <Box sx={{
          position: 'absolute',
          width: 300,
          height: 300,
          borderRadius: '50%',
          backgroundColor: 'rgba(255,255,255,0.03)',
          bottom: -80,
          left: -60,
        }} />

        <Box sx={{ position: 'relative', zIndex: 1, textAlign: 'center', maxWidth: 400 }}>
          {/* Logo */}
          <Box sx={{
            width: 72, height: 72, borderRadius: '16px',
            backgroundColor: 'rgba(255,255,255,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 24px',
          }}>
            <AutoAwesomeOutlined sx={{ color: '#fff', fontSize: 36 }} />
          </Box>

          <Typography variant="h4" sx={{ fontWeight: 700, color: '#fff', mb: 1, fontSize: '1.8rem' }}>
            督学管理系统
          </Typography>
          <Typography variant="body1" sx={{ color: 'rgba(255,255,255,0.7)', mb: 5 }}>
            智能督学 · 高效管理 · 数据驱动
          </Typography>

          {/* 特性列表 */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, textAlign: 'left' }}>
            {[
              { icon: <SchoolOutlined sx={{ fontSize: 22 }} />, title: '智能课表导入', desc: '一键上传 Excel 文件，自动解析学员课表数据' },
              { icon: <NotificationsActiveOutlined sx={{ fontSize: 22 }} />, title: '自动督学发送', desc: '到时自动发送督学消息，支持企业微信群发' },
              { icon: <CheckCircleOutlineOutlined sx={{ fontSize: 22 }} />, title: '实时进度追踪', desc: '督学状态一目了然，逾期消息即时提醒' },
            ].map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
                <Box sx={{ color: 'rgba(255,255,255,0.9)', mt: 0.2 }}>{item.icon}</Box>
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600, color: '#fff' }}>{item.title}</Typography>
                  <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem' }}>{item.desc}</Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      {/* 右侧登录表单区 */}
      <Box sx={{
        flex: { xs: 1, md: '0 0 480px' },
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FFFFFF',
        padding: { xs: 3, md: 6 },
      }}>
        <Box sx={{ width: '100%', maxWidth: 380 }}>
          {/* 移动端 Logo */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, alignItems: 'center', gap: 1.5, mb: 4, justifyContent: 'center' }}>
            <Box sx={{ width: 44, height: 44, borderRadius: '12px', backgroundColor: '#2563EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AutoAwesomeOutlined sx={{ color: '#fff', fontSize: 24 }} />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700, color: '#1F1F1F' }}>督学管理系统</Typography>
          </Box>

          <Box sx={{ mb: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F1F1F', mb: 0.5, fontSize: '1.5rem' }}>
              欢迎登录
            </Typography>
            <Typography variant="body2" sx={{ color: '#86909C' }}>
              请输入您的账号密码
            </Typography>
          </Box>

          {error && (
            <Alert severity="error" sx={{ mb: 2, borderRadius: '12px' }} onClose={() => setError('')}>
              {error}
            </Alert>
          )}

          <Box onKeyDown={handleKeyDown}>
            <TextField
              fullWidth
              label="用户名"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoFocus
              sx={{
                mb: 2.5,
                '& .MuiOutlinedInput-root': {
                  height: 44,
                  borderRadius: '6px',
                },
              }}
              size="small"
              inputProps={{ autoComplete: 'username' }}
            />

            <TextField
              fullWidth
              label="密码"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              sx={{
                mb: 3,
                '& .MuiOutlinedInput-root': {
                  height: 44,
                  borderRadius: '6px',
                },
              }}
              size="small"
              inputProps={{ autoComplete: 'current-password' }}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={() => setShowPassword(!showPassword)} edge="end" size="small">
                      {showPassword ? <VisibilityOffOutlined sx={{ fontSize: 20 }} /> : <VisibilityOutlined sx={{ fontSize: 20 }} />}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
            />

            <Button
              fullWidth
              variant="contained"
              disabled={loading}
              onClick={() => doLogin()}
              startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <LoginOutlined />}
              sx={{
                py: 1.5,
                fontSize: '1rem',
                fontWeight: 600,
                borderRadius: '6px',
                backgroundColor: '#2563EB',
                boxShadow: 'none',
                '&:hover': {
                  backgroundColor: '#0D47A1',
                  boxShadow: '0 3px 6px -4px rgba(0,0,0,0.06), 0 6px 16px 0 rgba(0,0,0,0.04)',
                },
              }}
            >
              {loading ? '登录中...' : '登 录'}
            </Button>
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default LoginPage;
