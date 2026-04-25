package com.ember.ember.admin.service.export;

import com.ember.ember.admin.domain.export.ReportExport;
import com.ember.ember.admin.dto.export.ReportExportRequest;
import com.ember.ember.admin.dto.export.ReportExportResponse;
import com.ember.ember.admin.repository.export.ReportExportRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminReportExportService {

    private final ReportExportRepository reportExportRepository;

    /**
     * 리포트 내보내기 요청 생성 (QUEUED 상태)
     * 실제 비동기 처리는 Phase 4+에서 구현 예정
     */
    @Transactional
    public ReportExportResponse requestExport(ReportExportRequest request, Long adminId) {
        ReportExport export = ReportExport.request(
                request.reportType(),
                request.format(),
                adminId
        );
        reportExportRepository.save(export);
        return ReportExportResponse.from(export);
    }

    /**
     * 리포트 내보내기 상태 조회
     */
    public ReportExportResponse getExportStatus(Long exportId) {
        ReportExport export = reportExportRepository.findById(exportId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_EXPORT_NOT_FOUND));
        return ReportExportResponse.from(export);
    }
}
