package com.zgwx.supervise.service;

import com.zgwx.supervise.config.SuperviseProperties;
import com.zgwx.supervise.domain.enums.SendStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;

@Slf4j
@Service
@RequiredArgsConstructor
public class WechatSenderService {

    private final SuperviseProperties properties;

    public record SendResult(SendStatus status, String errorMsg) {}

    /**
     * 调用 Python 脚本发送企业微信消息
     */
    public SendResult send(String groupName, String studentName, String message) {
        List<String> cmd = buildCommand(groupName, studentName, message);
        log.info("执行发送命令：group={}, student={}", groupName, studentName);

        try {
            ProcessBuilder pb = new ProcessBuilder(cmd);
            pb.redirectErrorStream(true);
            Process process = pb.start();

            // 读取输出
            StringBuilder output = new StringBuilder();
            try (BufferedReader reader = new BufferedReader(
                    new InputStreamReader(process.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                while ((line = reader.readLine()) != null) {
                    output.append(line).append("\n");
                }
            }

            boolean finished = process.waitFor(
                    properties.getSendTimeoutSeconds(), TimeUnit.SECONDS);

            if (!finished) {
                process.destroyForcibly();
                log.warn("发送超时：group={}", groupName);
                return new SendResult(SendStatus.FAILED, "发送超时");
            }

            int exitCode = process.exitValue();
            return parseResult(exitCode, output.toString().trim());

        } catch (Exception e) {
            log.error("调用Python脚本异常：{}", e.getMessage(), e);
            return new SendResult(SendStatus.FAILED, "脚本调用异常：" + e.getMessage());
        }
    }

    private List<String> buildCommand(String groupName, String studentName, String message) {
        List<String> cmd = new ArrayList<>();
        cmd.add(properties.getPythonExecPath());
        cmd.add(properties.getPythonScriptPath());
        cmd.add("--group");
        cmd.add(groupName);
        cmd.add("--student");
        cmd.add(studentName);
        cmd.add("--message");
        cmd.add(message);
        return cmd;
    }

    private SendResult parseResult(int exitCode, String stdout) {
        // 取最后一行
        String lastLine = stdout;
        if (stdout.contains("\n")) {
            String[] lines = stdout.split("\n");
            lastLine = lines[lines.length - 1].trim();
        }

        return switch (exitCode) {
            case 0 -> {
                log.info("发送成功：{}", lastLine);
                yield new SendResult(SendStatus.SUCCESS, null);
            }
            case 1 -> {
                log.warn("群聊未找到：{}", lastLine);
                yield new SendResult(SendStatus.FAILED, "群聊未找到：" + lastLine);
            }
            case 2 -> {
                log.warn("发送超时：{}", lastLine);
                yield new SendResult(SendStatus.FAILED, "发送超时：" + lastLine);
            }
            default -> {
                log.error("发送失败（exitCode={}）：{}", exitCode, lastLine);
                yield new SendResult(SendStatus.FAILED, "发送失败：" + lastLine);
            }
        };
    }
}
