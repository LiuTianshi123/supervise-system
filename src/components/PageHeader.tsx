import React from 'react';
import { Box, Typography } from '@mui/material';

/**
 * PageHeader — 统一页面标题组件
 * 品牌色 3px 竖线 + 20px/600 标题 + 12px 辅助说明 + 可选图标 + 右侧操作区
 */
interface PageHeaderProps {
  /** 页面标题，20px / font-weight: 600 */
  title: string;
  /** 辅助说明，12px / color: #86909C */
  subtitle?: string;
  /** 可选图标（Outlined 风格） */
  icon?: React.ReactNode;
  /** 右侧操作区（如新增按钮） */
  action?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, subtitle, icon, action }) => {
  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        mb: 3,
        animation: 'fadeInUp 0.4s ease-out',
        flexWrap: 'wrap',
        gap: 1.5,
        py: 0.5,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
        {/* 品牌色圆角图标背景 */}
        {icon && (
          <Box
            sx={{
              width: 36,
              height: 36,
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3B82F6 0%, #2563EB 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#fff',
              flexShrink: 0,
              boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
            }}
          >
            {icon}
          </Box>
        )}
        {/* 标题 + 辅助说明 */}
        <Box>
          <Typography
            variant="h6"
            sx={{
              fontWeight: 700,
              fontSize: '20px',
              color: '#1F1F1F',
              lineHeight: 1.3,
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                fontSize: '13px',
                color: '#86909C',
                mt: 0.3,
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </Box>
      {/* 右侧操作区 */}
      {action && <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>{action}</Box>}
    </Box>
  );
};

export default PageHeader;
