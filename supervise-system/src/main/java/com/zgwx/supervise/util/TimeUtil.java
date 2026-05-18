package com.zgwx.supervise.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.Date;

public class TimeUtil {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm");
    private static final DateTimeFormatter DATE_FMT1 = DateTimeFormatter.ofPattern("yyyy/MM/dd");
    private static final DateTimeFormatter DATE_FMT2 = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    /**
     * 解析时间段字符串 "08:00-18:55"，返回 [startTime, endTime]
     */
    public static LocalTime[] parseTimeSlot(String slot) {
        if (slot == null || !slot.contains("-")) {
            throw new IllegalArgumentException("时间段格式错误，期望 HH:mm-HH:mm，实际：" + slot);
        }
        String[] parts = slot.trim().split("-", 2);
        LocalTime start = LocalTime.parse(parts[0].trim(), TIME_FMT);
        LocalTime end = LocalTime.parse(parts[1].trim(), TIME_FMT);
        return new LocalTime[]{start, end};
    }

    /**
     * 解析 POI 返回的日期值（可能是 Date、String、LocalDate 等）
     */
    public static LocalDate parseDate(Object cellValue) {
        if (cellValue == null) return null;
        if (cellValue instanceof LocalDate) return (LocalDate) cellValue;
        if (cellValue instanceof Date) {
            return ((Date) cellValue).toInstant()
                    .atZone(java.time.ZoneId.systemDefault())
                    .toLocalDate();
        }
        String str = cellValue.toString().trim();
        // 尝试 yyyy/MM/dd
        try {
            return LocalDate.parse(str, DATE_FMT1);
        } catch (Exception ignored) {}
        // 尝试 yyyy-MM-dd
        try {
            return LocalDate.parse(str, DATE_FMT2);
        } catch (Exception ignored) {}
        throw new IllegalArgumentException("无法解析日期：" + str);
    }

    /**
     * 将 LocalDateTime 转换为 Quartz Cron 表达式
     * 格式：0 {分} {时} {日} {月} ? {年}
     */
    public static String toCronExpression(LocalDateTime dt) {
        return String.format("0 %d %d %d %d ? %d",
                dt.getMinute(), dt.getHour(),
                dt.getDayOfMonth(), dt.getMonthValue(), dt.getYear());
    }
}
