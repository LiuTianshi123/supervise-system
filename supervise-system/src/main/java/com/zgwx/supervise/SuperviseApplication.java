package com.zgwx.supervise;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class SuperviseApplication {
    public static void main(String[] args) {
        SpringApplication.run(SuperviseApplication.class, args);
    }
}
