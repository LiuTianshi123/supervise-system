package com.zgwx.supervise.web.dto;

import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.domain.enums.TriggerType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class SendTaskDTO {
    private Long id;
    private Long scheduleId;
    private TriggerType triggerType;
    private LocalDateTime scheduledAt;
    private SendStatus status;
    private String quartzJobKey;
    private LocalDateTime createdAt;
    // 关联课程信息
    private String studentName;
    private String groupName;
    private String courseName;
    private String courseLink;
}
