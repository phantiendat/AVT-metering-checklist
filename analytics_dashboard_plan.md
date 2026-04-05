# Kế hoạch Nâng cấp: Thiết kế lại Analytics Dashboard Modal (Lumina Industrial)

Dành cho: **Claude Sonnet 4.6**
Project: **AVT Metering Verification Dashboard**
Kiến trúc sư: **Antigravity**

---

## 1. Đánh giá nhận định của Stitch Google & Hiện trạng
Nhận định của Stitch Google về phong cách **Lumina Industrial** (Glassmorphism, màu Deep Electric Blue, Typography kỹ thuật) là **cực kỳ chính xác và xuất sắc** để tạo ra một giao diện premium. 
- Mặc dù Stitch có đề cập đến cấu trúc Grid 3 Cột, nhưng hệ thống lưới chính của ứng dụng bạn đã hoàn thiện rất tốt. Do đó, yêu cầu của thiết kế Lumina sẽ được áp dụng **trực tiếp vào bên trong Modal Popup** hiện hành để tô điểm cho khu vực hiển thị số liệu mà không làm phá vỡ flow tổng thể của hệ thống.
- Modal Analytics sẽ được khoác lên ngôn ngữ thiết kế "Glassmorphism" (Kính mờ) kết hợp với các vệt sáng neon tĩnh (Glow Orb).

---

## 2. Kế hoạch Code cho Claude Sonnet 4.6 (Implementation Plan)

### Phase 1: Nâng cấp Visual Design theo Lumina Industrial cho Modal
- [ ] **Glass KPI Cards (6 Thẻ):**
  - Chuyển class `.an-card` sang thiết kế Glassmorphism: `background: rgba(255,255,255,0.65)` ở Light Mode và `rgba(15,23,42,0.70)` ở Dark Mode. Chữ số hiển thị rõ nét với `backdrop-filter: blur(24px)` và `border: 1px solid var(--glass-border)`.
  - Thêm thẻ `div` dạng `glow-orb` ở góc thẻ, với `opacity: 0.2`, màu glow tương ứng với trạng thái (Primary Accent, Success, Warning).
  - Định dạng con số hiển thị dùng `var(--font-display)` (Space Grotesk), kích thước to (32px), `font-weight: 700`.

- [ ] **Protocol Category Breakdown (Table):**
  - Cải tiến trải nghiệm Hover: Khi chuột lướt vào hàng (`tr:hover`), tạo hiệu ứng `transform: translateX(5px)`, viền trái đổi sang màu Primary Accent.
  - Progress Bars: Thay thế số liệu % thô bằng thanh Progress mảnh (6px) có bo góc và đổ màu gradient từ trái sang phải. (Nên dùng `.an-mini-bar-wrap` có sẵn nhưng đổi CSS sang dạng bo tròn neon).

- [ ] **Log Panels (Missing Evidence & Recent Activity):**
  - Bọc khu vực Log và Missing Evidence vào trong một card Glass Panel để đồng bộ với các thẻ phía trên.
  - Timestamp (thời gian log) format font sang `var(--font-mono)` (IBM Plex Mono).

### Phase 2: Áp dụng CSS và Animation Cục bộ (Tránh Jitter)
- [ ] Mọi CSS mới phải tuân thủ chuẩn "Anti-Jitter" của dự án (chỉ dùng CSS Transform/Opacity, KHÔNG render lại innerHTML cùa các thành phần nếu không cần thiết).
- [ ] Không rờ tới logic gọi Firebase. Chỉ decor phần UI hiển thị bằng cách gắn class CSS và tinh chỉnh class có sẵn.

---

## 3. Câu lệnh Prompt đề xuất copy cho Sonnet 4.6

> *"Chào Sonnet, tôi cần bạn nâng cấp giao diện Modal `Analytics Dashboard` (`#analytics-modal`) trong file `AVT_metering_checklist.html`, áp dụng thiết kế Lumina Industrial (Glassmorphism, High-Precision). Layout tổng của web vẫn giữ nguyên, chỉ xử lý lại các component UI UX BÊN TRONG CÁI POPUP MODAL thôi nhé. Đọc file `analytics_dashboard_plan.md` ở folder để xem chi tiết.
> **Các việc cụ thể bạn cần implement bằng HTML/CSS:**
> 1. Chuyển 6 thẻ con KPI (`.an-card`) thành Glassmorphism: nền kính mờ (`backdrop-filter: blur(24px)`). Các tấm thẻ cần bổ sung một góc đổ bóng sáng nhẹ (`glow-orb` opacity 0.2 mờ ảo), typo số liệu to dùng `var(--font-display)` Space Grotesk size 32px.
> 2. Nâng cấp bảng Category Breakdown bên trong modal: Hover qua các hàng `tr` thì hàng đó trượt mượt sang phải 5px (`transform: translateX(5px)`) và hiện viền màu mép trái. 
> 3. Trong bảng Breakdown, thay background thanh progress xám thành thanh Progress Gradient mảnh 6px.
> 4. Làm gọn phần Missing Evidence & Recent Activity phía dưới table bằng cách bọc 2 khối này vào khung Glassmorphism có viền tinh tế nhìn premium chuyên nghiệp."*
