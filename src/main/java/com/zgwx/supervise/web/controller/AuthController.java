package com.zgwx.supervise.web.controller;

import com.zgwx.supervise.service.AuthService;
import com.zgwx.supervise.web.dto.ApiResponse;
import com.zgwx.supervise.web.dto.LoginRequest;
import com.zgwx.supervise.web.dto.LoginResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    /**
     * 健康检查（公开）
     */
    @GetMapping("/health")
    public ApiResponse<Map<String, Object>> health() {
        return ApiResponse.success(Map.of(
                "status", "ok",
                "needsSetup", authService.needsInitialSetup()
        ));
    }

    /**
     * 判断是否需要初始化设置（注册第一个管理员）
     */
    @GetMapping("/setup-status")
    public ApiResponse<Map<String, Boolean>> setupStatus() {
        return ApiResponse.success(Map.of("needsSetup", authService.needsInitialSetup()));
    }

    /**
     * 注册第一个管理员（仅当无账号时可用）
     * POST /api/auth/register
     * Body: { username, password }
     */
    @PostMapping("/register")
    public ApiResponse<LoginResponse> register(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        String password = body.get("password");

        if (username == null || username.isBlank()) {
            return ApiResponse.error(400, "用户名不能为空");
        }
        if (password == null || password.length() < 6) {
            return ApiResponse.error(400, "密码至少6位");
        }

        LoginResponse resp = authService.registerFirstAdmin(username, password);
        return ApiResponse.success(resp);
    }

    /**
     * 用户登录
     * POST /api/auth/login
     * Body: { username, password }
     */
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        try {
            LoginResponse resp = authService.login(request);
            return ApiResponse.success(resp);
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(401, e.getMessage());
        }
    }

    /**
     * 获取当前登录用户信息
     * GET /api/auth/me
     */
    @GetMapping("/me")
    public ApiResponse<LoginResponse> me(@RequestAttribute(name = "org.springframework.security.web.csrf.CsrfToken",
            required = false) Object csrfToken) {
        // 从 SecurityContext 获取当前用户
        var auth = org.springframework.security.core.context.SecurityContextHolder
                .getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()
                || "anonymousUser".equals(auth.getPrincipal())) {
            return ApiResponse.error(401, "未登录");
        }

        var user = (com.zgwx.supervise.domain.entity.User) auth.getPrincipal();
        return ApiResponse.success(new LoginResponse(
                null,
                user.getUsername(),
                user.getNickname() != null ? user.getNickname() : user.getUsername(),
                user.getRole().name()
        ));
    }
}
