import React from 'react';
import { Chip } from '@mui/material';

/**
 * StatusChip — 统一状态标签组件
 * 4px 圆角 + 标准化状态色映射
 * 课前=蓝底蓝字、上课=绿底绿字、课后=橙底橙字
 */
interface StatusChipProps {
  /** 督学状态值，如 '课前30分钟发送' */
  status: string;
  /** 覆盖显示文本 */
  label?: string;
  /** 尺寸 */
  size?: 'small' | 'medium';
  /** 变体 */
  variant?: 'filled' | 'outlined';
}

/** 获取状态对应的背景色和文字色 */
function getStatusStyle(status: string): { backgroundColor: string; color: string } {
  switch (status) {
    case '课前30分钟发送':
      return { backgroundColor: '#E8F0FE', color: '#2563EB' };
    case '上课发送':
      return { backgroundColor: '#E8F6F0', color: '#00A870' };
    case '课后1小时发送':
      return { backgroundColor: '#FFF3E8', color: '#FF8800' };
    default:
      return { backgroundColor: '#F7F8FA', color: '#4E5969' };
  }
}

const StatusChip: React.FC<StatusChipProps> = ({ status, label, size = 'small', variant = 'filled' }) => {
  const style = getStatusStyle(status);

  if (variant === 'outlined') {
    return (
      <Chip
        label={label || status}
        size={size}
        variant="outlined"
        sx={{
          borderRadius: '4px',
          borderColor: style.color,
          color: style.color,
          fontWeight: 500,
        }}
      />
    );
  }

  return (
    <Chip
      label={label || status}
      size={size}
      sx={{
        borderRadius: '4px',
        backgroundColor: style.backgroundColor,
        color: style.color,
        fontWeight: 500,
      }}
    />
  );
};

export default StatusChip;
