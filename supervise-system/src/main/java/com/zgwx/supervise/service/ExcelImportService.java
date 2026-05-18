package com.zgwx.supervise.service;

import com.zgwx.supervise.domain.entity.CourseSchedule;
import com.zgwx.supervise.repository.CourseScheduleRepository;
import com.zgwx.supervise.util.TimeUtil;
import com.zgwx.supervise.web.dto.ImportResultDTO;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.apache.poi.ss.usermodel.*;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.InputStream;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

/**
 * Excel 导入服务
 *
 * <p>模版格式（第1行为标题，第2行起为数据）：
 * <pre>
 * A：学员姓名
 * B：学员群名称
 * C：授课时间（日期）
 * D：星期
 * E：时间段（HH:mm-HH:mm）
 * F：课程名称
 * G：课程链接（可空）
 * H：督学话术（可空，自定义消息模板）
 * </pre>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExcelImportService {

    private final CourseScheduleRepository courseScheduleRepository;
    private final TaskSchedulerService taskSchedulerService;

    private static final DateTimeFormatter BATCH_FMT =
            DateTimeFormatter.ofPattern("yyyyMMdd_HHmmss");

    // ─────────────────────────── 单文件导入 ───────────────────────────

    public ImportResultDTO importFromFile(MultipartFile file) throws Exception {
        String batchId = java.time.LocalDateTime.now().format(BATCH_FMT);
        List<ImportResultDTO.RowError> errors = new ArrayList<>();
        List<CourseSchedule> successList = new ArrayList<>();
        int totalRows = 0;

        try (InputStream is = file.getInputStream();
             Workbook workbook = WorkbookFactory.create(is)) {

            Sheet sheet = workbook.getSheetAt(0);
            for (Row row : sheet) {
                if (row.getRowNum() == 0) continue; // 跳过标题行
                if (isEmptyRow(row)) continue;
                totalRows++;

                try {
                    CourseSchedule cs = parseRow(row, batchId);
                    successList.add(cs);
                } catch (Exception e) {
                    errors.add(new ImportResultDTO.RowError(
                            row.getRowNum() + 1, e.getMessage()));
                    log.warn("第{}行解析失败：{}", row.getRowNum() + 1, e.getMessage());
                }
            }
        }

        if (!successList.isEmpty()) {
            courseScheduleRepository.saveAll(successList);
            taskSchedulerService.scheduleTasksForBatch(successList);
        }

        ImportResultDTO result = new ImportResultDTO();
        result.setBatchId(batchId);
        result.setTotalRows(totalRows);
        result.setSuccessCount(successList.size());
        result.setErrorCount(errors.size());
        result.setErrors(errors);
        return result;
    }

    // ─────────────────────────── 文件夹批量导入 ───────────────────────────

    public ImportResultDTO importFromFolder(String folderPath) {
        ImportResultDTO overall = new ImportResultDTO();
        overall.setBatchId(java.time.LocalDateTime.now().format(BATCH_FMT));
        List<ImportResultDTO.FileResult> fileResults = new ArrayList<>();
        List<ImportResultDTO.RowError> allErrors = new ArrayList<>();

        int totalRows = 0;
        int successCount = 0;
        int errorCount = 0;

        File folder = new File(folderPath);
        if (!folder.exists() || !folder.isDirectory()) {
            throw new IllegalArgumentException("文件夹不存在或不是有效目录: " + folderPath);
        }

        File[] files = folder.listFiles((dir, name) ->
                name.toLowerCase().endsWith(".xlsx") || name.toLowerCase().endsWith(".xls"));

        if (files == null || files.length == 0) {
            throw new IllegalArgumentException("文件夹中没有找到 Excel 文件: " + folderPath);
        }

        for (File file : files) {
            ImportResultDTO.FileResult fr = new ImportResultDTO.FileResult(file.getName());
            try (InputStream is = new FileInputStream(file);
                 Workbook workbook = WorkbookFactory.create(is)) {

                List<ImportResultDTO.RowError> rowErrors = new ArrayList<>();
                List<CourseSchedule> successList = new ArrayList<>();
                Sheet sheet = workbook.getSheetAt(0);

                for (Row row : sheet) {
                    if (row.getRowNum() == 0) continue;
                    if (isEmptyRow(row)) continue;
                    totalRows++;

                    try {
                        CourseSchedule cs = parseRow(row, overall.getBatchId());
                        successList.add(cs);
                    } catch (Exception e) {
                        ImportResultDTO.RowError re = new ImportResultDTO.RowError(
                                row.getRowNum() + 1, e.getMessage());
                        rowErrors.add(re);
                        log.warn("文件[{}] 第{}行解析失败：{}", file.getName(),
                                row.getRowNum() + 1, e.getMessage());
                    }
                }

                if (!successList.isEmpty()) {
                    courseScheduleRepository.saveAll(successList);
                    taskSchedulerService.scheduleTasksForBatch(successList);
                }

                fr.setTotalRows(successList.size() + rowErrors.size());
                fr.setSuccessCount(successList.size());
                fr.setErrorCount(rowErrors.size());
                fr.setErrors(rowErrors);
                allErrors.addAll(rowErrors);
                successCount += successList.size();
                errorCount += rowErrors.size();

            } catch (Exception e) {
                fr.setErrorMessage("文件读取失败: " + e.getMessage());
                fr.setTotalRows(0);
                fr.setSuccessCount(0);
                fr.setErrorCount(0);
                log.error("处理文件[{}]时出错：{}", file.getName(), e.getMessage());
            }
            fileResults.add(fr);
        }

        overall.setFileResults(fileResults);
        overall.setTotalRows(totalRows);
        overall.setSuccessCount(successCount);
        overall.setErrorCount(errorCount);
        overall.setErrors(allErrors);
        return overall;
    }

    // ─────────────────────────── 行解析（对齐模版）───────────────────────────

    /**
     * 解析一行数据，列对应关系：
     * A(0)=学员姓名  B(1)=学员群名称  C(2)=授课时间  D(3)=星期
     * E(4)=时间段    F(5)=课程名称    G(6)=课程链接  H(7)=督学话术
     */
    private CourseSchedule parseRow(Row row, String batchId) {
        CourseSchedule cs = new CourseSchedule();
        cs.setImportBatchId(batchId);

        // A列：学员姓名（必填）
        String studentName = getCellString(row, 0);
        if (studentName == null || studentName.isBlank()) {
            throw new IllegalArgumentException("学员姓名不能为空");
        }
        cs.setStudentName(studentName);

        // B列：学员群名称（必填）
        String groupName = getCellString(row, 1);
        if (groupName == null || groupName.isBlank()) {
            throw new IllegalArgumentException("学员群名称不能为空");
        }
        cs.setGroupName(groupName);

        // C列：授课时间（必填，日期）
        LocalDate courseDate = parseDateCell(row.getCell(2));
        if (courseDate == null) {
            throw new IllegalArgumentException("授课时间格式错误，期望日期，实际："
                    + getCellString(row, 2));
        }
        cs.setCourseDate(courseDate);

        // D列：星期（可空，系统可自动计算）
        cs.setWeekDay(getCellString(row, 3));

        // E列：时间段 "HH:mm-HH:mm"（必填）
        String timeSlot = getCellString(row, 4);
        if (timeSlot == null || timeSlot.isBlank()) {
            throw new IllegalArgumentException("时间段不能为空");
        }
        // 记录原始时间段字符串
        cs.setTimeSlot(timeSlot);
        // 解析起止时间
        try {
            LocalTime[] times = TimeUtil.parseTimeSlot(timeSlot);
            cs.setStartTime(times[0]);
            cs.setEndTime(times[1]);
        } catch (Exception e) {
            throw new IllegalArgumentException("时间段格式错误，期望 HH:mm-HH:mm，实际：" + timeSlot);
        }

        // F列：课程名称（必填）
        String courseName = getCellString(row, 5);
        if (courseName == null || courseName.isBlank()) {
            throw new IllegalArgumentException("课程名称不能为空");
        }
        cs.setCourseName(courseName);

        // G列：课程链接（可空）
        cs.setCourseLink(getCellString(row, 6));

        // H列：督学话术（可空，用户自定义消息模板）
        cs.setMessageTemplate(getCellString(row, 7));

        return cs;
    }

    // ─────────────────────────── 工具方法 ───────────────────────────

    private String getCellString(Row row, int col) {
        Cell cell = row.getCell(col, Row.MissingCellPolicy.RETURN_BLANK_AS_NULL);
        if (cell == null) return null;
        DataFormatter formatter = new DataFormatter();
        return formatter.formatCellValue(cell).trim();
    }

    private LocalDate parseDateCell(Cell cell) {
        if (cell == null) return null;
        // Excel 日期格式（数值型）
        if (cell.getCellType() == CellType.NUMERIC && DateUtil.isCellDateFormatted(cell)) {
            Date d = cell.getDateCellValue();
            return d.toInstant().atZone(java.time.ZoneId.systemDefault()).toLocalDate();
        }
        // 字符串格式
        String str = new DataFormatter().formatCellValue(cell).trim();
        return (LocalDate) TimeUtil.parseDate(str);
    }

    private boolean isEmptyRow(Row row) {
        for (Cell cell : row) {
            if (cell != null && cell.getCellType() != CellType.BLANK) {
                String val = new DataFormatter().formatCellValue(cell).trim();
                if (!val.isEmpty()) return false;
            }
        }
        return true;
    }
}
