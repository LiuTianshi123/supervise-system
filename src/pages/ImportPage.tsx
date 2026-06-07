import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Paper, Button, Alert, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Chip, CircularProgress,
  FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import CloudUploadOutlined from '@mui/icons-material/CloudUploadOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import CheckCircleOutlined from '@mui/icons-material/CheckCircleOutlined';
import { parseExcelFile, extractStudentName, parseFolder, ParsedExcelRecord } from '../excelParser';
import { importRecords, fetchGroups, fetchMyGroups, ApiGroup } from '../dataApi';
import { getStatusColor } from '../utils';
import { getStoredUser } from '../auth';
import PageHeader from '../components/PageHeader';
import StatusChip from '../components/StatusChip';

const ImportPage: React.FC = () => {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);
  const [previewRecords, setPreviewRecords] = useState<(ParsedExcelRecord & { studentName: string; sourceFile: string })[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // 分组选择
  const [groups, setGroups] = useState<ApiGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number>(0);

  useEffect(() => {
    const user = getStoredUser();
    const load = async () => {
      try {
        const gs = user?.role === 'admin'
          ? await fetchGroups()
          : await fetchMyGroups();
        setGroups(gs);
        if (gs.length > 0 && selectedGroupId === 0) setSelectedGroupId(gs[0].id);
      } catch { /* ignore */ }
    };
    load();
  }, []);

  /** 处理单文件导入 */
  const handleFileImport = useCallback(
    async (file: File) => {
      const ext = file.name.toLowerCase();
      if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) {
        setMessage({ type: 'error', text: '请上传 .xlsx 或 .xls 格式的 Excel 文件' });
        return;
      }
      setImporting(true);
      setMessage(null);
      try {
        const records = await parseExcelFile(file);
        const studentName = extractStudentName(file.name);
        if (records.length === 0) {
          setMessage({ type: 'info', text: `文件 ${file.name} 中没有找到有效的课表数据` });
          setImporting(false);
          return;
        }
        setPreviewRecords(records.map((r) => ({ ...r, studentName, sourceFile: file.name })));
        setMessage({ type: 'success', text: `成功解析文件 ${file.name}，共 ${records.length} 条记录，选择分组后确认导入` });
      } catch (err) {
        setMessage({ type: 'error', text: `解析文件失败: ${(err as Error).message}` });
      } finally {
        setImporting(false);
      }
    },
    []
  );

  /** 确认导入 — 发送到后端 API */
  const handleConfirmImport = useCallback(async () => {
    if (previewRecords.length === 0) return;
    if (!selectedGroupId) {
      setMessage({ type: 'error', text: '请选择导入分组' });
      return;
    }
    setImporting(true);
    try {
      const fileGroups = new Map<string, typeof previewRecords>();
      previewRecords.forEach((r) => {
        const key = r.sourceFile;
        if (!fileGroups.has(key)) fileGroups.set(key, []);
        fileGroups.get(key)!.push(r);
      });

      let totalStudents = 0;
      let totalRecords = 0;

      for (const [sourceFile, records] of fileGroups) {
        const groupName = records[0]?.groupName || '';
        const importRecords_list = records.map(({ studentName: _, sourceFile: _sf, ...rest }) => ({
          ...rest,
          studentName: records[0]?.studentName,
          groupName: rest.groupName || groupName,
          supervisionStatus: rest.supervisionStatus || '课前30分钟发送',
        }));
        const result = await importRecords(
          importRecords_list,
          selectedGroupId,
          groupName,
          sourceFile,
        );
        totalStudents += result.newStudents;
        totalRecords += result.newRecords;
      }

      setPreviewRecords([]);
      setMessage({
        type: 'success',
        text: `导入成功！新增 ${totalStudents} 个学员，${totalRecords} 条课表记录。数据已同步到服务器，所有用户可见。`,
      });
    } catch (err) {
      setMessage({ type: 'error', text: `导入失败: ${(err as Error).message}` });
    } finally {
      setImporting(false);
    }
  }, [previewRecords, selectedGroupId]);

  /** 处理文件输入 */
  const handleFileInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      if (files.length === 1) {
        handleFileImport(files[0]);
      } else {
        handleMultipleFiles(Array.from(files));
      }
      e.target.value = '';
    },
    [handleFileImport]
  );

  /** 处理多文件导入 */
  const handleMultipleFiles = useCallback(
    async (files: File[]) => {
      setImporting(true);
      setMessage(null);
      try {
        const results = await parseFolder(files);
        if (results.length === 0) {
          setMessage({ type: 'info', text: '未找到有效的 Excel 文件' });
          setImporting(false);
          return;
        }
        const allRecords: typeof previewRecords = [];
        let totalRecords = 0;
        results.forEach(({ fileName, studentName, records }) => {
          records.forEach((r) => {
            allRecords.push({ ...r, studentName, sourceFile: fileName });
          });
          totalRecords += records.length;
        });
        setPreviewRecords(allRecords);
        setMessage({
          type: 'success',
          text: `成功解析 ${results.length} 个文件，共 ${totalRecords} 条记录，选择分组后确认导入`,
        });
      } catch (err) {
        setMessage({ type: 'error', text: `批量导入失败: ${(err as Error).message}` });
      } finally {
        setImporting(false);
      }
    },
    []
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const files = Array.from(e.dataTransfer.files);
      if (files.length === 1) {
        handleFileImport(files[0]);
      } else {
        handleMultipleFiles(files);
      }
    },
    [handleFileImport, handleMultipleFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback(() => { setDragOver(false); }, []);

  const handleFolderInput = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files || files.length === 0) return;
      handleMultipleFiles(Array.from(files));
      e.target.value = '';
    },
    [handleMultipleFiles]
  );

  return (
    <Box sx={{ p: 3, maxWidth: 1200, mx: 'auto' }}>
      <PageHeader
        title="导入管理"
        subtitle="上传 Excel 课表文件，自动解析督学数据"
        icon={<CloudUploadOutlined sx={{ fontSize: 22 }} />}
      />

      {message && (
        <Alert severity={message.type} sx={{ mb: 3, borderRadius: '12px' }} onClose={() => setMessage(null)}>
          {message.text}
        </Alert>
      )}

      {/* 分组选择 */}
      <Paper sx={{ p: 2, mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="body2" fontWeight={600} sx={{ color: '#1F1F1F' }}>导入到分组：</Typography>
        <FormControl size="small" sx={{ minWidth: 240 }}>
          <InputLabel>选择分组</InputLabel>
          <Select
            value={selectedGroupId || ''}
            label="选择分组"
            onChange={(e) => setSelectedGroupId(Number(e.target.value))}
          >
            {groups.map((g) => (
              <MenuItem key={g.id} value={g.id}>
                {g.name} ({g.studentCount} 学员)
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Paper>

      {/* 上传区域 — 白底 + 虚线边框 */}
      <Paper
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        sx={{
          p: 6, textAlign: 'center',
          border: dragOver ? '1px dashed #2563EB' : '1px dashed #C9CDD4',
          borderRadius: '12px',
          background: dragOver ? '#E8F0FE' : '#FFFFFF',
          transition: 'all 0.3s ease',
          mb: 3, cursor: 'pointer',
          '&:hover': {
            borderColor: '#2563EB',
            background: '#FAFBFC',
          },
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        {importing ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <CircularProgress size={48} sx={{ color: '#2563EB' }} />
            <Typography sx={{ color: '#4E5969' }}>正在处理...</Typography>
          </Box>
        ) : (
          <>
            <CloudUploadOutlined sx={{ fontSize: 36, color: dragOver ? '#2563EB' : '#86909C', mb: 2, transition: 'color 0.2s ease' }} />
            <Typography variant="h6" sx={{ mb: 1, fontWeight: 600, color: '#1F1F1F', fontSize: '1rem' }}>
              拖拽 Excel 文件到此处
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              或者 <Box component="span" sx={{ color: '#2563EB', fontWeight: 600, cursor: 'pointer' }}>点击选择文件</Box>
            </Typography>
            <Box sx={{ display: 'flex', gap: 1, justifyContent: 'center' }}>
              <Chip icon={<DescriptionOutlined sx={{ fontSize: 16 }} />} label=".xlsx" size="small" variant="outlined" sx={{ borderColor: '#C9CDD4', color: '#4E5969', borderRadius: '4px' }} />
              <Chip icon={<DescriptionOutlined sx={{ fontSize: 16 }} />} label=".xls" size="small" variant="outlined" sx={{ borderColor: '#C9CDD4', color: '#4E5969', borderRadius: '4px' }} />
            </Box>
          </>
        )}
        <input id="file-input" type="file" accept=".xlsx,.xls" multiple hidden onChange={handleFileInput} />
      </Paper>

      {/* 文件夹上传 */}
      <Box sx={{ mb: 3 }}>
        <Button
          variant="outlined"
          startIcon={<FolderOpenOutlined />}
          component="label"
          sx={{ borderColor: '#C9CDD4', color: '#4E5969', '&:hover': { borderColor: '#2563EB', color: '#2563EB', backgroundColor: '#E8F0FE' } }}
        >
          上传文件夹（批量导入）
          {/* @ts-expect-error webkitdirectory is not in the type definitions */}
          <input type="file" webkitdirectory="" directory="" hidden onChange={handleFolderInput} />
        </Button>
      </Box>

      {/* 预览区域 */}
      {previewRecords.length > 0 && (
        <Paper sx={{ p: 3, mb: 2, animation: 'fadeInUp 0.4s ease-out' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
            <CheckCircleOutlined sx={{ color: '#00A870', fontSize: 24 }} />
            <Typography variant="h6" sx={{ fontWeight: 600, fontSize: '1rem' }}>
              数据预览
              <Chip label={`${previewRecords.length} 条`} size="small" sx={{ ml: 1.5, backgroundColor: '#E8F6F0', color: '#00A870', borderRadius: '4px' }} />
            </Typography>
          </Box>
          <TableContainer sx={{ maxHeight: 400, borderRadius: '12px', border: '1px solid #E5E6EB' }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>学员姓名</TableCell>
                  <TableCell>群名称</TableCell>
                  <TableCell>授课日期</TableCell>
                  <TableCell>星期</TableCell>
                  <TableCell>时间段</TableCell>
                  <TableCell>课程名称</TableCell>
                  <TableCell>督学情况</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {previewRecords.map((r, idx) => (
                  <TableRow key={idx}>
                    <TableCell><Typography variant="body2" fontWeight={500}>{r.studentName}</Typography></TableCell>
                    <TableCell>{r.groupName}</TableCell>
                    <TableCell>{r.teachingDate}</TableCell>
                    <TableCell>{r.dayOfWeek}</TableCell>
                    <TableCell>{r.timePeriod}</TableCell>
                    <TableCell>{r.courseName}</TableCell>
                    <TableCell><StatusChip status={r.supervisionStatus} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>

          <Box sx={{ mt: 2, display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
            <Button variant="outlined" onClick={() => setPreviewRecords([])}
              sx={{ borderColor: '#C9CDD4', color: '#4E5969' }}>
              取消
            </Button>
            <Button variant="contained" onClick={handleConfirmImport} disabled={importing}>
              {importing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null}
              确认导入
            </Button>
          </Box>
        </Paper>
      )}
    </Box>
  );
};

export default ImportPage;
