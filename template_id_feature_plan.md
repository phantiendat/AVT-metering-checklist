# Kế Hoạch Bổ Sung Tính Năng: Cấp Phát Template ID & Cập Nhật Support Email

Tài liệu này mô tả chi tiết các bước (dành cho Claude 3.5 Sonnet) nhằm giải quyết vấn đề thiếu thông tin Template trong email Support. Bằng cách gán một mã định danh (Template ID) ngắn gọn cho từng template, dữ liệu gửi về sẽ chính xác và hiển thị đẹp hơn bên trong Pop-up Library.

## Mục Tiêu
1. Tự động cấp phát một mã **Template ID** (VD: `TPL-A8B2`) mỗi khi Admin lưu một template mới.
2. Hiển thị Template ID này cùng với Tên Template trong cửa sổ "Template Library".
3. Lưu trữ trạng thái Template ID đang được sử dụng trong phiên làm việc hiện tại.
4. Gửi kèm mã Template ID này vào tiêu đề và nội dung của email Support (thay vì hiện `--`).

---

## Các Bước Cần Thực Hiện Tiêu Chuẩn

### 1. Cập Nhật Hàm Lưu Template (`handleSaveTemplate`)
*   **Vị trí:** Trong file `AVT_metering_checklist.html`, tìm hàm `handleSaveTemplate(event)` (hoặc hàm chịu trách nhiệm lưu template vào Cơ sở dữ liệu/Firebase).
*   **Logic cần thêm:** 
    *   Tạo một chuỗi ngẫu nhiên gồm 4-6 ký tự in hoa và số (ví dụ: `Math.random().toString(36).substring(2, 6).toUpperCase()`).
    *   Gắn tiền tố `TPL-` thành ID hoàn chỉnh. Ví dụ: `TPL-X9D4`.
    *   Lưu thuộc tính `templateId` này vào trong object (dữ liệu) của Template cùng với tên và mô tả.

### 2. Cập Nhật Giao Diện Template Library
*   **Vị trí:** Trong hàm chịu trách nhiệm render ra danh sách các template (thường có một vòng lặp để tạo HTML cho `#template-list`).
*   **Giao diện yêu cầu:** Bổ sung một Badge nhỏ nằm cạnh hoặc phía trên Tên Template để hiển thị mã ID.
    *   Ví dụ thiết kế: `<span class="template-id-badge" style="font-size: 10px; font-family: monospace; background: rgba(0, 168, 232, 0.15); color: var(--primary-accent); padding: 2px 6px; border-radius: 4px; margin-right: 6px;">TPL-X9D4</span><span class="template-name">Tên của Template...</span>`

### 3. Cập Nhật State (Trạng Thái Phiên Làm Việc) Đầu Cuối
*   **Vị trí:** Nơi xử lý hành động khởi tạo Session từ một Template (ví dụ: `loadTemplate()` hoặc khi click nút chọn template).
*   **Logic cần thêm:** Lưu tạm `currentTemplateId` đang được sử dụng vào một biến Global (ví dụ: `window.currentTemplateId` hoặc truyền nó vào thông tin Session). Nếu người dùng ấn "Start Blank", gán biến này là `BLANK` hoặc `NONE`.

### 4. Cập Nhật Gửi Data về EmailJS (`handleSupportSubmit`)
*   **Vị trí:** Dòng gán tham số Template trong code xử lý gọi EmailJS.
*   **Logic cần thay đổi:**
    *   Thay vì gọi biến chứa Tên Template cũ (khiến nó trả về `--`), hệ thống sẽ gọi biến `currentTemplateId` vừa được tạo ở bước 3.
    *   **Payload gửi đi:** 
        *   Template ID: `{currentTemplateId}` (Đảm bảo không bị trống).
        *   Trong phần Subject (Tiêu đề), dùng mã ngắn gọn ID này để tránh lỗi quá số lượng ký tự. (VD: `[AVT Feedback] 03-04-2026 | ADMIN | 4CWUKA | TPL-X9D4 | 14.3%`).

---

## Lời Nhắc Quan Trọng Gửi Sonnet (Coding Rules)
> [!WARNING]
> *   **Tuân thủ Anti-Jitter:** Nếu render lại `#template-list`, hãy đảm bảo sử dụng cách append/ DOM an toàn với hiệu năng. 
> *   **Backward Compatibility:** Đối với các Template CŨ đã lưu trong DataBase (chưa có trường `templateId`), hãy thêm code fallback. Nếu nó chưa có ID, hãy hiển thị và gán dạng `OLD-TPL` để tranh báo lỗi null/undefined.
