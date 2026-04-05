# Kế hoạch và Tư vấn Giải pháp: Quản lý Session (Phiên làm việc)

Chào bạn, vấn đề bạn đang gặp phải là một tình huống rât kinh điển trong thiết kế UI/UX (Trải nghiệm người dùng) cho các ứng dụng dạng công cụ/công việc (productivity/workflow apps). Sự nhầm lẫn giữa việc "Đăng xuất tài khoản (Logout)" và "Chuyển đổi phiên làm việc (Switch Session)" rất thường xuyên xảy ra. 

Là một chuyên gia IT, tôi xin tư vấn và làm rõ quy trình logic này, sau đó đưa ra kế hoạch triển khai cụ thể cho dự án Lumina Industrial của bạn.

## 1. Phân Tích Logic: "User Logout" vs "Session Switch"

Trong các ứng dụng thực tế (như phần mềm đo đạc, quản trị dự án, POS), hai hành động này hoàn toàn khác nhau:
- **Logout (Đăng xuất người dùng):** Người dùng muốn rời khỏi hệ thống hoặc đổi quyền (ví dụ từ `Admin` sang `Inspector`). Khi ấn Logout, toàn bộ token/quyền truy cập sẽ bị xóa, bắt buộc phải nhập lại User/Password.
- **Switch Session (Chuyển đổi phiên làm việc/Dự án):** Người dùng giữ nguyên quyền hiện tại (vẫn là `Admin`), nhưng họ đã kiểm tra xong trạm đo A (Session A) và muốn chuyển sang làm trạm đo B (Session B).

👉 **Đối với câu hỏi của bạn về việc lưu session qua đêm:** 
Việc ngày hôm sau người dùng mở máy lên và **vẫn ở session cũ là một thiết kế UX cực kỳ tốt (gọi là Sticky Session)**. 
Trong thực tế, kỹ thuật viên có thể đang làm dở checklist hôm qua, tắt máy đi ngủ, hôm sau mở máy lên, hệ thống tiếp tục tải lại đúng trạng thái đang thao tác giúp họ tiết kiệm rất nhiều công sức. 
Nếu họ đã hoàn thành công việc ở session đó, họ chỉ cần nhấn nút **"Chuyển Session" (Switch Session)**. Không nên bắt họ phải đăng xuất/đăng nhập lại mỗi ngày.

## 2. Tư Vấn Giải Pháp UX/UI (Giao diện)

Để xử lý việc "phải xóa URL bằng tay", chúng ta tuyệt đối không dùng nút "Logout" cho việc này. Thay vào đó, chúng ta sẽ thêm một nút chuyên dụng cho việc **Quản lý Session**.

### Cách bố trí nút (UI Layout)
Dựa theo phong cách hiện tại của giao diện Lumina Industrial:
- **Tên nút:** `Switch Session`, `Change Project`, hoặc `Quản lý Phiên`.
- **Vị trí UI tốt nhất:**
  - **Trên Sidebar:** Ngay bên cạnh (hoặc phía trên) nút `[ 🚪 Logout ]`. Nút `Switch Session` sẽ đóng vai trò như việc đổi thư mục/đổi bài kiểm tra.
  - **Dưới Session ID:** Trên thanh Topbar ở giao diện hiện tại có hiển thị mã Session ID, việc thả một nút đổi chuyển ngay tại đó cũng rất phổ biến.

### Trải nghiệm khi thao tác (UX Flow)
Khi người dùng bấm nút "Switch Session":
1. Trình duyệt tự đồng bộ dữ liệu sau cùng (nếu còn sót).
2. Xóa param `?session=abc...` khỏi thanh địa chỉ (URL) tự động bằng JavaScipt (hoặc load lại trang gốc).
3. Pop-up **"Continue Session" (Resume Session Modal)** tự động hiện lên, y hệt như lúc bạn mới mở trang app nhưng xóa param URL.
4. Tại modal này, người dùng có thể **chọn tiếp một Session cũ** hoặc **gõ ID mới** để tiếp tục công việc.

---

## 3. Kế Hoạch Triển Khai Vào Mã Nguồn (Action Plan)

### Bước 1: Thêm Nút "Switch Session" vào Sidebar
Tôi sẽ vào file HTML, tìm phần Footer của Sidebar (nơi chứa nút Logout) và thêm một nút mới với icon kính lúp hoặc vòng tròn (e.g. `fas fa-exchange-alt`).
Làm nút màu Outline (nền trong suốt, viền xám) để tránh lấn lướt nút Primary và khác biệt với nút Logout (cảnh báo nguy hiểm).

### Bước 2: Viết Hàm Xử Lý `switchSession()`
Tại block Javascript trong file, hàm này sẽ được định nghĩa nội suy như sau:
```javascript
function switchSession() {
    // 1. Lưu lại các trạng thái hiện tại (nếu cần)
    
    // 2. Điều hướng (Redirect) về giao diện ban đầu (URL gốc, không có tham số)
    const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
    window.location.href = cleanUrl; 
    
    // 3. Khi trình duyệt load lại trang, do URL gốc không có param, Modal chọn/tạo Session sẽ hiển thị ra bình thường thay vi chạy thẳng vào view cũ
}
```

### Bước 3: Cải Tiến Thông báo Hoạt Động (Analytics / Logs)
Log lại sự kiện `"Đã chuyển sang màn hình chọn Session"` vào hệ thống Tracking Activity (cùng chung cơ chế `trackAction`) để Dashboard luôn ghi nhận hoạt động người dùng.

## Yêu Cầu Đánh Giá (User Review Required)

> [!IMPORTANT]
> **Vui lòng xác nhận trước khi tôi viết code:**
> 1. Bạn có đồng ý với logic UX và cách đặt nút **"Switch Session"** ở Sidebar ngay phía trên hoặc bên cạnh nút "Logout" không?
> 2. Có đúng là tính năng bạn cần là *chỉ thay đổi session đang hiển thị* nhưng *VẪN GIỮ NGUYÊN tài khoản (Admin/Client/Viewer)* đang đăng nhập không?
>
> Nếu bạn thấy hợp lý, cứ phản hồi "Đồng ý" hoặc điều chỉnh theo ý bạn, để tôi (hoặc Sonnet) tiến hành sửa mã nguồn trong file `AVT_metering_checklist.html`.
