package com.zgwx.supervise.service;

import com.zgwx.supervise.config.SuperviseProperties;
import com.zgwx.supervise.domain.entity.CourseSchedule;
import com.zgwx.supervise.domain.entity.SendTask;
import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.domain.enums.TriggerType;
import com.zgwx.supervise.job.SendReminderJob;
import com.zgwx.supervise.repository.SendTaskRepository;
import com.zgwx.supervise.util.TimeUtil;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.quartz.*;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskSchedulerService {

    private final Scheduler scheduler;
    private final SendTaskRepository sendTaskRepository;
    private final SuperviseProperties properties;

    /**
     * 为一批课程记录注册定时任务（ADVANCE + ON_TIME 各一条）
     */
    public void scheduleTasksForBatch(List<CourseSchedule> schedules) {
        for (CourseSchedule cs : schedules) {
            try {
                scheduleForSchedule(cs);
            } catch (Exception e) {
                log.error("为课程注册定时任务失败：id={}, error={}", cs.getId(), e.getMessage(), e);
            }
        }
    }

    private void scheduleForSchedule(CourseSchedule cs) throws SchedulerException {
        LocalDateTime courseStart = LocalDateTime.of(cs.getCourseDate(), cs.getStartTime());

        // ADVANCE trigger
        LocalDateTime advanceTime = courseStart.minusMinutes(properties.getAdvanceMinutes());
        if (advanceTime.isAfter(LocalDateTime.now())) {
            createTask(cs, TriggerType.ADVANCE, advanceTime);
        } else {
            log.info("ADVANCE时间已过，跳过：scheduleId={}, advanceTime={}", cs.getId(), advanceTime);
        }

        // ON_TIME trigger
        if (courseStart.isAfter(LocalDateTime.now())) {
            createTask(cs, TriggerType.ON_TIME, courseStart);
        } else {
            log.info("ON_TIME时间已过，跳过：scheduleId={}, courseStart={}", cs.getId(), courseStart);
        }
    }

    private void createTask(CourseSchedule cs, TriggerType type, LocalDateTime triggerTime)
            throws SchedulerException {
        // 保存任务到DB
        SendTask task = new SendTask();
        task.setScheduleId(cs.getId());
        task.setTriggerType(type);
        task.setScheduledAt(triggerTime);
        task.setStatus(SendStatus.PENDING);
        task = sendTaskRepository.save(task);

        // Quartz JobKey
        String jobKeyStr = "task_" + task.getId() + "_" + type.name();
        task.setQuartzJobKey(jobKeyStr);
        sendTaskRepository.save(task);

        // 注册 Quartz Job
        JobKey jobKey = JobKey.jobKey(jobKeyStr, "supervise");
        JobDetail jobDetail = JobBuilder.newJob(SendReminderJob.class)
                .withIdentity(jobKey)
                .usingJobData("taskId", task.getId())
                .storeDurably(false)
                .build();

        CronScheduleBuilder scheduleBuilder = CronScheduleBuilder
                .cronSchedule(TimeUtil.toCronExpression(triggerTime))
                .withMisfireHandlingInstructionFireAndProceed();

        Trigger trigger = TriggerBuilder.newTrigger()
                .withIdentity(TriggerKey.triggerKey(jobKeyStr, "supervise"))
                .withSchedule(scheduleBuilder)
                .build();

        scheduler.scheduleJob(jobDetail, trigger);
        log.info("已注册定时任务：jobKey={}, triggerTime={}", jobKeyStr, triggerTime);
    }

    /**
     * 取消任务
     */
    public void cancelTask(Long taskId) {
        sendTaskRepository.findById(taskId).ifPresent(task -> {
            try {
                if (task.getQuartzJobKey() != null) {
                    JobKey jobKey = JobKey.jobKey(task.getQuartzJobKey(), "supervise");
                    scheduler.deleteJob(jobKey);
                }
                task.setStatus(SendStatus.FAILED);
                sendTaskRepository.save(task);
                log.info("已取消任务：taskId={}", taskId);
            } catch (SchedulerException e) {
                log.error("取消Quartz Job失败：taskId={}, error={}", taskId, e.getMessage());
            }
        });
    }
}
