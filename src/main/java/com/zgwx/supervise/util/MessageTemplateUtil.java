package com.zgwx.supervise.util;

import com.zgwx.supervise.domain.entity.CourseSchedule;

public class MessageTemplateUtil {

    /**
     * 渲染消息模板，替换所有占位符
     * 占位符：{学员姓名} {课程名称} {时} {分} {链接}
     */
    public static String render(String template, CourseSchedule schedule) {
        if (template == null) return "";
        String hour = String.format("%02d", schedule.getStartTime().getHour());
        String minute = String.format("%02d", schedule.getStartTime().getMinute());
        String link = schedule.getCourseLink() != null ? schedule.getCourseLink() : "";

        return template
                .replace("{学员姓名}", schedule.getStudentName())
                .replace("{课程名称}", schedule.getCourseName())
                .replace("{时}", hour)
                .replace("{分}", minute)
                .replace("{链接}", link);
    }
}
