/** 课表记录 — 用于督学页面 */
export interface ScheduleRecord {
  id: string;
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
