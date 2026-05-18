package com.zgwx.supervise.service;

import com.zgwx.supervise.domain.entity.SendRecord;
import com.zgwx.supervise.domain.entity.SendTask;
import com.zgwx.supervise.domain.enums.SendStatus;
import com.zgwx.supervise.repository.SendRecordRepository;
import com.zgwx.supervise.repository.SendTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Lazy;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class SendRecordService {

    private final SendRecordRepository sendRecordRepository;
    private final SendTaskRepository sendTaskRepository;

    // 用@Lazy打破循环依赖：SendRecordService <-> SendQueueService
    @Lazy
    @Autowired
    private SendQueueService sendQueueService;

    @Transactional
    public void recordSuccess(SendTask task, String message) {
        SendRecord record = new SendRecord();
        record.setTaskId(task.getId());
        record.setScheduleId(task.getScheduleId());
        record.setRenderedMessage(message);
        record.setStatus(SendStatus.SUCCESS);
        record.setSentAt(LocalDateTime.now());
        sendRecordRepository.save(record);

        task.setStatus(SendStatus.SUCCESS);
        sendTaskRepository.save(task);
        log.info("记录发送成功：taskId={}", task.getId());
    }

    @Transactional
    public void recordFailure(SendTask task, String errorMessage) {
        SendRecord record = new SendRecord();
        record.setTaskId(task.getId());
        record.setScheduleId(task.getScheduleId());
        record.setStatus(SendStatus.FAILED);
        record.setErrorMessage(errorMessage);
        record.setSentAt(LocalDateTime.now());
        sendRecordRepository.save(record);

        task.setStatus(SendStatus.FAILED);
        sendTaskRepository.save(task);
        log.warn("记录发送失败：taskId={}, error={}", task.getId(), errorMessage);
    }

    @Transactional
    public void retryTask(Long taskId) {
        SendTask task = sendTaskRepository.findById(taskId)
                .orElseThrow(() -> new IllegalArgumentException("任务不存在：" + taskId));
        task.setStatus(SendStatus.PENDING);
        sendTaskRepository.save(task);
        sendQueueService.enqueue(task);
        log.info("手动重发任务：taskId={}", taskId);
    }

    public List<SendRecord> queryByStatus(SendStatus status) {
        if (status == null) return sendRecordRepository.findAll();
        return sendRecordRepository.findByStatus(status);
    }

    public List<SendRecord> queryByTaskId(Long taskId) {
        return sendRecordRepository.findByTaskId(taskId);
    }
}
