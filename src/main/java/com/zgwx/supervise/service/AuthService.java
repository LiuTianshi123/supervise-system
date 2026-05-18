package com.zgwx.supervise.service;

import com.zgwx.supervise.domain.entity.User;
import com.zgwx.supervise.domain.enums.UserRole;
import com.zgwx.supervise.repository.UserRepository;
import com.zgwx.supervise.security.JwtUtil;
import com.zgwx.supervise.web.dto.LoginRequest;
import com.zgwx.supervise.web.dto.LoginResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;

    /**
     * 用户登录
     */
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByUsername(request.getUsername())
                .orElseThrow(() -> new IllegalArgumentException("用户名或密码错误"));

        if (!user.getEnabled()) {
            throw new IllegalArgumentException("账号已被禁用，请联系管理员");
        }

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new IllegalArgumentException("用户名或密码错误");
        }

        String token = jwtUtil.generateToken(user.getUsername(), user.getRole().name());
        return new LoginResponse(
                token,
                user.getUsername(),
                user.getNickname() != null ? user.getNickname() : user.getUsername(),
                user.getRole().name()
        );
    }

    /**
     * 注册第一个管理员账号（仅当系统中没有任何账号时可用）
     */
    public LoginResponse registerFirstAdmin(String username, String password) {
        if (userRepository.count() > 0) {
            throw new IllegalStateException("系统中已有账号，请使用管理员账号登录后创建新用户");
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setPassword(passwordEncoder.encode(password));
        admin.setNickname(username);
        admin.setRole(UserRole.ADMIN);
        admin.setEnabled(true);
        userRepository.save(admin);

        String token = jwtUtil.generateToken(admin.getUsername(), admin.getRole().name());
        return new LoginResponse(
                token,
                admin.getUsername(),
                admin.getNickname(),
                admin.getRole().name()
        );
    }

    /**
     * 判断系统是否需要注册第一个管理员
     */
    public boolean needsInitialSetup() {
        return userRepository.count() == 0;
    }

    /**
     * 获取当前登录用户
     */
    public Optional<User> getCurrentUser(String username) {
        return userRepository.findByUsername(username);
    }
}
