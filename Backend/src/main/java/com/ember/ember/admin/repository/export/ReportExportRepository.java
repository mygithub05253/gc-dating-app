package com.ember.ember.admin.repository.export;

import com.ember.ember.admin.domain.export.ReportExport;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReportExportRepository extends JpaRepository<ReportExport, Long> {
}
