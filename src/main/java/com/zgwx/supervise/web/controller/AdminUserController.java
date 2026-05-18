package com.zgwx.supervise.web.controller;

import com.zgwx.supervise.domain.entity.User;
import com.zgwx.supervise.domain.enums.UserRole;
import com.zgwx.supervise.service.UserService;
import com.zgwx.supervise.web.dto.ApiResponse;
import com.zgwx.supervise.web.dto.UserDTO;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/admin/users")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    /**
     * 列出所有用户
     */
    @GetMapping
    public ApiResponse<List<UserDTO>> listUsers() {
        List<UserDTO> dtos = userService.listAll().stream()
                .map(UserDTO::fromEntity)
                .toList();
        return ApiResponse.success(dtos);
    }

    /**
     * 创建新用户（仅ADMIN）
     * Body: { username, password, nickname, role }
     */
    @PostMapping
    public ApiResponse<UserDTO> createUser(@RequestBody UserDTO dto) {
        try {
            User user = userService.createUser(
                    dto.getUsername(),
                    dto.getPassword(),
                    dto.getNickname(),
                    dto.getRole()
            );
            return ApiResponse.success(UserDTO.fromEntity(user));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(400, e.getMessage());
        }
    }

    /**
     * 更新用户（密码/角色/状态）
     * Body: { password, nickname, role, enabled }
     */
    @PutMapping("/{id}")
    public ApiResponse<UserDTO> updateUser(@PathVariable Long id, @RequestBody UserDTO dto) {
        try {
            User user = userService.updateUser(
                    id,
                    dto.getPassword(),
                    dto.getNickname(),
                    dto.getRole(),
                    dto.getEnabled()
            );
            return ApiResponse.success(UserDTO.fromEntity(user));
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(400, e.getMessage());
        }
    }

    /**
     * 删除用户
     */
    @DeleteMapping("/{id}")
    public ApiResponse<Void> deleteUser(@PathVariable Long id) {
        try {
            userService.deleteUser(id);
            return ApiResponse.success(null);
        } catch (IllegalArgumentException e) {
            return ApiResponse.error(400, e.getMessage());
        }
    }
}
