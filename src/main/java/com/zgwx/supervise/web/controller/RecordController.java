package com.zgwx.supervise.web.controller;

import com.zgwx.supervise.domain.entity.SendRecord;
import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.service.SendRecordService;
import com.zgwx.supervise.web.dto.ApiResponse;
import com.zgwx.supervise.web.dto.SendRecordDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/records")
@RequiredArgsConstructor
public class RecordController {

    private final SendRecordService sendRecordService;

    /** 查询发送记录 */
    @GetMapping
    public ApiResponse<List<SendRecordDTO>> listRecords(
            @RequestParam(required = false) SendStatus status) {
        List<SendRecord> records = sendRecordService.queryByStatus(status);
        List<SendRecordDTO> dtos = records.stream()
                .map(this::toDTO)
                .collect(Collectors.toList());
        return ApiResponse.success(dtos);
    }

    /** 手动重发失败任务 */
    @PostMapping("/{taskId}/retry")
    public ApiResponse<String> retryTask(@PathVariable Long taskId) {
        sendRecordService.retryTask(taskId);
        return ApiResponse.success("已加入重发队列");
    }

    private SendRecordDTO toDTO(SendRecord record) {
        SendRecordDTO dto = new SendRecordDTO();
        dto.setId(record.getId());
        dto.setTaskId(record.getTaskId());
        dto.setScheduleId(record.getScheduleId());
        dto.setRenderedMessage(record.getRenderedMessage());
        dto.setStatus(record.getStatus());
        dto.setErrorMessage(record.getErrorMessage());
        dto.setSentAt(record.getSentAt());
        dto.setRetryCount(record.getRetryCount());
        return dto;
    }
}
