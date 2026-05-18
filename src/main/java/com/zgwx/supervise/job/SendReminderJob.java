package com.zgwx.supervise.job;

import com.zgwx.supervise.domain.entity.SendTask;
import com.zgwx.supervise.repository.SendTaskRepository;
import com.zgwx.supervise.service.SendQueueService;
import lombok.extern.slf4j.Slf4j;
import org.quartz.Job;
import org.quartz.JobExecutionContext;
import org.quartz.JobExecutionException;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

@Slf4j
@Component
public class SendReminderJob implements Job {

    @Autowired
    private SendTaskRepository sendTaskRepository;

    @Autowired
    private SendQueueService sendQueueService;

    @Override
    public void execute(JobExecutionContext context) throws JobExecutionException {
        Long taskId = context.getJobDetail().getJobDataMap().getLong("taskId");
        log.info("Quartz触发发送任务：taskId={}", taskId);

        SendTask task = sendTaskRepository.findById(taskId).orElse(null);
        if (task == null) {
            log.warn("任务不存在，跳过：taskId={}", taskId);
            return;
        }

        sendQueueService.enqueue(task);
    }
}
