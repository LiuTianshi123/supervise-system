package com.zgwx.supervise.domain.entity;

import jakarta.persistence.*;
import lombok.Data;
import org.hibernate.annotations.CreationTimestamp;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Data
@Entity
@Table(name = "course_schedule")
public class CourseSchedule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── 学员信息 ──────────────────────────────────────────

    /** A列：学员姓名 */
    @Column(name = "student_name", nullable = false)
    private String studentName;

    /** B列：学员群名称 */
    @Column(name = "group_name", nullable = false)
    private String groupName;

    // ── 课程信息 ──────────────────────────────────────────

    /** C列：授课时间 */
    @Column(name = "course_date", nullable = false)
    private LocalDate courseDate;

    /** D列：星期（一/二/三...） */
    @Column(name = "week_day")
    private String weekDay;

    /** E列：时间段 HH:mm-HH:mm */
    @Column(name = "time_slot")
    private String timeSlot;

    /** E列解析：课程开始时间 */
    @Column(name = "start_time", nullable = false)
    private LocalTime startTime;

    /** E列解析：课程结束时间 */
    @Column(name = "end_time")
    private LocalTime endTime;

    /** F列：课程名称 */
    @Column(name = "course_name", nullable = false)
    private String courseName;

    /** G列：课程链接 */
    @Column(name = "course_link")
    private String courseLink;

    /** H列：用户自定义督学话术模板 */
    @Column(name = "message_template", length = 1000)
    private String messageTemplate;

    // ── 系统字段 ──────────────────────────────────────────

    @CreationTimestamp
    @Column(name = "imported_at", updatable = false)
    private LocalDateTime importedAt;

    /** 导入批次ID（yyyyMMdd_HHmmss格式） */
    @Column(name = "import_batch_id")
    private String importBatchId;
}
