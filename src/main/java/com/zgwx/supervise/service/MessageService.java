package com.zgwx.supervise.service;

import com.zgwx.supervise.config.SuperviseProperties;
import com.zgwx.supervise.domain.entity.CourseSchedule;
import com.zgwx.supervise.domain.enums.TriggerType;
import com.zgwx.supervise.util.MessageTemplateUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class MessageService {

    private final SuperviseProperties properties;

    /**
     * 渲染督学消息。
     * <p>优先使用行级话术（CourseSchedule.messageTemplate），
     * 若行级话术为空或不含系统占位符则回退到全局配置模板。
     * ADVANCE类型附加"（请提前准备）"。
     */
    public String render(CourseSchedule schedule, TriggerType triggerType) {
        String rowTemplate = schedule.getMessageTemplate();
        String template;

        // 判断H列是否是有效的消息模板（包含至少一个系统占位符）
        boolean hasPlaceholders = rowTemplate != null && !rowTemplate.isBlank()
                && (rowTemplate.contains("{学员姓名}")
                    || rowTemplate.contains("{课程名称}")
                    || rowTemplate.contains("{时}")
                    || rowTemplate.contains("{分}")
                    || rowTemplate.contains("{链接}"));

        if (hasPlaceholders) {
            template = rowTemplate;                 // H列是有效模板，使用之
        } else {
            template = properties.getMessageTemplate(); // H列是示例文本或空，回退全局模板
        }

        String msg = MessageTemplateUtil.render(template, schedule);
        if (triggerType == TriggerType.ADVANCE) {
            msg += "（请提前准备）";
        }
        return msg;
    }

    public String getTemplate() {
        return properties.getMessageTemplate();
    }

    public void updateTemplate(String template) {
        properties.setMessageTemplate(template);
    }
}
