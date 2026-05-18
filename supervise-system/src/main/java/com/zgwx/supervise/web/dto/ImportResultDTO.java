package com.zgwx.supervise.web.dto;

import lombok.Data;

import java.util.List;

@Data
public class ImportResultDTO {

    private String batchId;
    private int totalRows;
    private int successCount;
    private int errorCount;
    private List<RowError> errors;

    // 文件夹批量导入时汇总多个文件的结果
    private List<FileResult> fileResults;

    @Data
    public static class RowError {
        private int rowNumber;
        private String reason;

        public RowError(int rowNumber, String reason) {
            this.rowNumber = rowNumber;
            this.reason = reason;
        }
    }

    /** 文件夹模式下每个文件的解析结果 */
    @Data
    public static class FileResult {
        private String fileName;
        private int totalRows;
        private int successCount;
        private int errorCount;
        private String errorMessage; // 文件级别的异常（如格式错误）
        private List<RowError> errors;

        public FileResult(String fileName) {
            this.fileName = fileName;
        }
    }
}
