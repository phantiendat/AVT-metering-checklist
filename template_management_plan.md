# Kế hoạch Triển khai: Quản lý Template Library & Quyền Expert

Tài liệu này cung cấp hướng dẫn (dành cho Claude/Sonnet) để thực hiện các tính năng liên quan đến Template, Thư viện Template (Template Library) và Quyền truy cập mới (`expert`) theo yêu cầu.

## Vấn đề hiện tại & Mục tiêu
1. **Thiếu tên Template trên UI**: Cần hiển thị tên Template mà người dùng vừa chọn lên giao diện chính (topbar/layout).
2. **Lỗi xóa Template**: Nut xóa trong Template Library hiện tại có icon nhưng không hoạt động vì thiếu hàm `deleteTemplate`.
3. **Quyền Expert**: Cần một quyền cao hơn `admin` là `expert` (username: `expert`, pass: `expert`).
4. **Phân quyền xóa Template**: Trong 1 session, người dùng chỉ được xóa các template mà họ *vừa tạo ra* trong chính session đó. Các template khác chỉ có tài khoản `expert` mới có quyền xóa/sửa.
5. **Ghi đè (Save As) Template đã tạo**: Trong cùng 1 phiên (session), người dùng có thể "Save as" để ghi đè (update) lên chính template mà họ vừa mới tạo.

---

## Các bước triển khai (Implementation Steps)

### 1. Hiển thị Tên Template trên Layout chính
*   **Vị trí**: File `AVT_metering_checklist.html`, tìm khu vực `.topbar` (phần hiển thị `#topbar-session-id`).
*   **Thực thi**:
    *   Thêm một thẻ span mới cạnh Session ID: `<span id="topbar-template-name" style="margin-left: 12px; color: var(--primary-accent); font-weight: 600;"></span>`.
    *   Trong hàm `createSessionFromTemplate(template)` (hoặc hàm khởi tạo init), thêm dòng cập nhật nội dung cho thẻ này:
        ```javascript
        const tplNameEl = document.getElementById('topbar-template-name');
        if (tplNameEl) {
            tplNameEl.textContent = window.currentTemplateName && window.currentTemplateName !== 'Unknown Template' ? `[Template: ${window.currentTemplateName}]` : '';
        }
        ```

### 2. Thêm Quyền `expert` (Quyền cao nhất)
*   **Vị trí**: Hàm `handleLogin` và `applyRoleUI`.
*   **Thực thi**:
    *   Cập nhật `handleLogin`:
        ```javascript
        else if (user === 'expert' && pass === 'expert') {
            authenticate('expert');
        }
        ```
    *   Cập nhật `isValidRole(role)` để trả về `true` cho 'expert'.
    *   Cập nhật `hasAdminPermission()` và `hasWritePermission()` để bao gồm 'expert': `return currentUserRole === 'admin' || currentUserRole === 'expert';`
    *   Cập nhật cập nhật pill role ở sidebar (`applyRoleUI`): nếu là `expert`, label = 'Expert', name = 'System Expert'.
    *   Các nút Dành cho Admin (như Save Template, Add Task, v.v.) cần đảm bảo hiển thị cho cả `admin` và `expert`. Mode `.admin-mode` kích hoạt cho cả 2 class.

### 3. Sửa lỗi chức năng "Xóa Template" & Phân quyền xóa
*   **Vị trí**: Ngay bên dưới hàm `loadTemplate` hoặc khu vực TEMPLATE LIBRARY.
*   **Thực thi**:
    *   Thêm hàm bị thiếu:
        ```javascript
        function deleteTemplate(templateId, templateName) {
            if (!confirm(`Are you sure you want to delete template "${templateName}"?`)) return;
            db.ref(`templates/${templateId}`).remove()
                .then(() => {
                    // Update the list immediately
                    loadTemplateList();
                })
                .catch(err => alert("Error deleting template: " + err.message));
        }
        ```
    *   **Phân quyền xóa**: Trong hàm `saveAsTemplate(name, description)`, khi lưu data lên Firebase, hãy thêm thuộc tính `sessionOrigin: currentSessionId`.
    *   Trong hàm `loadTemplateList()`, khi gender vòng lặp `items = Object.entries(templates).map(...)`:
        *   Kiểm tra logic hiển thị nút Xóa:
            ```javascript
            const canDelete = currentUserRole === 'expert' || (t.sessionOrigin === currentSessionId);
            const deleteBtnHtml = canDelete ? `<button class="template-item-delete" onclick="event.stopPropagation(); deleteTemplate('${id}', '${escapeHtml(t.name).replace(/'/g,'&apos;')}')" title="Delete template"><i class="fas fa-trash-alt"></i></button>` : '';
            ```
        *   Thay `deleteBtnHtml` vào vị trí của `<button class="template-item-delete"...>` cũ. Đảm bảo UI không vỡ layout nếu thiếu nút này.

### 4. Tính năng "Ghi đè lên Template vừa tạo" (Save/Update As)
*   **Vị trí**: Quản lý State Template hiện tại của phiên và hàm `showSaveTemplateModal()`, `handleSaveTemplate()`.
*   **Thực thi**:
    *   *Biến Global*: Khai báo biến `window.lastCreatedTemplateId = null` ở đầu app. Khi user lưu một template mới thành công, gán biến này bằng `templateId` (vd: `template_xxx`).
    *   *Sửa đổi Modal UI*: 
        *   Trong HTML của `#save-template-modal`, thêm một checkbox ẩn/hiện hoặc một Radio button khi `lastCreatedTemplateId` tồn tại. Đơn giản nhất là thêm một dòng thông báo dạng Checkbox:
        ```html
        <div id="overwrite-template-container" style="display: none; margin-top: 10px;">
            <label class="checkbox-group" style="cursor: pointer;">
                <input type="checkbox" id="overwrite-template-checkbox">
                <div class="checkbox"></div>
                <span style="font-size: 13px;">Ghi đè (Update) lên template vừa tạo trước đó</span>
            </label>
        </div>
        ```
    *   *Logic JavaScript*:
        *   Trong `showSaveTemplateModal()`: Kiểm tra nếu `window.lastCreatedTemplateId` !== null thì hiển thị `overwrite-template-container`, ngược lại ẩn nó đi và tick=false. Đặt sẵn tên name/desc cũ vào input nếu họ muốn ghi đè.
        *   Trong `saveAsTemplate()`: Kiểm tra nếu thẻ checkbox Ghi Đè được stick, sử dụng lại ID `window.lastCreatedTemplateId` để set data thay vì tạo ID mới (giữ nguyên tplShortId cũ nếu có). Nếu không thì tạo mới như bình thường và cập nhật lại `window.lastCreatedTemplateId` từ kết quả.
    
### Tóm tắt các thay đổi Rules cho API
- Chỉ role `expert` và `currentSessionId` trùng với `sessionOrigin` của template mới được xoá (UI Hide button).
- Không được xoá template có sẵn nếu là user bình thường hoặc admin không tạo ra nó trong session hiện tại.

Vui lòng chuyển giao tài liệu này cho LLM (Claude 3.7 Sonnet / Developer) thực hiện code.
