import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Box, Typography, Paper, List, ListItemButton, ListItemText, TextField,
  IconButton, Chip, Divider, Button, Dialog, DialogTitle, DialogContent,
  DialogActions, Card, CardContent, Stack, FormControl, InputLabel,
  Select, MenuItem, Grid, Tooltip, InputAdornment, Pagination, Collapse,
  Link as MuiLink, CircularProgress,
} from '@mui/material';
import DeleteOutlined from '@mui/icons-material/DeleteOutlined';
import EditOutlined from '@mui/icons-material/EditOutlined';
import AddOutlined from '@mui/icons-material/AddOutlined';
import PersonOutlined from '@mui/icons-material/PersonOutlined';
import CalendarTodayOutlined from '@mui/icons-material/CalendarTodayOutlined';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import MenuBookOutlined from '@mui/icons-material/MenuBookOutlined';
import AccessTimeOutlined from '@mui/icons-material/AccessTimeOutlined';
import LinkOutlined from '@mui/icons-material/LinkOutlined';
import ChatOutlined from '@mui/icons-material/ChatOutlined';
import ExpandMoreOutlined from '@mui/icons-material/ExpandMoreOutlined';
import ExpandLessOutlined from '@mui/icons-material/ExpandLessOutlined';
import WarningAmberOutlined from '@mui/icons-material/WarningAmberOutlined';
import ClearOutlined from '@mui/icons-material/ClearOutlined';
import { getStoredUser } from '../auth';
import { AuthExpiredError } from '../auth';
import {
  fetchStudents, fetchRecords, createRecord as apiCreateRecord,
  updateRecordApi, deleteRecordApi, deleteStudentApi,
  fetchGroups, fetchMyGroups,
  ApiStudent, ApiRecord, ApiGroup,
  FetchStudentsParams,
} from '../dataApi';
import { getAvatarColor, getStatusColor } from '../utils';
import StatusChip from '../components/StatusChip';
import PageHeader from '../components/PageHeader';

// ===== 本地视图类型 (兼容旧UI) =====
interface StudentView {
  id: string;
  name: string;
  groupName: string;
  dataGroupId: number;
  createdAt: string;
  recordCount: number;
}

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
  importedAt: string;
}

const STATUS_OPTIONS = ['课前30分钟发送', '上课发送', '课后1小时发送'];
const WEEKDAY_OPTIONS = ['星期一', '星期二', '星期三', '星期四', '星期五', '星期六', '星期日'];
const PAGE_SIZE = 50;

const emptyFormData = () => ({
  studentName: '', groupName: '', teachingDate: '', dayOfWeek: '',
  timePeriod: '', courseName: '', courseLink: '',
  supervisionScript: '', supervisionStatus: '课前30分钟发送', sourceFile: '手动添加',
  wechatGroupName: '',
});

function mapRecord(api: ApiRecord, studentName: string, groupName: string): RecordView {
  return {
    id: api.id,
    studentId: api.student_id,
    studentName,
    groupName: groupName || api.wechat_group_name || '',
    teachingDate: api.teaching_date,
    dayOfWeek: api.day_of_week,
    timePeriod: api.time_period,
    courseName: api.course_name,
    courseLink: api.course_link || '',
    supervisionScript: api.supervision_script || '',
    supervisionStatus: api.supervision_status || '课前30分钟发送',
    sourceFile: api.source_file || '',
    importedAt: api.imported_at || '',
  };
}

