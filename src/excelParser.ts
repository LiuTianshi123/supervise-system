import * as XLSX from 'xlsx';
import { ScheduleRecord } from './types';
import { excelDateToString } from './utils';

/** Excel 行数据原始类型 */
interface ExcelRow {
  [key: string]: string | number | boolean | undefined;
}

/** 解析列名映射 - 支持多种可能的表头写法 */
const COLUMN_MAP: Record<string, string[]> = {
  studentName: ['学员姓名', '姓名', '学生姓名'],
  groupName: ['学员群名称', '群名称', '群名'],
  teachingDate: ['授课时间', '上课日期', '日期', '授课日期'],
  dayOfWeek: ['星期', '周几', '星期几'],
  timePeriod: ['时间段', '上课时间', '时段'],
  courseName: ['课程名称', '课程', '课名'],
  courseLink: ['课程链接', '链接', '课程地址'],
  supervisionScript: ['督学话术', '话术', '督学内容'],
  supervisionStatus: ['督学情况', '发送情况', '情况', '状态'],
};

/** 根据 Excel 表头自动匹配列映射 */
function buildColumnMapping(headers: string[]): Record<string, number> {
  const mapping: Record<string, number> = {};
  for (const [field, candidates] of Object.entries(COLUMN_MAP)) {
    const idx = headers.findIndex((h) =>
      candidates.some((c) => h.trim().includes(c))
    );
    if (idx >= 0) {
      mapping[field] = idx;
    }
  }
  return mapping;
}

/** Excel 解析后的记录类型（包含 groupName，不包含需要自动填充的字段） */
export type ParsedExcelRecord = Omit<ScheduleRecord, 'id' | 'studentName' | 'sourceFile' | 'importedAt'>;

/** 解析单个 Excel 文件，返回课表记录数组 */
export function parseExcelFile(
  file: File
): Promise<ParsedExcelRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });

        // 优先找 "表格全文" sheet，否则用第一个 sheet
        const sheetName = workbook.SheetNames.includes('表格全文')
          ? '表格全文'
          : workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        if (!worksheet) {
          resolve([]);
          return;
        }

        // 转为二维数组
        const rows: ExcelRow[] = XLSX.utils.sheet_to_json(worksheet, {
          header: 1,
          defval: '',
        }) as unknown as ExcelRow[];

        if (rows.length < 2) {
          resolve([]);
          return;
        }

        // 第一行作为表头
        const headers = (rows[0] as unknown as string[]).map((h) =>
          String(h ?? '').trim()
        );
        const colMapping = buildColumnMapping(headers);

        const records: ParsedExcelRecord[] = [];

        // 从第二行开始解析数据
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i] as unknown as (string | number | boolean | undefined)[];
          if (!row || row.length === 0) continue;

          // 跳过全空行
          const hasData = row.some(
            (cell) => cell !== undefined && cell !== null && cell !== ''
          );
          if (!hasData) continue;

          const teachingDateRaw =
            colMapping.teachingDate !== undefined
              ? row[colMapping.teachingDate]
              : '';
          let teachingDate = '';
          if (typeof teachingDateRaw === 'number') {
            teachingDate = excelDateToString(teachingDateRaw);
          } else if (typeof teachingDateRaw === 'string' && teachingDateRaw) {
            teachingDate = teachingDateRaw;
          }

          const groupName =
            colMapping.groupName !== undefined
              ? String(row[colMapping.groupName] ?? '')
              : '';

          const record = {
            teachingDate,
            dayOfWeek:
              colMapping.dayOfWeek !== undefined
                ? String(row[colMapping.dayOfWeek] ?? '')
                : '',
            timePeriod:
              colMapping.timePeriod !== undefined
                ? String(row[colMapping.timePeriod] ?? '')
                : '',
            courseName:
              colMapping.courseName !== undefined
                ? String(row[colMapping.courseName] ?? '')
                : '',
            courseLink:
              colMapping.courseLink !== undefined
                ? String(row[colMapping.courseLink] ?? '')
                : '',
            supervisionScript:
              colMapping.supervisionScript !== undefined
                ? String(row[colMapping.supervisionScript] ?? '')
                : '',
            supervisionStatus:
              colMapping.supervisionStatus !== undefined
                ? String(row[colMapping.supervisionStatus] ?? '')
                : '',
            groupName,
          };

          records.push(record);
        }

        resolve(records);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('文件读取失败'));
    reader.readAsArrayBuffer(file);
  });
}

/** 从文件名提取学员姓名（去掉扩展名） */
export function extractStudentName(fileName: string): string {
  return fileName.replace(/\.(xlsx|xls)$/i, '').trim();
}

/** 解析文件夹中的所有 Excel 文件 */
export async function parseFolder(
  files: File[]
): Promise<
  {
    fileName: string;
    studentName: string;
    records: ParsedExcelRecord[];
  }[]
> {
  const results: {
    fileName: string;
    studentName: string;
    records: ParsedExcelRecord[];
  }[] = [];

  for (const file of files) {
    const ext = file.name.toLowerCase();
    if (!ext.endsWith('.xlsx') && !ext.endsWith('.xls')) continue;

    try {
      const records = await parseExcelFile(file);
      const studentName = extractStudentName(file.name);
      results.push({
        fileName: file.name,
        studentName,
        records,
      });
    } catch (err) {
      console.error(`解析文件 ${file.name} 失败:`, err);
    }
  }

  return results;
}
