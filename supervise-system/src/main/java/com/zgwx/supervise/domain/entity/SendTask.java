package com.zgwx.supervise.domain.entity;

import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.domain.enums.TriggerType;
import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "send_task")
public class SendTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 关联课程ID */
    @Column(name = "schedule_id", nullable = false)
    private Long scheduleId;

    /** 触发类型：提前提醒 or 开课时刻 */
    @Enumerated(EnumType.STRING)
    @Column(name = "trigger_type", nullable = false)
    private TriggerType triggerType;

    /** 计划发送时间 */
    @Column(name = "scheduled_at", nullable = false)
    private LocalDateTime scheduledAt;

    /** 发送状态 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SendStatus status = SendStatus.PENDING;

    /** Quartz JobKey（task_{taskId}_{ADVANCE|ON_TIME}） */
    @Column(name = "quartz_job_key")
    private String quartzJobKey;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at")
    private LocalDateTime updatedAt;
}
