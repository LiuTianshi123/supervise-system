package com.zgwx.supervise.repository;

import com.zgwx.supervise.domain.entity.CourseSchedule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface CourseScheduleRepository extends JpaRepository<CourseSchedule, Long> {

    List<CourseSchedule> findByCourseDate(LocalDate courseDate);

    List<CourseSchedule> findByImportBatchId(String importBatchId);
}
