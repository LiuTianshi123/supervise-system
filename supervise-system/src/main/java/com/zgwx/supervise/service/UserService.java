package com.zgwx.supervise.service;

import com.zgwx.supervise.domain.entity.User;
import com.zgwx.supervise.domain.enums.UserRole;
import com.zgwx.supervise.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public List<User> listAll() {
        return userRepository.findAll();
    }

    public User createUser(String username, String password, String nickname, UserRole role) {
        if (userRepository.existsByUsername(username)) {
            throw new IllegalArgumentException("用户名已存在：" + username);
        }
        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(password));
        user.setNickname(nickname != null ? nickname : username);
        user.setRole(role != null ? role : UserRole.USER);
        user.setEnabled(true);
        return userRepository.save(user);
    }

    public User updateUser(Long id, String password, String nickname, UserRole role, Boolean enabled) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在：" + id));

        if (password != null && !password.isBlank()) {
            user.setPassword(passwordEncoder.encode(password));
        }
        if (nickname != null) {
            user.setNickname(nickname);
        }
        if (role != null) {
            user.setRole(role);
        }
        if (enabled != null) {
            user.setEnabled(enabled);
        }
        return userRepository.save(user);
    }

    public void deleteUser(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("用户不存在：" + id));
        userRepository.delete(user);
    }
}
