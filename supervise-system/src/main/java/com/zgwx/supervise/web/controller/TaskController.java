package com.zgwx.supervise.web.controller;

import com.zgwx.supervise.domain.entity.CourseSchedule;
import com.zgwx.supervise.domain.entity.SendTask;
import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.repository.CourseScheduleRepository;
import com.zgwx.supervise.repository.SendTaskRepository;
import com.zgwx.supervise.service.TaskSchedulerService;
import com.zgwx.supervise.web.dto.ApiResponse;
import com.zgwx.supervise.web.dto.SendTaskDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/tasks")
@RequiredArgsConstructor
public class TaskController {

    private final SendTaskRepository sendTaskRepository;
    private final CourseScheduleRepository courseScheduleRepository;
    private final TaskSchedulerService taskSchedulerService;

    /** 查询发送任务列表 */
    @GetMapping
    public ApiResponse<List<SendTaskDTO>> listTasks(
            @RequestParam(required = false) SendStatus status) {
        List<SendTask> tasks;
        if (status != null) {
            tasks = sendTaskRepository.findByStatus(status);
        } else {
            tasks = sendTaskRepository.findAll();
        }
        List<SendTaskDTO> dtos = tasks.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ApiResponse.success(dtos);
    }

    /** 任务详情 */
    @GetMapping("/{id}")
    public ApiResponse<SendTaskDTO> getTask(@PathVariable Long id) {
        SendTask task = sendTaskRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在：" + id));
        return ApiResponse.success(toDTO(task));
    }

    /** 取消任务 */
    @PostMapping("/{id}/cancel")
    public ApiResponse<Void> cancelTask(@PathVariable Long id) {
        taskSchedulerService.cancelTask(id);
        return ApiResponse.success();
    }

    private SendTaskDTO toDTO(SendTask task) {
        SendTaskDTO dto = new SendTaskDTO();
        dto.setId(task.getId());
        dto.setScheduleId(task.getScheduleId());
        dto.setTriggerType(task.getTriggerType());
        dto.setScheduledAt(task.getScheduledAt());
        dto.setStatus(task.getStatus());
        dto.setQuartzJobKey(task.getQuartzJobKey());
        dto.setCreatedAt(task.getCreatedAt());
        // 填充课程信息
        courseScheduleRepository.findById(task.getScheduleId()).ifPresent(cs -> {
            dto.setStudentName(cs.getStudentName());
            dto.setGroupName(cs.getGroupName());
            dto.setCourseName(cs.getCourseName());
            dto.setCourseLink(cs.getCourseLink());
        });
        return dto;
    }
}
