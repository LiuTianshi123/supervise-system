package com.zgwx.supervise.repository;

import com.zgwx.supervise.domain.entity.SendRecord;
import com.zgwx.supervise.domain.enums.SendStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SendRecordRepository extends JpaRepository<SendRecord, Long> {

    List<SendRecord> findByTaskId(Long taskId);

    List<SendRecord> findByStatus(SendStatus status);

    List<SendRecord> findByScheduleId(Long scheduleId);
}
