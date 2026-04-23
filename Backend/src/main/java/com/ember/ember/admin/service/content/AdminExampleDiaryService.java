package com.ember.ember.admin.service.content;

import com.ember.ember.admin.annotation.AdminAction;
import com.ember.ember.admin.domain.AdminAccount;
import com.ember.ember.admin.dto.content.*;
import com.ember.ember.admin.repository.AdminAccountRepository;
import com.ember.ember.content.domain.ExampleDiary;
import com.ember.ember.content.repository.ExampleDiaryRepository;
import com.ember.ember.global.exception.BusinessException;
import com.ember.ember.global.response.ErrorCode;
import com.ember.ember.global.security.CustomUserDetails;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 관리자 예제 일기 서비스 — 관리자 API v2.1 §6.6.
 */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class AdminExampleDiaryService {

    private final ExampleDiaryRepository exampleDiaryRepository;
    private final AdminAccountRepository adminAccountRepository;

    public Page<AdminExampleDiaryResponse> list(ExampleDiary.Category category,
                                                 ExampleDiary.DisplayTarget displayTarget,
                                                 Boolean isActive,
                                                 Pageable pageable) {
        return exampleDiaryRepository.searchForAdmin(category, displayTarget, isActive, pageable)
                .map(AdminExampleDiaryResponse::from);
    }

    @Transactional
    @AdminAction(action = "EXAMPLE_DIARY_CREATE", targetType = "EXAMPLE_DIARY")
    public AdminExampleDiaryResponse create(AdminExampleDiaryCreateRequest request,
                                             CustomUserDetails admin) {
        AdminAccount creator = adminAccountRepository.getReferenceById(admin.getUserId());
        ExampleDiary e = ExampleDiary.create(
                request.title(), request.content(), request.category(),
                request.displayTarget(), request.displayOrder(), request.isActive(),
                creator);
        exampleDiaryRepository.save(e);
        return AdminExampleDiaryResponse.from(e);
    }

    @Transactional
    @AdminAction(action = "EXAMPLE_DIARY_UPDATE", targetType = "EXAMPLE_DIARY", targetIdParam = "exampleId")
    public AdminExampleDiaryResponse update(Long exampleId, AdminExampleDiaryUpdateRequest request) {
        ExampleDiary e = load(exampleId);
        e.update(request.title(), request.content(), request.category(),
                request.displayTarget(), request.displayOrder(), request.isActive());
        return AdminExampleDiaryResponse.from(e);
    }

    @Transactional
    @AdminAction(action = "EXAMPLE_DIARY_DELETE", targetType = "EXAMPLE_DIARY", targetIdParam = "exampleId")
    public void delete(Long exampleId) {
        ExampleDiary e = load(exampleId);
        exampleDiaryRepository.delete(e);
    }

    private ExampleDiary load(Long id) {
        return exampleDiaryRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.ADM_EXAMPLE_NOT_FOUND));
    }
}
