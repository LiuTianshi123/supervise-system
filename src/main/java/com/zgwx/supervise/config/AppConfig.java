package com.zgwx.supervise.config;

import com.zgwx.supervise.domain.entity.SendTask;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.concurrent.BlockingQueue;
import java.util.concurrent.LinkedBlockingQueue;

@Configuration
public class AppConfig {

    @Bean
    public BlockingQueue<SendTask> sendTaskQueue() {
        return new LinkedBlockingQueue<>(1000);
    }
}
