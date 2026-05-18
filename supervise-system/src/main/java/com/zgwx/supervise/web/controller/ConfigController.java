package com.zgwx.supervise.web.controller;

import com.zgwx.supervise.config.SuperviseProperties;
import com.zgwx.supervise.web.dto.ApiResponse;
import com.zgwx.supervise.web.dto.ConfigDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class ConfigController {

    private final SuperviseProperties properties;

    /** 读取当前配置 */
    @GetMapping
    public ApiResponse<ConfigDTO> getConfig() {
        ConfigDTO dto = new ConfigDTO();
        dto.setAdvanceMinutes(properties.getAdvanceMinutes());
        dto.setMessageTemplate(properties.getMessageTemplate());
        dto.setPythonExecPath(properties.getPythonExecPath());
        dto.setPythonScriptPath(properties.getPythonScriptPath());
        dto.setSendTimeoutSeconds(properties.getSendTimeoutSeconds());
        return ApiResponse.success(dto);
    }

    /** 更新配置 */
    @PutMapping
    public ApiResponse<ConfigDTO> updateConfig(@RequestBody ConfigDTO dto) {
        properties.setAdvanceMinutes(dto.getAdvanceMinutes());
        properties.setMessageTemplate(dto.getMessageTemplate());
        properties.setPythonExecPath(dto.getPythonExecPath());
        properties.setPythonScriptPath(dto.getPythonScriptPath());
        properties.setSendTimeoutSeconds(dto.getSendTimeoutSeconds());
        return ApiResponse.success(dto);
    }
}
