package com.zgwx.supervise.repository;

import com.zgwx.supervise.domain.entity.SendTask;
import com.zgwx.supervise.domain.enums.SendStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface SendTaskRepository extends JpaRepository<SendTask, Long> {

    List<SendTask> findByStatus(SendStatus status);

    List<SendTask> findByScheduledAtBetween(LocalDateTime start, LocalDateTime end);

    List<SendTask> findByScheduleId(Long scheduleId);
}
