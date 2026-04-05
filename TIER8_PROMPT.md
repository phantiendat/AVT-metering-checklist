# Nhờ Claude Sonnet 4.6 thực thi Tier 8
> Bạn hãy copy toàn bộ nội dung trong khối dưới đây và dán vào chat với Claude Sonnet để nó thực thi việc tinh chỉnh nhé:

***

**Prompt gửi Claude Sonnet:**

Xin chào Claude, dự án `AVT_metering_checklist.html` (Lumina Industrial) của chúng ta đã hoàn thành xuất sắc Tier 7. Tuy nhiên, sau khi qua bước Design Review từ chuyên gia, có một vài điểm "Visual Balance & Micro-Refinements" cần tinh chỉnh lại (đây là **TIER 8**). Hệ thống Grid và Anti-Jitter đã ổn định nên chúng ta sẽ **KHÔNG sửa JavaScript hay cấu trúc HTML chính**, chỉ làm công việc tìm các rule CSS hiện tại và đè (override/update) lại cho chuẩn.

Hãy tìm trong phần thẻ `<style>` của file `AVT_metering_checklist.html` và thực hiện các cập nhật CSS (và HTML class nhỏ nếu cần) theo đúng 4 yêu cầu dưới đây:

### 1. Giảm thiểu Trọng lượng thị giác của Gauge Card ở Cột Phải (Light Mode)
Hiện tại khối chứa Liquid Gauge (`.gauge-card` hoặc `.right-sidebar` content) bị gán cứng màu nển tối (`#0f172a` hoặc tương đương) ngay cả ở Light Mode, gây lệch tỷ lệ.
- **Yêu cầu:** Tìm class `.gauge-card` (hoặc class đang tạo màu nền cho cột phải). Xoá màu nền tối và chữ trắng fix cứng đi. Sử dụng `background: var(--glass-bg);` và `border: 1px solid var(--glass-border);`, chữ `color: var(--text-main);`.
- **Bảo lưu Dark Mode:** Chỉ trong `.dark-mode` (hoặc `[data-theme="dark"] .gauge-card`), thì mới thiết lập `background: #0f172a;` (Slate 950) cùng với viền mờ `border: 1px solid rgba(255,255,255,0.08);`.

### 2. Chuẩn hóa lại Typography & Liquid Blobs
- **Tiêu đề Trang:** Tìm `.header-content h1` (hoặc phần tử `h1` nơi chứa chữ "Metering Verification Report"). Nó đang quá to (~38px), hãy giảm xuống `font-size: 30px;` hoặc `32px` để chừa chỗ cho content.
- **Task Names:** Tìm class `.task-name` và `.category-header`, thêm `font-weight: 500;` để nổi bật tên công việc.
- **Blobs:** Tìm class `.blob` (hoặc `.blob-1`, `.blob-2`). Hạ opacity của chúng xuống ~`0.12` (thay vì 0.18 trở lên) để nền nhẹ nhàng hơn, không che chữ.

### 3. Đồng bộ lại Kích thước các Icons
- **Brand Logo:** Tìm icon `.brand-icon` hoặc `.control-center-icon` ở cục bên trái góc trên cùng (đang to ~40px). Đưa nó về `width: 32px; height: 32px; font-size: 16px;`.
- **Menu/Checklist Icons:** Tìm `.sidebar-nav i` hoặc các icon nhỏ bên phải. Đảm bảo chúng ở size chuẩn: `font-size: 16px;`.
- **KPI Row Icons:** Ở hàng 3 thẻ, tìm `.kpi-card i` (đang to ~24px). Chỉnh nó về trung bình `font-size: 22px;`.

### 4. Nâng cao Contrast ở Dark Mode (Task Completed)
Ở Dark mode, màu nền nhận biết của các "Task Completed" đang hơi tối (`rgba(13,105,87,0.15)`).
- **Yêu cầu:** Tìm rule `[data-theme="dark"] .task-item.is-completed` (hoặc `.task-row.is-completed`). Cập nhật thành:
```css
[data-theme="dark"] .task-item.is-completed {
    background: rgba(16, 185, 129, 0.15); /* Sáng hơn một chút */
    box-shadow: inset 4px 0 0 var(--success-color); /* Thêm 1 vạch line màu Xanh lá bên trái để rực lên */
}
```

Hãy thực thi việc **thay thế trực tiếp** vào CSS của `AVT_metering_checklist.html` và trả cho tôi output file hoặc block diff code. Xin nhớ: Tuân thủ rule **Anti-Jitter tuyệt đối**, chỉ sửa giao diện!
