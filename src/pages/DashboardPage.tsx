import React, { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TextField, IconButton, Chip, Button, Dialog,
  DialogTitle, DialogContent, DialogActions, FormControl, InputLabel,
  Select, MenuItem, Grid, Tooltip, InputAdornment, Pagination, Drawer,
  Stack, Divider, CircularProgress,
} from '@mui/material';
import AddOutlined from '@mui/icons-material/AddOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import FilterListOutlined from '@mui/icons-material/FilterListOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InfoOutlined from '@mui/icons-material/InfoOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import FolderOutlined from '@mui/icons-material/FolderOutlined';
import TableChartOutlined from '@mui/icons-material/TableChartOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import CloseOutlined from '@mui/icons-material/CloseOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import { getStatusColor } from '../utils';
import StatusChip from '../components/StatusChip';
import PageHeader from '../components/PageHeader';
import {
  fetchAllRecords, createRecord as apiCreateRecord,
  updateRecordApi, deleteRecordApi,
} from '../dataApi';

// ===== 视图模型 =====
interface RecordView {
  id: string;
  studentId: string;
  studentName: string;
  groupName: string;
  teachingDate: string;
  dayOfWeek: string;
  timePeriod: string;
  courseName: string;
  courseLink: string;
  supervisionScript: string;
  supervisionStatus: string;
  sourceFile: string;
}

interface FilterParams {
  studentName: string; courseName: string; date: string;
  dayOfWeek: string; timePeriod: string; supervisionStatus: string; searchText: string;
}

const STATUS_OPTIONS = ['课前30分钟发送', '上课发送', '课后30分钟发送', '课后1小时发送'];
const WEEKDAY_OPTIONS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const PAGE_SIZE = 50;

function mapRecord(api: any): RecordView {
  return {
    id: api.id, studentId: api.student_id, studentName: api.student_name || '',
    groupName: api.group_name || api.wechat_group_name || '',
    teachingDate: api.teaching_date, dayOfWeek: api.day_of_week,
    timePeriod: api.time_period, courseName: api.course_name,
    courseLink: api.course_link || '',
    supervisionScript: api.supervision_script || '',
    supervisionStatus: (api.supervision_status || '课前30分钟发送').trim(),
    sourceFile: api.source_file || '',
  };
}

