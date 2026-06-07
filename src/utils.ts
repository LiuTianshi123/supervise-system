/** 生成 UUID */
export function generateId(): string {
  return crypto.randomUUID ? crypto.randomUUID() :
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
}

/** Excel 日期序列号转换为 YYYY-MM-DD 字符串 */
export function excelDateToString(serial: number): string {
  if (typeof serial !== 'number' || isNaN(serial)) {
    return String(serial);
  }
  // Excel 1900 date system with leap year bug
  // For serial > 59 (after fake Feb 29, 1900), adjust by -1
  const adjustedSerial = serial > 59 ? serial - 1 : serial;
  const date = new Date(Date.UTC(1900, 0, adjustedSerial));
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/** 格式化日期时间显示 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

/** 获取督学情况对应的颜色（MUI Chip color） */
export function getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  const s = status.trim();
  switch (s) {
    case '课前30分钟发送':
      return 'info';
    case '上课发送':
      return 'success';
    case '课后30分钟发送':
      return 'warning';
    case '课后1小时发送':
      return 'warning';
    default:
      return 'default';
  }
}

/** 获取头像实色品牌色 — 替代渐变色函数 */
export function getAvatarColor(name: string): string {
  const colors = [
    '#2563EB', '#7C3AED', '#059669', '#D97706',
    '#DC2626', '#0284C7', '#C026D3', '#0D9488',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}
