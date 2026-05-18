package com.zgwx.supervise.domain.enums;

public enum SendStatus {
    PENDING,      // 待发送
    PROCESSING,   // 发送中（已入队）
    SUCCESS,      // 发送成功
    FAILED        // 发送失败
}
