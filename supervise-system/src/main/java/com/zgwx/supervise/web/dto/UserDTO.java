package com.zgwx.supervise.web.dto;

import com.zgwx.supervise.domain.entity.User;
import com.zgwx.supervise.domain.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UserDTO {

    private Long id;

    @NotBlank(message = "用户名不能为空")
    private String username;

    // 密码：创建/修改时传，不返回给前端
    private String password;

    private String nickname;

    private UserRole role;

    private Boolean enabled;

    private LocalDateTime createdAt;

    // 从实体转DTO
    public static UserDTO fromEntity(User user) {
        UserDTO dto = new UserDTO();
        dto.setId(user.getId());
        dto.setUsername(user.getUsername());
        dto.setNickname(user.getNickname());
        dto.setRole(user.getRole());
        dto.setEnabled(user.getEnabled());
        dto.setCreatedAt(user.getCreatedAt());
        // 不返回密码
        return dto;
    }
}
