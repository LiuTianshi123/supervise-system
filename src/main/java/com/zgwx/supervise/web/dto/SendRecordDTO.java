package com.zgwx.supervise.web.dto;

import com.zgwx.supervise.domain.enums.SendStatus;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SendRecordDTO {
    private Long id;
    private Long taskId;
    private Long scheduleId;
    private String renderedMessage;
    private SendStatus status;
    private String errorMessage;
    private LocalDateTime sentAt;
    private int retryCount;
}
