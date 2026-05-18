package com.zgwx.supervise.web.dto;

import lombok.Data;

@Data
public class ConfigDTO {
    private int advanceMinutes;
    private String messageTemplate;
    private String pythonExecPath;
    private String pythonScriptPath;
    private int sendTimeoutSeconds;
}