const StudentPage: React.FC = () => {
  const [students, setStudents] = useState<StudentView[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [selectedRecords, setSelectedRecords] = useState<RecordView[]>([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingStudentId, setDeletingStudentId] = useState<string | null>(null);
  const [listPage, setListPage] = useState(1);
  const [totalStudents, setTotalStudents] = useState(0);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<RecordView | null>(null);
  const [formData, setFormData] = useState(emptyFormData());
  const [recordDeleteDialogOpen, setRecordDeleteDialogOpen] = useState(false);
  const [deletingRecordId, setDeletingRecordId] = useState<string | null>(null);
  const [expandedRecordId, setExpandedRecordId] = useState<string | null>(null);

  // ===== 服务端分页加载学员列表 =====
  const loadStudents = useCallback(async (page = 1, keyword = '') => {
    setLoading(true);
    try {
      const params: FetchStudentsParams = { page, pageSize: PAGE_SIZE };
      if (keyword.trim()) params.keyword = keyword.trim();
      const res = await fetchStudents(params);
      const views: StudentView[] = res.students.map((s: ApiStudent) => ({
        id: s.id,
        name: s.name,
        groupName: s.wechat_group_name || '',
        dataGroupId: s.data_group_id,
        createdAt: s.created_at,
        recordCount: s.record_count,
      }));
      setStudents(views);
      setTotalStudents(res.total);
    } catch (err) {
      if (err instanceof AuthExpiredError) throw err;
      console.error('Failed to load students:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadStudents(1, ''); }, [loadStudents]);


  // 加载选中学员的课表记录
  useEffect(() => {
    if (!selectedStudentId) { setSelectedRecords([]); return; }
    const student = students.find(s => s.id === selectedStudentId);
    if (!student) return;
    setRecordsLoading(true);
    fetchRecords(selectedStudentId)
      .then(recs => {
        setSelectedRecords(recs.map(r => mapRecord(r, student.name, student.groupName)));
      })
      .catch(() => setSelectedRecords([]))
      .finally(() => setRecordsLoading(false));
  }, [selectedStudentId, students]);

  const totalPages = Math.max(1, Math.ceil(totalStudents / PAGE_SIZE));
  const pagedStudents = students;

  // 搜索 — 按回车触发，避免输入过程中重渲染导致失焦
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const v = (e.target as HTMLInputElement).value;
      setSearchText(v);
      setListPage(1);
      loadStudents(1, v);
    }
  };
  const handleSearchChange = (v: string) => {
    setSearchText(v);
  };
  const handleClearSearch = () => {
    setSearchText('');
    setListPage(1);
    loadStudents(1, '');
    if (searchInputRef.current) searchInputRef.current.value = '';
  };

  // 翻页 — 走服务端
  const handlePageChange = (_: React.ChangeEvent<unknown>, p: number) => {
    setListPage(p);
    loadStudents(p, searchText);
  };

  const selectedStudent = useMemo(() => {
    if (!selectedStudentId) return null;
    return students.find(s => s.id === selectedStudentId) || null;
  }, [students, selectedStudentId]);

  const getStudentSummary = () => {
    const recs = selectedRecords;
    const totalCourses = recs.length;
    const courseNames = new Set(recs.map(r => r.courseName));
    const dates = recs.map(r => r.teachingDate).filter(Boolean).sort();
    const latestDate = dates.length > 0 ? dates[dates.length - 1] : '暂无';
    return { totalCourses, uniqueCourses: courseNames.size, latestDate };
  };

  // ===== 学生删除 =====
  const handleDeleteClick = (studentId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setDeletingStudentId(studentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (deletingStudentId) {
      try {
        await deleteStudentApi(deletingStudentId);
        if (selectedStudentId === deletingStudentId) setSelectedStudentId(null);
        const newPage = students.length <= 1 && listPage > 1 ? listPage - 1 : listPage;
        setListPage(newPage);
        loadStudents(newPage, searchText);
      } catch { /* ignore */ }
    }
    setDeleteDialogOpen(false);
    setDeletingStudentId(null);
  };

  // ===== 记录 CRUD =====
  const handleAddRecord = useCallback(() => {
    if (!selectedStudent) return;
    setEditingRecord(null);
    setFormData({ ...emptyFormData(), studentName: selectedStudent.name, groupName: selectedStudent.groupName, wechatGroupName: selectedStudent.groupName });
    setEditDialogOpen(true);
  }, [selectedStudent]);

  const handleEditRecord = useCallback((record: RecordView) => {
    setEditingRecord(record);
    setFormData({
      studentName: record.studentName, groupName: record.groupName,
      teachingDate: record.teachingDate, dayOfWeek: record.dayOfWeek,
      timePeriod: record.timePeriod, courseName: record.courseName,
      courseLink: record.courseLink, supervisionScript: record.supervisionScript,
      supervisionStatus: record.supervisionStatus, sourceFile: record.sourceFile,
      wechatGroupName: record.groupName,
    });
    setEditDialogOpen(true);
  }, []);

  const handleSaveRecord = useCallback(async () => {
    if (!formData.studentName.trim() || !selectedStudentId) return;
    try {
      const payload = {
        teachingDate: formData.teachingDate,
        dayOfWeek: formData.dayOfWeek,
        timePeriod: formData.timePeriod,
        courseName: formData.courseName,
        courseLink: formData.courseLink,
        supervisionScript: formData.supervisionScript,
        supervisionStatus: formData.supervisionStatus,
        sourceFile: formData.sourceFile,
        wechatGroupName: formData.wechatGroupName,
      };
      if (editingRecord) {
        await updateRecordApi(selectedStudentId, editingRecord.id, payload);
      } else {
        await apiCreateRecord(selectedStudentId, payload);
      }
      setEditDialogOpen(false);
      setEditingRecord(null);
      const recs = await fetchRecords(selectedStudentId);
      const student = students.find(s => s.id === selectedStudentId);
      if (student) {
        setSelectedRecords(recs.map(r => mapRecord(r, student.name, student.groupName)));
      }
      loadStudents(listPage, searchText);
    } catch (err) {
      console.error('Save record failed:', err);
    }
  }, [formData, editingRecord, selectedStudentId, students, loadStudents]);

  const handleDeleteRecordClick = useCallback((recordId: string) => {
    setDeletingRecordId(recordId);
    setRecordDeleteDialogOpen(true);
  }, []);

  const confirmDeleteRecord = useCallback(async () => {
    if (deletingRecordId && selectedStudentId) {
      try {
        await deleteRecordApi(selectedStudentId, deletingRecordId);
        const recs = await fetchRecords(selectedStudentId);
        const student = students.find(s => s.id === selectedStudentId);
        if (student) {
          setSelectedRecords(recs.map(r => mapRecord(r, student.name, student.groupName)));
        }
        loadStudents(listPage, searchText);
      } catch { /* ignore */ }
    }
    setRecordDeleteDialogOpen(false);
    setDeletingRecordId(null);
  }, [deletingRecordId, selectedStudentId, students, loadStudents]);

  const updateFormField = (field: string, value: string) => setFormData(prev => ({ ...prev, [field]: value }));

  return (
    <Box sx={{ display: 'flex', height: 'calc(100vh - 64px)', overflow: 'hidden' }}>
      {/* 左侧学员列表 — 白底 + 右侧 1px 分割线 */}
      <Box sx={{ width: 280, minWidth: 280, display: 'flex', flexDirection: 'column', borderRight: '1px solid #F0F0F0', backgroundColor: '#FFFFFF', boxShadow: '0 0 20px rgba(0,0,0,0.03)' }}>
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ mb: 1.5, fontWeight: 700, color: '#1F1F1F', fontSize: '1rem' }}>
            学员列表
            <Chip label={`${totalStudents}`} size="small" sx={{ ml: 1.5, backgroundColor: '#E8F0FE', color: '#2563EB', fontWeight: 600, borderRadius: '6px', height: '22px', fontSize: '0.72rem' }} />
          </Typography>
          <TextField
            fullWidth size="small" placeholder="输入姓名搜索，按回车确认" defaultValue={searchText}
            inputRef={searchInputRef}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchOutlined sx={{ fontSize: 18, color: '#86909C' }} /></InputAdornment>,
              endAdornment: searchText ? (
                <InputAdornment position="end">
                  <IconButton size="small" onClick={handleClearSearch} sx={{ p: 0.5, color: '#C9CDD4' }}>
                    <ClearOutlined sx={{ fontSize: 16 }} />
                  </IconButton>
                </InputAdornment>
              ) : null,
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '8px', paddingLeft: '8px', borderColor: '#E8E8E8', '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#C9CDD4' }, '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#2563EB' } } }}
          />
        </Box>
        <Divider sx={{ borderColor: '#F0F0F0' }} />
        <List sx={{ flex: 1, overflow: 'auto', py: 0.5, px: 0.5, position: 'relative' }}>
          {loading && (
            <Box sx={{ position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.7)', zIndex: 1 }}>
              <CircularProgress size={28} />
            </Box>
          )}
          {pagedStudents.length === 0 && !loading ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 6, color: '#86909C' }}>
              <PersonOutlined sx={{ fontSize: 48, mb: 1.5 }} />
              <Typography variant="body2">{searchText ? '未找到匹配的学员' : '请先导入Excel文件'}</Typography>
            </Box>
          ) : (
            pagedStudents.map((student) => {
              const isSelected = selectedStudentId === student.id;
              const avatarBg = getAvatarColor(student.name);
              return (
                <ListItemButton
                  key={student.id}
                  selected={isSelected}
                  onClick={() => setSelectedStudentId(student.id)}
                  sx={{
                    py: 1, px: 1.5, my: 0.25, borderRadius: '8px', transition: 'all 0.15s ease',
                    borderLeft: isSelected ? '4px solid #2563EB' : '4px solid transparent',
                    backgroundColor: isSelected ? '#F0F5FF' : 'transparent',
                    '&.Mui-selected': { backgroundColor: '#F0F5FF', '&:hover': { backgroundColor: '#F0F5FF' } },
                    '&:hover': { backgroundColor: isSelected ? '#F0F5FF' : '#F7F8FA' },
                  }}
                >
                  {/* Refined avatar with light tinted background */}
                  <Box sx={{
                    width: 32, height: 32, borderRadius: '8px', mr: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: `linear-gradient(135deg, ${avatarBg}18, ${avatarBg}30)`,
                    color: avatarBg, fontSize: 14, fontWeight: 700,
                  }}>
                    {student.name.charAt(0)}
                  </Box>
                  <ListItemText
                    primary={student.name}
                    secondary={student.groupName}
                    primaryTypographyProps={{ fontSize: 13, fontWeight: 700, color: '#1F1F1F', lineHeight: '1.3' }}
                    secondaryTypographyProps={{ fontSize: 11, sx: { color: '#86909C', mt: 0.25 } }}
                  />
                  <Typography variant="caption" sx={{ mr: 0.75, color: '#86909C', fontWeight: 600, fontSize: '0.7rem', backgroundColor: '#F7F8FA', px: 0.75, py: 0.25, borderRadius: '4px' }}>{student.recordCount}</Typography>
                  <IconButton size="small" sx={{ p: 0.5, color: '#C9CDD4', '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' } }} onClick={(e) => handleDeleteClick(student.id, e)}>
                    <DeleteOutlined sx={{ fontSize: 15 }} />
                  </IconButton>
                </ListItemButton>
              );
            })
          )}
        </List>
        {totalStudents > PAGE_SIZE && (
          <Box sx={{ borderTop: '1px solid #F0F0F0', py: 1.5, display: 'flex', justifyContent: 'center' }}>
            <Pagination count={totalPages} page={listPage} onChange={handlePageChange} size="small" color="primary" siblingCount={0} boundaryCount={1} />
          </Box>
        )}
      </Box>

      {/* 右侧详情 */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3.5 }}>
        {!selectedStudent ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
            <Paper elevation={0} sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', p: 6, borderRadius: '16px', border: '1px solid #F0F0F0', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
              <Box sx={{ width: 96, height: 96, borderRadius: '24px', background: 'linear-gradient(135deg, #E8F0FE 0%, #F0F5FF 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3 }}>
                <PersonOutlined sx={{ fontSize: 46, color: '#93B5F0' }} />
              </Box>
              <Typography variant="h5" sx={{ color: '#1F1F1F', fontWeight: 700, fontSize: '1.15rem', mb: 0.75 }}>请从左侧选择一位学员</Typography>
              <Typography variant="body2" sx={{ color: '#86909C', fontSize: '0.875rem' }}>查看学员详情和课表记录</Typography>
            </Paper>
          </Box>
        ) : (
          <Box sx={{ animation: 'fadeInUp 0.3s ease-out' }}>
            {/* 统计卡片 */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
              {[
                { icon: <MenuBookOutlined sx={{ fontSize: 20 }} />, label: '课程记录', value: getStudentSummary().totalCourses, color: '#2563EB' },
                { icon: <SchoolOutlined sx={{ fontSize: 20 }} />, label: '课程数', value: getStudentSummary().uniqueCourses, color: '#00A870' },
                { icon: <CalendarTodayOutlined sx={{ fontSize: 20 }} />, label: '最近上课', value: getStudentSummary().latestDate, color: '#FF8800' },
              ].map((item, idx) => (
                <Card key={idx} elevation={0} sx={{ flex: 1, borderRadius: '12px', border: '1px solid #F0F0F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
                  <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2, py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ color: item.color, display: 'flex', alignItems: 'center' }}>
                      {item.icon}
                    </Box>
                    <Box>
                      <Typography variant="body2" sx={{ fontSize: '0.75rem', color: '#86909C', mb: 0.25 }}>{item.label}</Typography>
                      <Typography variant="h5" sx={{ fontWeight: 700, color: '#1F1F1F', fontSize: '1.3rem', lineHeight: 1.2 }}>{item.value}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>

            {/* 学员信息卡片 */}
            <Paper elevation={0} sx={{ p: 2.5, mb: 3, display: 'flex', alignItems: 'center', gap: 2.5, borderRadius: '12px', border: '1px solid #F0F0F0', boxShadow: '0 1px 2px rgba(0,0,0,0.03)' }}>
              <Box sx={{
                width: 52, height: 52, borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: `linear-gradient(135deg, ${getAvatarColor(selectedStudent.name)}20, ${getAvatarColor(selectedStudent.name)}38)`,
                color: getAvatarColor(selectedStudent.name), fontSize: 22, fontWeight: 700,
              }}>
                {selectedStudent.name.charAt(0)}
              </Box>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 700, color: '#1F1F1F', fontSize: '1.05rem', mb: 0.25 }}>{selectedStudent.name}</Typography>
                <Typography variant="body2" sx={{ color: '#86909C', fontSize: '0.82rem' }}>
                  群名称：{selectedStudent.groupName} · 创建于：{selectedStudent.createdAt ? new Date(selectedStudent.createdAt).toLocaleDateString() : '-'}
                </Typography>
              </Box>
              <Box sx={{ ml: 'auto' }}>
                <Button variant="contained" size="small" startIcon={<AddOutlined />} onClick={handleAddRecord} sx={{ borderRadius: '8px', textTransform: 'none', boxShadow: 'none', '&:hover': { boxShadow: 'none' } }}>新增记录</Button>
              </Box>
            </Paper>

            <Box sx={{ mb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>课表记录</Typography>
              <Chip label={`${selectedRecords.length} 条`} size="small" sx={{ backgroundColor: '#F7F8FA', color: '#4E5969', fontWeight: 600, borderRadius: '4px' }} />
            </Box>
            {recordsLoading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} /></Box>
            ) : selectedRecords.length === 0 ? (
              <Paper elevation={0} sx={{ p: 4, textAlign: 'center', borderRadius: '12px', border: '1px solid #F0F0F0' }}>
                <Typography variant="body2" sx={{ color: '#86909C' }}>暂无课表记录，点击上方按钮新增</Typography>
              </Paper>
            ) : (
              <Stack spacing={1.5}>
                {selectedRecords.map((record) => {
                  const isExpanded = expandedRecordId === record.id;
                  return (
                    <Paper key={record.id} variant="outlined" sx={{
                      borderRadius: '12px', overflow: 'hidden', borderColor: isExpanded ? '#2563EB' : '#F0F0F0',
                      transition: 'all 0.2s ease', '&:hover': { borderColor: '#E0E0E0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)' },
                    }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, px: 2.5, py: 1.75, cursor: 'pointer', backgroundColor: isExpanded ? '#F8FAFF' : 'transparent', transition: 'background-color 0.15s ease' }}
                        onClick={() => setExpandedRecordId(isExpanded ? null : record.id)}>
                        <StatusChip status={record.supervisionStatus} />
                        <Typography variant="body2" fontWeight={600} sx={{ minWidth: 80 }}>{record.courseName}</Typography>
                        <Typography variant="body2" sx={{ color: '#4E5969', minWidth: 90 }}>{record.teachingDate}</Typography>
                        <Typography variant="body2" sx={{ color: '#86909C', minWidth: 80 }}>{record.timePeriod}</Typography>
                        <Typography variant="caption" sx={{ color: '#86909C' }}>{record.dayOfWeek}</Typography>
                        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                          {record.courseLink && (
                            <Tooltip title={record.courseLink}>
                              <IconButton size="small" component="a" href={record.courseLink.startsWith('http') ? record.courseLink : `http://${record.courseLink}`}
                                target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} sx={{ color: '#2563EB' }}>
                                <LinkOutlined fontSize="small" />
                              </IconButton>
                            </Tooltip>
                          )}
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleEditRecord(record); }} sx={{ '&:hover': { color: '#2563EB', backgroundColor: '#E8F0FE' } }}>
                            <EditOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" onClick={(e) => { e.stopPropagation(); handleDeleteRecordClick(record.id); }} sx={{ '&:hover': { color: '#EF4444', backgroundColor: '#FEF2F2' } }}>
                            <DeleteOutlined fontSize="small" />
                          </IconButton>
                          <IconButton size="small" sx={{ color: '#86909C' }}>
                            {isExpanded ? <ExpandLessOutlined fontSize="small" /> : <ExpandMoreOutlined fontSize="small" />}
                          </IconButton>
                        </Box>
                      </Box>
                      <Collapse in={isExpanded}>
                        <Divider />
                        <Box sx={{ px: 2.5, py: 2, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5, backgroundColor: '#FAFBFC' }}>
                          {record.courseLink && (
                            <Box sx={{ gridColumn: 'span 2' }}>
                              <Typography variant="caption" color="text.secondary">课程链接</Typography>
                              <MuiLink href={record.courseLink.startsWith('http') ? record.courseLink : `http://${record.courseLink}`}
                                target="_blank" rel="noopener noreferrer" sx={{ display: 'block', fontSize: '0.8rem', color: '#2563EB', wordBreak: 'break-all' }}>
                                {record.courseLink}
                              </MuiLink>
                            </Box>
                          )}
                          {record.supervisionScript && (
                            <Box sx={{ gridColumn: 'span 2' }}>
                              <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <ChatOutlined sx={{ fontSize: 14 }} /> 督学话术
                              </Typography>
                              <Paper variant="outlined" sx={{ mt: 0.5, p: 1.5, backgroundColor: '#FFFFFF', borderRadius: '8px', borderLeft: '3px solid #2563EB', borderColor: '#F0F0F0' }}>
                                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: '0.82rem', color: '#1F1F1F' }}>
                                  {record.supervisionScript}
                                </Typography>
                              </Paper>
                            </Box>
                          )}
                          <Box>
                            <Typography variant="caption" color="text.secondary">群名称</Typography>
                            <Typography variant="body2" fontWeight={500}>{record.groupName}</Typography>
                          </Box>
                          <Box>
                            <Typography variant="caption" color="text.secondary">来源</Typography>
                            <Typography variant="body2" sx={{ color: '#86909C', fontSize: '0.8rem' }}>{record.sourceFile}</Typography>
                          </Box>
                        </Box>
                      </Collapse>
                    </Paper>
                  );
                })}
              </Stack>
            )}
          </Box>
        )}
      </Box>

      {/* 删除确认 — 带 WarningOutlined 图标 */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberOutlined sx={{ color: '#EF4444' }} />
            确认删除
          </Box>
        </DialogTitle>
        <DialogContent><Typography>确定要删除该学员档案吗？所有相关的课表记录也将被删除，此操作不可撤销。</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">删除</Button>
        </DialogActions>
      </Dialog>

      {/* 编辑/新增记录 */}
      <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingRecord ? '编辑记录' : '新增记录'}</DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="学员姓名" size="small" value={formData.studentName}
                onChange={(e) => updateFormField('studentName', e.target.value)} required disabled={!!editingRecord} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="群名称" size="small" value={formData.groupName}
                onChange={(e) => updateFormField('groupName', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="授课日期" size="small" type="date" value={formData.teachingDate}
                onChange={(e) => updateFormField('teachingDate', e.target.value)} InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth size="small"><InputLabel>星期</InputLabel>
                <Select value={formData.dayOfWeek} label="星期" onChange={(e) => updateFormField('dayOfWeek', e.target.value)}>
                  <MenuItem value="">请选择</MenuItem>
                  {WEEKDAY_OPTIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="时间段" size="small" placeholder="如: 11:00-18:55" value={formData.timePeriod}
                onChange={(e) => updateFormField('timePeriod', e.target.value)} />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField fullWidth label="课程名称" size="small" value={formData.courseName}
                onChange={(e) => updateFormField('courseName', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="课程链接" size="small" value={formData.courseLink}
                onChange={(e) => updateFormField('courseLink', e.target.value)} />
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="督学话术" size="small" multiline rows={3} value={formData.supervisionScript}
                onChange={(e) => updateFormField('supervisionScript', e.target.value)} />
            </Grid>
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
          <Button onClick={handleSaveRecord} variant="contained" disabled={!formData.studentName.trim()}>
            {editingRecord ? '保存' : '添加'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 删除记录确认 */}
      <Dialog open={recordDeleteDialogOpen} onClose={() => setRecordDeleteDialogOpen(false)}>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <WarningAmberOutlined sx={{ color: '#EF4444' }} />
            确认删除
          </Box>
        </DialogTitle>
        <DialogContent><Typography>确定要删除这条课表记录吗？此操作不可撤销。</Typography></DialogContent>
        <DialogActions>
          <Button onClick={() => setRecordDeleteDialogOpen(false)}>取消</Button>
          <Button onClick={confirmDeleteRecord} color="error" variant="contained">删除</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default StudentPage;
