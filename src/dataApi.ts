/**
 * 数据 API 层 — 替代 old storage.ts，所有数据操作走后端 API
 */
import { authGet, authPost, authPut, authDelete, getToken } from './auth';

// ============================================================
// 类型定义 (与后端 API 对齐)
// ============================================================

export interface ApiStudent {
  id: string;
  name: string;
  wechat_group_name: string;
  data_group_id: number;
  record_count: number;
  created_at: string;
  created_by: number | null;
}

export interface ApiStudentsResponse {
  students: ApiStudent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ApiRecord {
  id: string;
  student_id: string;
  teaching_date: string;
  day_of_week: string;
  time_period: string;
  course_name: string;
  course_link: string;
  supervision_script: string;
  supervision_status: string;
  wechat_group_name: string;
  source_file: string;
  imported_at: string;
  imported_by: number | null;
}

export interface ApiGroup {
  id: number;
  name: string;
  description: string;
  memberCount: number;
  studentCount: number;
}

// ============================================================
// 学生 API
// ============================================================

export interface FetchStudentsParams {
  page?: number;
  pageSize?: number;
  keyword?: string;
  groupId?: number;
}

export async function fetchStudents(params?: FetchStudentsParams): Promise<ApiStudentsResponse> {
  const query = new URLSearchParams();
  if (params?.page) query.set('page', String(params.page));
  if (params?.pageSize) query.set('pageSize', String(params.pageSize));
  if (params?.keyword) query.set('keyword', params.keyword);
  if (params?.groupId) query.set('groupId', String(params.groupId));
  const qs = query.toString();
  return authGet(`/api/students${qs ? '?' + qs : ''}`);
}

export async function fetchStudent(id: string): Promise<ApiStudent> {
  return authGet(`/api/students/${id}`);
}

export async function fetchStudentsByGroup(groupId: number): Promise<ApiStudentsResponse> {
  return fetchStudents({ groupId, pageSize: 200 });
}

export async function createStudent(name: string, groupId: number, wechatGroup?: string): Promise<ApiStudent> {
  return authPost('/api/students', { name, dataGroupId: groupId, wechatGroupName: wechatGroup || '' });
}

export async function updateStudent(id: string, data: Partial<ApiStudent>): Promise<ApiStudent> {
  return authPut(`/api/students/${id}`, data);
}

export async function deleteStudentApi(id: string): Promise<void> {
  await authDelete(`/api/students/${id}`);
}

// ============================================================
// 课表记录 API
// ============================================================

export async function fetchRecords(studentId: string): Promise<ApiRecord[]> {
  const data = await authGet(`/api/students/${studentId}/records`);
  return Array.isArray(data) ? data : (data.records || []);
}

export async function createRecord(studentId: string, record: Record<string, any>): Promise<ApiRecord> {
  return authPost(`/api/students/${studentId}/records`, record);
}

export async function updateRecordApi(studentId: string, recordId: string, data: Record<string, any>): Promise<ApiRecord> {
  return authPut(`/api/students/${studentId}/records/${recordId}`, data);
}

export async function deleteRecordApi(studentId: string, recordId: string): Promise<void> {
  await authDelete(`/api/students/${studentId}/records/${recordId}`);
}

// ============================================================
// 导入 API
// ============================================================

export interface ImportResult {
  success: boolean;
  newStudents: number;
  newRecords: number;
}

export interface ImportRecord {
  studentName: string;
  groupName?: string;
  teachingDate: string;
  dayOfWeek: string;
  timePeriod: string;
  courseName: string;
  courseLink?: string;
  supervisionScript?: string;
  supervisionStatus: string;
}

export async function importRecords(
  records: ImportRecord[],
  dataGroupId: number,
  wechatGroupName: string,
  sourceFile: string,
): Promise<ImportResult> {
  const payload = {
    records: records.map(r => ({
      studentName: r.studentName,
      groupName: r.groupName || wechatGroupName,
      teachingDate: r.teachingDate,
      dayOfWeek: r.dayOfWeek,
      timePeriod: r.timePeriod,
      courseName: r.courseName,
      courseLink: r.courseLink || '',
      supervisionScript: r.supervisionScript || '',
      supervisionStatus: r.supervisionStatus,
    })),
    dataGroupId,
    wechatGroupName,
    sourceFile,
  };
  return authPost('/api/import', payload);
}

// ============================================================
// 分组 API
// ============================================================

export async function fetchGroups(): Promise<ApiGroup[]> {
  const data = await authGet('/api/admin/groups');
  return Array.isArray(data) ? data : (data.groups || []);
}

export async function fetchMyGroups(): Promise<ApiGroup[]> {
  const data = await authGet('/api/my-groups');
  return Array.isArray(data) ? data : (data.groups || []);
}

export async function fetchAllRecords(): Promise<ApiRecord[]> {
  const data = await authGet('/api/all-records');
  return Array.isArray(data) ? data : (data.records || []);
}

export async function fetchStats(): Promise<any> {
  return authGet('/api/stats');
}