const DashboardPage: React.FC = () => {
  const [allRecords, setAllRecords] = useState<RecordView[]>([]);
  const [studentCount, setStudentCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState<FilterParams>({
    studentName: '', courseName: '', date: '',
    dayOfWeek: '', timePeriod: '', supervisionStatus: '', searchText: '',
  });
  const [showFilters, setShowFilters] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordView | null>(null);
  const [formData, setFormData] = useState({
    studentName: '', groupName: '', teachingDate: '', dayOfWeek: '',
    timePeriod: '', courseName: '', courseLink: '',
    supervisionScript: '', supervisionStatus: '课前30分钟发送', sourceFile: '手动添加',
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [drawerRecord, setDrawerRecord] = useState<RecordView | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const recs = await fetchAllRecords();
      const records = recs.map((r: any) => mapRecord(r));
      setAllRecords(records);
      const names = new Set(records.map(r => r.studentName));
      setStudentCount(names.size);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const studentNames = useMemo(() => [...new Set(allRecords.map(r => r.studentName))], [allRecords]);
  const courseNames = useMemo(() => [...new Set(allRecords.map(r => r.courseName).filter(Boolean))], [allRecords]);
  const timePeriods = useMemo(() => [...new Set(allRecords.map(r => r.timePeriod).filter(Boolean))], [allRecords]);

  const filteredRecords = useMemo(() => {
    let records = allRecords;
    if (filters.studentName) records = records.filter(r => r.studentName === filters.studentName);
    if (filters.courseName) records = records.filter(r => r.courseName === filters.courseName);
    if (filters.date) records = records.filter(r => r.teachingDate === filters.date);
    if (filters.dayOfWeek) records = records.filter(r => r.dayOfWeek === filters.dayOfWeek);
    if (filters.timePeriod) records = records.filter(r => r.timePeriod === filters.timePeriod);
    if (filters.supervisionStatus) records = records.filter(r => r.supervisionStatus === filters.supervisionStatus);
    if (filters.searchText.trim()) {
      const kw = filters.searchText.trim().toLowerCase();
      records = records.filter(r =>
        r.studentName.toLowerCase().includes(kw) || r.courseName.toLowerCase().includes(kw) ||
        r.supervisionScript.toLowerCase().includes(kw) || r.groupName.toLowerCase().includes(kw) ||
        r.dayOfWeek.toLowerCase().includes(kw) || r.supervisionStatus.toLowerCase().includes(kw)
      );
    }
    return records;
  }, [allRecords, filters]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / PAGE_SIZE));
  const pagedRecords = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredRecords.slice(start, start + PAGE_SIZE);
  }, [filteredRecords, page]);

  const updateFilter = useCallback((key: keyof FilterParams, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters({ studentName: '', courseName: '', date: '', dayOfWeek: '', timePeriod: '', supervisionStatus: '', searchText: '' });
    setPage(1);
  }, []);

  const handleEdit = useCallback((record: RecordView) => {
    setEditingRecord(record);
    setFormData({
      studentName: record.studentName, groupName: record.groupName,
      teachingDate: record.teachingDate, dayOfWeek: record.dayOfWeek,
      timePeriod: record.timePeriod, courseName: record.courseName,
      courseLink: record.courseLink, supervisionScript: record.supervisionScript,
      supervisionStatus: record.supervisionStatus, sourceFile: record.sourceFile,
    });
    setEditDialogOpen(true);
  }, []);

  const handleSave = useCallback(async () => {
    if (!formData.studentName.trim()) return;
    try {
      const payload: any = {
        studentName: formData.studentName,
        teachingDate: formData.teachingDate,
        dayOfWeek: formData.dayOfWeek,
        timePeriod: formData.timePeriod,
        courseName: formData.courseName,
        courseLink: formData.courseLink,
        supervisionScript: formData.supervisionScript,
        supervisionStatus: formData.supervisionStatus,
        sourceFile: formData.sourceFile,
        wechatGroupName: formData.groupName,
        groupName: formData.groupName,
      };
      if (editingRecord) {
        await updateRecordApi(editingRecord.studentId, editingRecord.id, payload);
      } else {
        await apiCreateRecord(payload.studentId || 'new', payload);
      }
      setEditDialogOpen(false);
      setEditingRecord(null);
      loadData();
    } catch { /* ignore */ }
  }, [formData, editingRecord, loadData]);

  const handleDeleteClick = useCallback((recordId: string) => {
    setDeletingRecordId(recordId);
    setDeleteDialogOpen(true);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deletingRecordId) return;
    const rec = allRecords.find(r => r.id === deletingRecordId);
    if (rec) {
      try { await deleteRecordApi(rec.studentId, rec.id); } catch { /* ignore */ }
    }
    setDeleteDialogOpen(false);
    setDeletingRecordId(null);
    loadData();
  }, [deletingRecordId, allRecords, loadData]);

  const updateFormField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  const hasActiveFilters = !!(filters.studentName || filters.courseName || filters.date || filters.dayOfWeek || filters.timePeriod || filters.supervisionStatus);

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3, maxWidth: 1400, mx: 'auto' }}>
      <PageHeader
        title="汇总总览"
        subtitle={`共 ${studentCount} 位学员 · ${allRecords.length} 条记录${filteredRecords.length !== allRecords.length ? ` · 筛选后 ${filteredRecords.length} 条` : ''}`}
        icon={<DashboardOutlined sx={{ fontSize: 20 }} />}
        action={
          <Button variant="contained" startIcon={<AddOutlined />} onClick={() => { setEditingRecord(null); setFormData({ studentName: '', groupName: '', teachingDate: '', dayOfWeek: '', timePeriod: '', courseName: '', courseLink: '', supervisionScript: '', supervisionStatus: '课前30分钟发送', sourceFile: '手动添加' }); setEditDialogOpen(true); }}>新增记录</Button>
        }
      />

      {/* 筛选栏 — 干净白底卡片 + 精致筛选面板 */}
      <Paper elevation={0} sx={{ p: 0, mb: 3, overflow: 'hidden', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
        <Box sx={{ p: 2.5 }}>
          {/* 搜索行 */}
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <TextField
              size="small"
              placeholder="搜索学员/课程/群名/话术..."
              value={filters.searchText}
              onChange={(e) => updateFilter('searchText', e.target.value)}
              sx={{
                minWidth: 320,
                '& .MuiOutlinedInput-root': {
                  borderRadius: '8px',
                  '& fieldset': { borderColor: '#E8E8E8' },
                  '&:hover fieldset': { borderColor: '#C9CDD4' },
                  '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                },
              }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchOutlined sx={{ color: '#86909C', fontSize: 18 }} />
                  </InputAdornment>
                ),
              }}
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<FilterListOutlined />}
              onClick={() => setShowFilters(!showFilters)}
              sx={{
                borderRadius: '8px',
                textTransform: 'none',
                px: 2,
                borderColor: showFilters ? '#2563EB' : '#E0E0E0',
                color: showFilters ? '#2563EB' : '#4E5969',
                backgroundColor: showFilters ? '#F0F5FF' : 'transparent',
                '&:hover': {
                  borderColor: '#2563EB',
                  color: '#2563EB',
                  backgroundColor: '#F0F5FF',
                },
              }}
            >
              {showFilters ? '收起筛选' : '展开筛选'}
            </Button>
            {hasActiveFilters && (
              <Button
                variant="text"
                size="small"
                onClick={clearFilters}
                sx={{ color: '#EF4444', textTransform: 'none' }}
                startIcon={<CloseOutlined sx={{ fontSize: 16 }} />}
              >
                清空筛选
              </Button>
            )}
          </Box>

          {/* 激活筛选标签 */}
          {hasActiveFilters && (
            <Stack direction="row" spacing={0.75} sx={{ mt: 2, flexWrap: 'wrap' }} useFlexGap>
              {filters.studentName && (
                <Chip
                  label={`学员: ${filters.studentName}`}
                  size="small"
                  onDelete={() => updateFilter('studentName', '')}
                  sx={{
                    borderRadius: '6px',
                    backgroundColor: '#F0F5FF',
                    color: '#4E5969',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: '26px',
                    '& .MuiChip-deleteIcon': { color: '#86909C', '&:hover': { color: '#2563EB' } },
                  }}
                />
              )}
              {filters.courseName && (
                <Chip
                  label={`课程: ${filters.courseName}`}
                  size="small"
                  onDelete={() => updateFilter('courseName', '')}
                  sx={{
                    borderRadius: '6px',
                    backgroundColor: '#F0F5FF',
                    color: '#4E5969',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: '26px',
                    '& .MuiChip-deleteIcon': { color: '#86909C', '&:hover': { color: '#2563EB' } },
                  }}
                />
              )}
              {filters.date && (
                <Chip
                  label={`日期: ${filters.date}`}
                  size="small"
                  onDelete={() => updateFilter('date', '')}
                  sx={{
                    borderRadius: '6px',
                    backgroundColor: '#F0F5FF',
                    color: '#4E5969',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: '26px',
                    '& .MuiChip-deleteIcon': { color: '#86909C', '&:hover': { color: '#2563EB' } },
                  }}
                />
              )}
              {filters.dayOfWeek && (
                <Chip
                  label={`星期: ${filters.dayOfWeek}`}
                  size="small"
                  onDelete={() => updateFilter('dayOfWeek', '')}
                  sx={{
                    borderRadius: '6px',
                    backgroundColor: '#F0F5FF',
                    color: '#4E5969',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: '26px',
                    '& .MuiChip-deleteIcon': { color: '#86909C', '&:hover': { color: '#2563EB' } },
                  }}
                />
              )}
              {filters.timePeriod && (
                <Chip
                  label={`时间: ${filters.timePeriod}`}
                  size="small"
                  onDelete={() => updateFilter('timePeriod', '')}
                  sx={{
                    borderRadius: '6px',
                    backgroundColor: '#F0F5FF',
                    color: '#4E5969',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: '26px',
                    '& .MuiChip-deleteIcon': { color: '#86909C', '&:hover': { color: '#2563EB' } },
                  }}
                />
              )}
              {filters.supervisionStatus && (
                <Chip
                  label={`状态: ${filters.supervisionStatus}`}
                  size="small"
                  onDelete={() => updateFilter('supervisionStatus', '')}
                  sx={{
                    borderRadius: '6px',
                    backgroundColor: '#F0F5FF',
                    color: '#4E5969',
                    fontWeight: 500,
                    fontSize: '0.75rem',
                    height: '26px',
                    '& .MuiChip-deleteIcon': { color: '#86909C', '&:hover': { color: '#2563EB' } },
                  }}
                />
              )}
            </Stack>
          )}

          {/* 筛选面板 */}
          {showFilters && (
            <Box sx={{ mt: 2.5, pt: 2.5, borderTop: '1px solid #F0F0F0', animation: 'fadeInUp 0.2s ease-out' }}>
              <Grid container spacing={2}>
                {[
                  { label: '学员姓名', field: 'studentName' as const, options: studentNames },
                  { label: '课程名称', field: 'courseName' as const, options: courseNames },
                  { label: '督学情况', field: 'supervisionStatus' as const, options: STATUS_OPTIONS },
                  { label: '星期', field: 'dayOfWeek' as const, options: WEEKDAY_OPTIONS },
                  { label: '上课时间', field: 'timePeriod' as const, options: timePeriods },
                ].map(({ label, field, options }) => (
                  <Grid item xs={12} sm={6} md={2.4} key={field}>
                    <FormControl fullWidth size="small">
                      <InputLabel sx={{ color: '#86909C' }}>{label}</InputLabel>
                      <Select
                        value={filters[field]}
                        label={label}
                        onChange={(e) => updateFilter(field, e.target.value)}
                        sx={{
                          borderRadius: '8px',
                          '& .MuiOutlinedInput-notchedOutline': { borderColor: '#E8E8E8' },
                          '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C9CDD4' },
                          '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563EB' },
                        }}
                      >
                        <MenuItem value="">全部</MenuItem>
                        {options.map((opt) => (
                          <MenuItem key={opt} value={opt}>
                            {opt}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  </Grid>
                ))}
                <Grid item xs={12} sm={6} md={2.4}>
                  <TextField
                    size="small"
                    type="date"
                    label="日期"
                    value={filters.date}
                    onChange={(e) => updateFilter('date', e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    fullWidth
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: '8px',
                        '& fieldset': { borderColor: '#E8E8E8' },
                        '&:hover fieldset': { borderColor: '#C9CDD4' },
                        '&.Mui-focused fieldset': { borderColor: '#2563EB' },
                      },
                    }}
                  />
                </Grid>
              </Grid>
            </Box>
          )}
        </Box>
      </Paper>

      {/* 数据表格 — 清爽表头 + 精致行样式 */}
      <Paper elevation={0} sx={{ width: '100%', overflow: 'hidden', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
        <TableContainer sx={{ maxHeight: 'calc(100vh - 340px)' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#F7F8FA' }}>
                <TableCell sx={{ color: '#1F1F1F', fontWeight: 600, fontSize: '13px', py: 1.5, borderBottom: '1px solid #E8E8E8' }}>学员</TableCell>
                <TableCell sx={{ color: '#1F1F1F', fontWeight: 600, fontSize: '13px', py: 1.5, borderBottom: '1px solid #E8E8E8' }}>群名称</TableCell>
                <TableCell sx={{ color: '#1F1F1F', fontWeight: 600, fontSize: '13px', py: 1.5, borderBottom: '1px solid #E8E8E8' }}>日期</TableCell>
                <TableCell sx={{ color: '#1F1F1F', fontWeight: 600, fontSize: '13px', py: 1.5, borderBottom: '1px solid #E8E8E8' }}>课程</TableCell>
                <TableCell sx={{ color: '#1F1F1F', fontWeight: 600, fontSize: '13px', py: 1.5, borderBottom: '1px solid #E8E8E8' }}>督学情况</TableCell>
                <TableCell sx={{ minWidth: 120, position: 'sticky', right: 0, backgroundColor: '#F7F8FA', zIndex: 1, color: '#1F1F1F', fontWeight: 600, fontSize: '13px', py: 1.5, borderBottom: '1px solid #E8E8E8' }}>操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {pagedRecords.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} sx={{ textAlign: 'center', py: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#86909C' }}>
                      <TableChartOutlined sx={{ fontSize: 48, mb: 1, opacity: 0.5 }} />
                      <Typography>{allRecords.length === 0 ? '暂无数据，请先导入Excel文件' : '没有匹配的记录'}</Typography>
                    </Box>
                  </TableCell>
                </TableRow>
              ) : (
                pagedRecords.map((record, idx) => (
                  <TableRow
                    key={record.id}
                    hover
                    sx={{
                      cursor: 'pointer',
                      backgroundColor: idx % 2 === 0 ? '#FFFFFF' : '#FAFBFC',
                      transition: 'background-color 0.15s ease',
                      borderBottom: '1px solid #F5F5F5',
                      '&:hover': { backgroundColor: '#F5F7FA !important' },
                    }}
                    onClick={() => setDrawerRecord(record)}
                  >
                    <TableCell sx={{ py: 1.75 }}>
                      <Typography variant="body2" fontWeight={600} sx={{ color: '#1F1F1F', fontSize: '0.85rem' }}>
                        {record.studentName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.75 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          color: '#4E5969',
                          fontSize: '0.8rem',
                          maxWidth: 160,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {record.groupName}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" sx={{ color: '#1F1F1F', fontWeight: 500 }}>
                        {record.teachingDate}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#86909C' }}>
                        {record.dayOfWeek}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <Typography variant="body2" fontWeight={500} sx={{ color: '#1F1F1F' }}>
                        {record.courseName}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#86909C' }}>
                        {record.timePeriod}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ py: 1.5 }}>
                      <StatusChip status={record.supervisionStatus} />
                    </TableCell>
                    <TableCell
                      sx={{
                        position: 'sticky',
                        right: 0,
                        backgroundColor: 'inherit',
                        zIndex: 1,
                        py: 1,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Box
                        sx={{
                          display: 'flex',
                          gap: 0.25,
                        }}
                      >
                        <Tooltip title="查看详情">
                          <IconButton
                            size="small"
                            onClick={() => setDrawerRecord(record)}
                            sx={{
                              color: '#86909C',
                              '&:hover': { color: '#2563EB', backgroundColor: '#E8F0FE' },
                            }}
                          >
                            <InfoOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="编辑">
                          <IconButton
                            size="small"
                            onClick={() => handleEdit(record)}
                            sx={{
                              color: '#86909C',
                              '&:hover': { color: '#2563EB', backgroundColor: '#E8F0FE' },
                            }}
                          >
                            <EditOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="删除">
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteClick(record.id)}
                            sx={{
                              color: '#86909C',
                              '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' },
                            }}
                          >
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {filteredRecords.length > PAGE_SIZE && (
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              py: 1.5,
              px: 2.5,
              borderTop: '1px solid #F0F0F0',
              backgroundColor: '#FAFBFC',
            }}
          >
            <Typography variant="body2" sx={{ color: '#86909C' }}>
              共 <strong style={{ color: '#1F1F1F' }}>{filteredRecords.length}</strong> 条记录，第{' '}
              <strong style={{ color: '#1F1F1F' }}>{(page - 1) * PAGE_SIZE + 1}</strong>-
              <strong style={{ color: '#1F1F1F' }}>{Math.min(page * PAGE_SIZE, filteredRecords.length)}</strong> 条
            </Typography>
            <Pagination
              count={totalPages}
              page={page}
              onChange={(_, p) => setPage(p)}
              color="primary"
              size="small"
              showFirstButton
              showLastButton
              siblingCount={1}
              boundaryCount={1}
            />
          </Box>
        )}
      </Paper>

      {/* 详情抽屉 — 白底清爽 */}
      <Drawer anchor="right" open={!!drawerRecord} onClose={() => setDrawerRecord(null)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 480 }, p: 0 } }}>
        {drawerRecord && (
          <Box>
            <Box sx={{ p: 3 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5, color: '#1F1F1F' }}>{drawerRecord.studentName}</Typography>
                  <Typography variant="body2" sx={{ color: '#4E5969' }}>{drawerRecord.groupName}</Typography>
                </Box>
                <IconButton onClick={() => setDrawerRecord(null)} sx={{ color: '#86909C' }}>
                  <CloseOutlined fontSize="small" />
                </IconButton>
              </Box>
              <Stack spacing={2.5}>
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>授课信息</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><CalendarTodayOutlined sx={{ fontSize: 18, color: '#2563EB' }} /><Box><Typography variant="caption" color="text.secondary">日期</Typography><Typography variant="body2" fontWeight={600}>{drawerRecord.teachingDate} {drawerRecord.dayOfWeek}</Typography></Box></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><AccessTimeOutlined sx={{ fontSize: 18, color: '#2563EB' }} /><Box><Typography variant="caption" color="text.secondary">时间段</Typography><Typography variant="body2" fontWeight={600}>{drawerRecord.timePeriod}</Typography></Box></Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}><SchoolOutlined sx={{ fontSize: 18, color: '#00A870' }} /><Box><Typography variant="caption" color="text.secondary">课程</Typography><Typography variant="body2" fontWeight={600}>{drawerRecord.courseName}</Typography></Box></Box>
                    <Box><Typography variant="caption" color="text.secondary">督学情况</Typography><Box sx={{ mt: 0.5 }}><StatusChip status={drawerRecord.supervisionStatus} /></Box></Box>
                  </Box>
                </Box>
                {drawerRecord.courseLink && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>课程链接</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <LinkOutlined sx={{ fontSize: 18, color: '#2563EB' }} />
                      <a href={drawerRecord.courseLink.startsWith('http') ? drawerRecord.courseLink : `http://${drawerRecord.courseLink}`}
                        target="_blank" rel="noopener noreferrer"
                        style={{ color: '#2563EB', textDecoration: 'none', fontSize: '0.85rem', wordBreak: 'break-all' }}>
                        {drawerRecord.courseLink}
                      </a>
                    </Box>
                  </Box>
                )}
                {drawerRecord.supervisionScript && (
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>督学话术</Typography>
                    <Divider sx={{ my: 1 }} />
                    <Paper variant="outlined" sx={{ p: 2, backgroundColor: '#FAFBFC', borderRadius: '8px', borderLeft: '3px solid #2563EB', borderColor: '#F0F0F0' }}>
                      <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.8, color: '#1F1F1F' }}>{drawerRecord.supervisionScript}</Typography>
                    </Paper>
                  </Box>
                )}
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>其他</Typography>
                  <Divider sx={{ my: 1 }} />
                  <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                    <FolderOutlined sx={{ fontSize: 16, color: '#86909C' }} />
                    <Typography variant="body2" sx={{ color: '#4E5969', fontSize: '0.8rem' }}>{drawerRecord.sourceFile}</Typography>
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1, pt: 1 }}>
                  <Button variant="contained" size="small" startIcon={<EditOutlined />}
                    onClick={() => { handleEdit(drawerRecord); setDrawerRecord(null); }} sx={{ flex: 1, borderRadius: '8px', textTransform: 'none', boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>编辑</Button>
                  <Button variant="outlined" size="small" color="error" startIcon={<DeleteOutlined />}
                    onClick={() => { handleDeleteClick(drawerRecord.id); setDrawerRecord(null); }} sx={{ borderRadius: '8px', textTransform: 'none' }}>删除</Button>
                </Box>
              </Stack>
            </Box>
          </Box>
        )}
      </Drawer>

      {/* 新增/编辑 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRecord ? '编辑记录' : '新增记录'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}><TextField fullWidth label="学员姓名" size="small" value={formData.studentName} onChange={(e) => updateFormField('studentName', e.target.value)} required /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="群名称" size="small" value={formData.groupName} onChange={(e) => updateFormField('groupName', e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="授课日期" size="small" type="date" value={formData.teachingDate} onChange={(e) => updateFormField('teachingDate', e.target.value)} InputLabelProps={{ shrink: true }} /></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small"><InputLabel>星期</InputLabel>
                <Select value={formData.dayOfWeek} label="星期" onChange={(e) => updateFormField('dayOfWeek', e.target.value)}>
                  <MenuItem value="">请选择</MenuItem>
                  {WEEKDAY_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="时间段" size="small" placeholder="如: 11:00-18:55" value={formData.timePeriod} onChange={(e) => updateFormField('timePeriod', e.target.value)} /></Grid>
            <Grid item xs={12} sm={6}><TextField fullWidth label="课程名称" size="small" value={formData.courseName} onChange={(e) => updateFormField('courseName', e.target.value)} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="课程链接" size="small" value={formData.courseLink} onChange={(e) => updateFormField('courseLink', e.target.value)} /></Grid>
            <Grid item xs={12}><TextField fullWidth label="督学话术" size="small" multiline rows={3} value={formData.supervisionScript} onChange={(e) => updateFormField('supervisionScript', e.target.value)} /></Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small"><InputLabel>督学情况</InputLabel>
                <Select value={formData.supervisionStatus} label="督学情况" onChange={(e) => updateFormField('supervisionStatus', e.target.value)}>
                  <MenuItem value="">请选择</MenuItem>
                  {STATUS_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditDialogOpen(false)}>取消</Button>
          <Button onClick={handleSave} variant="contained" disabled={!formData.studentName.trim()}>{editingRecord ? '保存' : '添加'}</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberOutlined sx={{ color: '#EF4444' }} />
            确认删除
          </Box>
        </DialogTitle>
        <DialogContent><Typography>确定要删除这条记录吗？此操作不可撤销。</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default DashboardPage;
