package com.zgwx.supervise.web.controller;

import com.zgwx.supervise.domain.entity.CourseSchedule;
import com.zgwx.supervise.repository.CourseScheduleRepository;
import com.zgwx.supervise.service.ExcelImportService;
import com.zgwx.supervise.service.TaskSchedulerService;
import com.zgwx.supervise.web.dto.ApiResponse;
import com.zgwx.supervise.web.dto.ImportResultDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/schedules")
@RequiredArgsConstructor
public class ScheduleController {

    private final ExcelImportService excelImportService;
    private final CourseScheduleRepository courseScheduleRepository;
    private final TaskSchedulerService taskSchedulerService;

    /** 上传并解析Excel课表 */
    @PostMapping("/import")
    public ApiResponse<ImportResultDTO> importSchedule(
            @RequestParam("file") MultipartFile file) throws Exception {
        ImportResultDTO result = excelImportService.importFromFile(file);
        return ApiResponse.success(result);
    }

    /**
     * 批量导入：指定服务器本地文件夹路径，解析其中所有 .xlsx/.xls 文件
     * 请求体：{ "folderPath": "C:/course_excel" }
     */
    @PostMapping("/import-folder")
    public ApiResponse<ImportResultDTO> importFolder(
            @RequestBody java.util.Map<String, String> body) {
        String folderPath = body.get("folderPath");
        if (folderPath == null || folderPath.isBlank()) {
            return ApiResponse.error(400, "folderPath 不能为空");
        }
        try {
            ImportResultDTO result = excelImportService.importFromFolder(folderPath);
            return ApiResponse.success(result);
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(400, e.getMessage());
        } catch (Exception e) {
            return ApiResponse.error(500, "文件夹导入失败: " + e.getMessage());
        }
    }

    /** 查询课程列表 */
    @GetMapping
    public ApiResponse<List<CourseSchedule>> listSchedules(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        List<CourseSchedule> list;
        if (date != null) {
            list = courseScheduleRepository.findByCourseDate(date);
        } else {
            list = courseScheduleRepository.findAll();
        }
        return ApiResponse.success(list);
    }

    /** 删除课程（同步取消Quartz Job） */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteSchedule(@PathVariable Long id) {
        // 取消关联任务
        courseScheduleRepository.findById(id).ifPresent(cs -> {
            // TODO: 取消该课程的所有关联任务
        });
        courseScheduleRepository.deleteById(id);
        return ApiResponse.success();
    }
}
