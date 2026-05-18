package com.zgwx.supervise.security;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import java.util.Arrays;
import java.util.List;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
@RequiredArgsConstructor
public class SecurityConfig {

    private final JwtAuthFilter jwtAuthFilter;

    @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        return http
                .csrf(AbstractHttpConfigurer::disable)
                .cors(cors -> cors.configurationSource(corsConfigurationSource()))
                .sessionManagement(session ->
                        session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .authorizeHttpRequests(auth -> auth
                        // 静态资源和登录页公开（允许匿名访问）
                        .requestMatchers(
                                "/",                    // 根路径
                                "/index.html",          // 主页
                                "/login.html",          // 登录页
                                "/css/**", "/js/**", "/images/**",
                                "/api/auth/login",
                                "/api/auth/register",
                                "/api/auth/setup-status",
                                "/api/auth/health"
                        ).permitAll()
                        // 管理员接口需要 ADMIN 角色
                        .requestMatchers("/api/admin/**").hasRole("ADMIN")
                        // 其他 API 需登录
                        .requestMatchers("/api/**").authenticated()
                        // 其余请求需登录（兜底）
                        .anyRequest().authenticated()
                )
                .addFilterBefore(jwtAuthFilter, UsernamePasswordAuthenticationFilter.class)
                .exceptionHandling(ex -> ex
                        .authenticationEntryPoint((request, response, authException) -> {
                            String accept = request.getHeader("Accept");
                            boolean wantsHtml = accept != null && accept.contains("text/html");
                            if (wantsHtml) {
                                // 浏览器请求 HTML 页面 → 重定向到登录页
                                response.sendRedirect("/login.html");
                            } else {
                                // API 请求 → 返回 401 JSON
                                response.setContentType("application/json;charset=UTF-8");
                                response.setStatus(401);
                                response.getWriter().write(
                                        "{\"code\":401,\"message\":\"请先登录\"}");
                            }
                        })
                        .accessDeniedHandler((request, response, accessDeniedException) -> {
                            response.setContentType("application/json;charset=UTF-8");
                            response.setStatus(403);
                            response.getWriter().write(
                                    "{\"code\":403,\"message\":\"权限不足，需要管理员权限\"}");
                        })
                )
                .build();
    }

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration cfg = new CorsConfiguration();
        cfg.setAllowedOriginPatterns(List.of("*"));
        cfg.setAllowedMethods(Arrays.asList("GET", "POST", "PUT", "DELETE", "OPTIONS"));
        cfg.setAllowedHeaders(List.of("*"));
        cfg.setAllowCredentials(true);
        cfg.setMaxAge(3600L);
        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/**", cfg);
        return source;
    }

    @Bean
    public PasswordEncoder passwordEncoder() {
        return new BCryptPasswordEncoder();
    }
}
