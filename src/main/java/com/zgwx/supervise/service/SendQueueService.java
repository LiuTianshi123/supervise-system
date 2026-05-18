package com.zgwx.supervise.service;

import com.zgwx.supervise.domain.entity.CourseSchedule;
import com.zgwx.supervise.domain.entity.SendTask;
import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.repository.CourseScheduleRepository;
import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendQueueService {

    private final BlockingQueue<SendTask> sendTaskQueue;
    private final MessageService messageService;
    private final WechatSenderService wechatSenderService;
    private final SendRecordService sendRecordService;
    private final CourseScheduleRepository courseScheduleRepository;

    private final ExecutorService executor = Executors.newSingleThreadExecutor(r -> {
        Thread t = new Thread(r, "send-queue-consumer");
        t.setDaemon(true);
        return t;
    });

    /**
     * 将任务入队（防重检查）
     */
    public void enqueue(SendTask task) {
        if (task.getStatus() == SendStatus.PROCESSING) {
            log.warn("任务已在处理中，跳过入队：taskId={}", task.getId());
            return;
        }
        task.setStatus(SendStatus.PROCESSING);
        boolean offered = sendTaskQueue.offer(task);
        if (!offered) {
            log.error("队列已满，任务入队失败：taskId={}", task.getId());
        } else {
            log.info("任务已入队：taskId={}, scheduledAt={}", task.getId(), task.getScheduledAt());
        }
    }

    /**
     * 启动单线程消费者
     */
    @PostConstruct
    public void startConsumer() {
        executor.submit(() -> {
            log.info("发送队列消费者已启动");
            while (!Thread.currentThread().isInterrupted()) {
                try {
                    SendTask task = sendTaskQueue.take();
                    processTask(task);
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.info("发送队列消费者已停止");
                    break;
                } catch (Exception e) {
                    log.error("处理发送任务时发生异常：{}", e.getMessage(), e);
                }
            }
        });
    }

    private void processTask(SendTask task) {
        log.info("开始处理发送任务：taskId={}", task.getId());
        try {
            // 查询关联课程
            CourseSchedule schedule = courseScheduleRepository.findById(task.getScheduleId())
                    .orElseThrow(() -> new IllegalArgumentException("课程不存在：" + task.getScheduleId()));

            // 渲染消息
            String message = messageService.render(schedule, task.getTriggerType());
            log.info("渲染消息：{}", message);

            // 发送
            WechatSenderService.SendResult result = wechatSenderService.send(
                    schedule.getGroupName(),
                    schedule.getStudentName(),
                    message
            );

            // 记录结果
            if (result.status() == SendStatus.SUCCESS) {
                sendRecordService.recordSuccess(task, message);
            } else {
                sendRecordService.recordFailure(task, result.errorMsg());
            }

        } catch (Exception e) {
            log.error("发送任务处理失败：taskId={}, error={}", task.getId(), e.getMessage(), e);
            sendRecordService.recordFailure(task, e.getMessage());
        }
    }
}
