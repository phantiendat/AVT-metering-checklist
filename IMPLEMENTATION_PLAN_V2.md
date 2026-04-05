# AVT Metering Checklist — V2 UI/UX Upgrade Plan (Lumina Industrial)

**Target File:** `AVT_metering_checklist.html`
**Reference Template:** `layout_v2_template.html`
**Executor:** Claude Sonnet / AI Assisant

Đây là bản thiết kế chiến lược và lộ trình từng bước để AI (Claude Sonnet) có thể thực thi việc viết code nâng cấp UI/UX cho ứng dụng `AVT_metering_checklist.html`, chuyển đổi lên giao diện 3-cột (Lưới 12-column) mang triết lý **"Lumina Industrial Fluid"** — tất cả trong 1 file HTML duy nhất.

---

## 🛑 GOLDEN RULES (CẤM VI PHẠM) CHO CLAUDE SONNET

1. **Anti-Jitter Rule (Tuyệt đối quan trọng)**:
   - **Không bao giờ dùng `innerHTML = ''`** để cập nhật trạng thái Checked/Unchecked của các task. Mọi vòng lặp render danh sách task gốc đã được fix để không rebuild DOM.
   - Trạng thái Checkbox / Status (Thành "Passed", "Active", "Pending") phải được thay đổi thông qua việc **add/remove class CSS trực tiếp** trên phần tử DOM hiện tại (ví dụ: `element.classList.add('passed')`).
2. **Kiến trúc Single-file**:
   - Mọi CSS, JS và HTML phải giữ nguyên trong file `AVT_metering_checklist.html`. KHÔNG TÁCH ra file ngoài.
   - Tất cả các thẻ `<style>` và `<script>` vẫn dùng như cũ.
3. **Giữ nguyên kết nối Firebase**:
   - Cấu trúc Data của Firebase không thay đổi. JS logic dùng Firebase SDK hiện tại (`firebase.database().ref()`) phải được bảo toàn 100%.

---

## 🛠️ ROADMAP THỰC THI (TIERS)

Hãy copy nội dung từng Tier dưới đây và ra lệnh cho Claude thực thi tuần tự để tránh rủi ro vỡ layout.

### TIER 4: NỀN TẢNG LAYOUT V2 (GRID & BLOBS)
*Tập trung vào cấu trúc vùng chọn (Containers) chứ chưa sửa nội dung chi tiết bên trong.*

**Nhiệm vụ của Claude:**
1. **CSS Root & Body:** 
   - Hợp nhất các biến đổi màu (`--primary-color`, vòng `glass-bg`...) từ `layout_v2_template.html` vào cục `:root` hiện hành.
   - Sửa CSS thẻ `body` thành dạng grid 3 cột: `grid-template-columns: 280px 1fr 340px; gap: 24px; padding: 20px;` (Nếu có `body` -> đổi thành wrapper `.app-container` thì tốt hơn. Chỉnh HTML bọc mọi thứ trong `.app-container` Grid layout này).
2. **Liquid Blobs Background:**
   - Thêm `<div class="blob-bg"><div class="blob blob-1"></div>...</div>` vào ngay dưới thẻ `<body>`.
   - Bổ sung khối CSS định nghĩa Animations (blobDrift) cho `blob` để tạo nền chất lỏng mờ.
3. **Cấu trúc Sidebar Trái:** 
   - Đổi style `.sidebar` cũ cho trùng khớp với thiết kế V2 (có background kính mờ `backdrop-filter: blur(24px)`, khối Brand Info có icon gradient, và Nav links trạng thái active).

---

### TIER 5: DASHBOARD THỐNG KÊ (KPIs & RIGHT SIDEBAR)
*Thêm các thành phần mới hoàn toàn nhằm nâng cấp từ một list checklist thông thường sang một "Control Center".*

**Nhiệm vụ của Claude:**
1. **Tạo khối Row 3 thẻ KPI (Main Header):**
   - Thêm HTML của khu vực `Target: 100%`, `Queue Status`, và `Overall Evidence` vào khoảng trống trên đầu thẻ `.main-content`.
   - Thêm CSS cho khối `.kpi-card` với các vòng sáng Glow-orb Neon ẩn dưới thẻ.
2. **Tạo Right Sidebar (Liquid Gauge):**
   - Xây dựng vùng `aside.right-sidebar` hoàn toàn mới ở cột 3.
   - Bơm CSS UI cho Khối "Overall Station Efficiency" (bình chứa chất lỏng đầy lên). 
   - *Lưu ý:* CSS thẻ này cần các thuộc tính Shadow hắt sáng (Neon Glow).

---

### TIER 6: MICRO-INTERACTIONS & CHECKLIST ROWS
*Sửa lại hàm `render Task` để sinh ra Component Card dạng thẻ (Task Row) mới, làm cho Checklist trở nên xịn sò như mẫu.*

