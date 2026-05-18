package com.zgwx.supervise.domain.entity;

import com.zgwx.supervise.domain.enums.SendStatus;
import jakarta.persistence.*;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Entity
@Table(name = "send_record")
public class SendRecord {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** 关联任务ID */
    @Column(name = "task_id", nullable = false)
    private Long taskId;

    /** 关联课程ID */
    @Column(name = "schedule_id", nullable = false)
    private Long scheduleId;

    /** 渲染后的消息内容 */
    @Column(name = "rendered_message", columnDefinition = "TEXT")
    private String renderedMessage;

    /** 发送状态 */
    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private SendStatus status;

    /** 错误信息（失败时填写） */
    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    /** 实际发送时间 */
    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    /** 重试次数 */
    @Column(name = "retry_count")
    private int retryCount = 0;
}
