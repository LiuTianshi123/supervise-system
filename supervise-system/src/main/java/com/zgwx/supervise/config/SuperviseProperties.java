package com.zgwx.supervise.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Data
@Component
@ConfigurationProperties(prefix = "supervise")
public class SuperviseProperties {

    /** 提前提醒分钟数（默认10分钟） */
    private int advanceMinutes = 10;

    /** Python脚本超时秒数 */
    private int sendTimeoutSeconds = 30;

    /** Python可执行文件路径 */
    private String pythonExecPath = "python";

    /** Python发送脚本路径 */
    private String pythonScriptPath = "src/main/python/wechat_sender.py";

    /** 督学消息模板 */
    private String messageTemplate = "你好{学员姓名}同学，您的{课程名称}将于今天的{时}点{分}分开始，请您及时到中公网校app中进行学习。课程链接：{链接}";
}