**Nhiệm vụ của Claude:**
1. **Sửa Logic render Task ra DOM:**
   - Trong JS, tìm hàm render ra HTML của Task Item. Chuyển từ dạng `<div><input type="checkbox"><span>Name</span></div>` cơ bản sang mô hình `.task-row` phức tạp có Icon, Title, Subtitle, và thẻ trạng thái Status dot như trong V2 Template.
2. **Animation Hover & Clicks (Design Spells):**
   - CSS `.task-row:hover`: Đổi màu nền sáng, hiệu ứng `transform: translateX(4px)` mượt mà. Đổi màu icon góc trái.
   - CSS Status Dot (nhịp đập): Định nghĩa class `.status-dot.active` với animation `pulse 1.5s infinite`. Khi Task chưa check (Active), chấm sáng xanh điện đập. Khi check rồi (Passed), chấm thành xanh lá cây đứng yên.
3. **Logic Update (Anti-Jitter):**
   - Sửa hàm bắt sự kiện click: Khi Firebase update trạng thái checklist `true/false`, hàm update DOM chỉ được quyền đổi class text và đổi trạng thái của `.status-dot` thành `.passed`, tuyệt đối cấm dùng lại logic Render xóa DOM thay bằng chuỗi HTML mới.

---

### TIER 7: DARK MODE & DATA BINDING XUYÊN SUỐT
*Hoàn thiện sản phẩm gắn với CSDL thực để không bị dư code mẫu mock.*

**Nhiệm vụ của Claude:**
1. **Data Binding & Math Logic:**
   - Liên kết tiến trình thật (% Checklist hoàn thành) vào `Liquid Gauge` (Efficiency) ở cột phải. Công thức sẽ là: `height = (Tasks Completed / Total Tasks) * 100%`. Sử dụng selector DOM nội tại để gán thuộc tính `style="height: XX%"` khi Firebase có thay đổi.
   - Đếm số Lượng Queue Status (Tasks Pending) ở KPI Row thay vì số fix cứng.
2. **Dark Mode Variant System:**
   - Bổ sung rule css `[data-theme="dark"]` đè lên hoàn toàn Dashboard mới. Box shadow, border thẻ kính của Right Dashboard v.v... Cần tông màu Đen / Xanh đen (Slate 950) để làm nền bóng neon sáng rõ.
3. **Dọn dẹp mã Code:**
   - Format lại toàn bộ CSS, dọn các class rác cũ từ thời Sidebar v1 sang V2.
   - Chạy test kiểm tra xem file HTML không phát sinh warning nào ở console lúc Save/Load.

---

### TIER 8: VISUAL BALANCE & MICRO-REFINEMENTS (FINAL POLISH)
*Tinh chỉnh tỷ lệ, sự cân bằng và độ tương phản dựa trên phản hồi của Stitch Expert.*

**Nhiệm vụ của Claude:**
1. **Right Sidebar (Gauge Card):**
   - Loại bỏ nền xanh đen thẫm (`#0f172a`) của Right Sidebar trong Light Mode, đổi thành `var(--glass-bg)` với `backdrop-filter: blur(24px)` và viền kính để cân bằng với Left Sidebar.
   - Chỉ giữ nền tối này và các neon glows cho Dark Mode, thêm border mờ `rgba(255,255,255,0.08)` để tách lớp trong bóng tối.
2. **Typography & Hierarchy:**
   - Cập nhật `.header-content h1` giảm `font-size` xuống khoảng `30px`.
   - Cập nhật `.task-name` thêm thuộc tính `font-weight: 500` để các dòng công việc nổi bật hơn.
   - Thêm `opacity` hoặc giảm `filter: blur()` của các `blob-1`, `blob-2` xuống để tránh tranh chấp quyền đọc với chữ.
3. **Chuẩn hóa Icon Scale (16px - 24px):**
   - Thu nhỏ khung viền của Brand Icon `.brand-icon` ở sidebar xuống cỡ `32px` (hiện tại là ~40px).
   - Đảm bảo size icon ở `.sidebar-nav i` và `.kpi-row .gauge-card i` tương đương nhau ở mức `16px`.
   - Các icon ở khối `.kpi-card i` (giữa màn) chỉnh về mức đồng bộ `22px`.
4. **Dark Mode Contrast - Task Completed:**
   - Thay vì `rgba(13,105,87,0.15)` đang hơi tối, cập nhật rule cho `[data-theme="dark"] .task-item.is-completed` thành `background: rgba(16, 185, 129, 0.15)` để rõ ràng hơn. Đi kèm là một `border-left` sáng lên màu `var(--success-color)` để dễ nhìn dạng scan.

---

**Cách sử dụng Plan này với Claude Sonnet 4.6:**
> *"Prompt: Xin chào Claude, tôi đang cần nâng cấp file AVT_metering_checklist.html bằng dự án thiết kế V2. Dựa vào kế hoạch dưới đây, hãy giúp tôi viết code thực thi cho **TIER 4**, sau khi xong và chạy ổn định tôi sẽ yêu cầu tiếp **TIER 5**..."*
