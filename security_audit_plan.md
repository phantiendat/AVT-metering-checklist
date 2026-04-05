# Kế Hoạch Triển Khai & Nâng Cấp Bảo Mật

Kế hoạch này dựa trên cuộc kiểm tra bảo mật (security audit) thực hiện từ các kỹ năng `007` (Licenca Para Auditar) và `security-auditor`. Mục tiêu là tăng cường bảo mật cho dự án AVT Metering Checklist chống lại các lỗ hổng phổ biến, nhưng tuyệt đối không làm thay đổi chức năng cốt lõi hoặc làm phát sinh lại các lỗi (bug) đã được sửa trước đó (ví dụ: giao diện quản lý template, logic chuyển đổi session).

## Yêu Cầu Người Dùng Đánh Giá

> [!WARNING]
> Vui lòng xem xét các thay đổi bảo mật được đề xuất để đảm bảo chúng phù hợp với môi trường triển khai thực tế của bạn. Cụ thể, các Quy tắc Bảo mật của Firebase (Firebase Security Rules) sẽ bị siết chặt hơn so với hiện tại, và logic cho mật khẩu "expert" (chuyên gia) vốn đang để lộ hoàn toàn trong code (plaintext) sẽ phải được chuyển sang thuật toán băm mật khẩu ở phía máy khách (Client-side hash).

## Các Thay Đổi Đề Xuất

### 1. Siết chặt Quy tắc Bảo mật Firebase (Firebase Security Rules)

Hiện tại, `firebase.rules.json` đang cấp quyền đọc/ghi (read/write) mở rộng cho bất kỳ ai.

#### [MODIFY] [firebase.rules.json](file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/firebase.rules.json)
- **Tình trạng hiện tại:** `.read: true`, `.write: true` cho cả nhánh `sessions` và `templates`.
- **Giải pháp đề xuất:** Giới hạn lại các cấu trúc kiểu dữ liệu (schemas) và thêm các quy tắc kiểm tra (validation) nghiêm ngặt để ngăn chặn việc chỉnh sửa (manipulate) payload/dữ liệu. Do ứng dụng hiện tại không triển khai hệ thống Đăng nhập Firebase (Firebase Authentication) chính thức, chúng ta sẽ bắt buộc xây dựng giới hạn cấu trúc dữ liệu để hacker không thể đẩy lên các nhánh độc hại hay đưa vào dữ liệu khổng lồ nhằm làm sập hệ thống (Overload data).
  * Quy định giới hạn độ dài chuỗi tối đa cho tên mẫu (template `name`) lớn nhất là 80 ký tự và dữ liệu session (`metadata`).
  * Đảm bảo người dùng chỉ có thể tùy chỉnh các thuộc tính (properties) nằm đúng trong bộ khung mà ứng dụng kỳ vọng có mặt.

### 2. Xác thực và Quản lý Lộ lọt Thông tin (Authentication & Secrets)

Mật khẩu để vào tài khoản "expert" hiện tại đang bị fix cứng lại lộ liễu (hardcoded) ngay trên code giao diện của người dùng (JavaScript frontend).

#### [MODIFY] [AVT_metering_checklist.html](file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/AVT_metering_checklist.html)
- **Tình trạng hiện tại:** Hàm `authenticate(role)` đi so sánh chuỗi mật khẩu gõ vào với chữ `"expert"`.
- **Giải pháp đề xuất:** 
  * Thay thế cơ chế kiểm tra lộ liễu kia bằng cơ chế tính mã Hash SHA-256 (sử dụng hàm API Web Crypto có sẵn trực tiếp của trình duyệt).
  * Mỗi khi điền mật khẩu, phần chữ gõ sẽ được băm (hashed) thành một đoạn mã dị biệt và dùng nó để so khớp với đoạn dải mã (ví dụ `b50cd2dd22...`) đã biết từ trước.
  * *Lưu ý: Mặc dù cách này chưa thực sự chống lại được các cuộc dịch ngược chuyên môn sâu (do mọi logic tính toán vẫn xảy ra ở browser), nhưng nó hoàn toàn cản được các con bot dò quét rà mật khẩu và ngăn không còn hiển thị nguyên một dòng mật khẩu thô dễ đoán trong tệp mã.*
- **Duy trì bản vá lỗi cũ (Maintain Bugfix):** Đảm bảo hàm `authenticate` sửa dụng sau đó vẫn phải hiện được ra nút "Switch Session" cho tài khoản `view`, y hệt như bản vá mà chúng ta đã làm từ luồng phiên xử lý trước.

### 3. Ngăn Chặn Mã Độc XSS (Cross-Site Scripting Prevention)

Dữ liệu do người dùng nhập vào (user-generated content) ví dụ như "Tên Category", "Tên Task" hay "Tiêu đề gửi Feedback" đang được đổ ngược thẳng ra hiển thị (DOM) qua hàm `.innerHTML` tiềm ẩn rủi ro tiêm nhiễm mã độc (XSS payload).

#### [MODIFY] [AVT_metering_checklist.html](file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/AVT_metering_checklist.html)
- **Tình trạng hiện tại:** Cách gán cho DOM như `categoryDiv.innerHTML` hoặc `taskDiv.innerHTML` thực tế đang bị trói buộc với giá trị giá trị giá trị thô người nhập (raw values).
- **Giải pháp đề xuất:** 
  * Tái cấu trúc cơ chế thêm nội dung, loại bỏ sử dụng `.innerHTML` ở những biến giá trị nhạy cảm thay qua qua API `document.createElement()` đi kèm câu lệnh chuẩn và an toàn `el.textContent`.
  * Viết một hàm bổ trợ làm sạch chuỗi `escapeHTML()` nhằm bao bọc làm "tù binh" các giá trị biến thiên (dynamic data) trước khi dùng nối chuỗi nếu kẹt phải dùng `innerHTML` ở một số trường hợp.

### 4. Kiểm Soát Việc Submit "Hỗ Trợ" Quá Đạt (Support Feedback Rate Limiting)

Do API ở sau (EmailJS) đang giới hạn số yêu cầu ở tài khoản miễn phí, kẻ xấu hoàn toàn có quyền viết bot lạm dụng spam đẩy các đơn form feedback tới chết limit.

#### [MODIFY] [AVT_metering_checklist.html](file:///c:/Users/dat-b/Documents/AVT%20metering%20checklist/AVT_metering_checklist.html)
- **Tình trạng hiện tại:** Mã submit hàm `handleSupportSubmit()` không gắn lớp kiểm tra cản (unlimited submissions).
- **Giải pháp đề xuất:**
  * Triển khai cản Rate-Limit cục diện máy khách (Giới hạn thí dụ: Cấm ném quá 1 form tính trong khoảng 5 phút).
  * Code sẽ được ghim lại thời khắc mốc dập thời gian gần nhất của gửi mẫu (timestamp) trong khoang `sessionStorage`. Nếu rà biết là bấm thêm quá sát nút sẽ treo khóa nút Gửi thư hoặc nhảy dòng hiện Lỗi phản ánh (Error Modal).

---

## Xác Nhận Bổ Sung Từ Các Thống Nhất Ý Kiến (User Decisions)

> [!NOTE]
> 1. **Về Firebase Authentication:** App quyết định chưa/không ứng dụng Đăng nhập Firebase. Do đó, cơ chế chặn lỗi (Validation Rules) dựa trên cấu trúc dữ liệu sẽ được triển khai cứng để tạo màng chắn phòng ngự duy nhất. 
> 2. **Về Giới hạn dữ liệu Tên Template:** Đã xác nhận chuẩn hóa giới hạn ở mức **80 ký tự** thay vì 100 ký tự.

## Kế Hoạch Đánh Giá & Thử Đo Lường Chất Lượng Chốt Cuối (Verification Plan)

### Bài Test Thủ Công
1. **Thử Đăng Nhập:** Chủ đích đánh pass ngầm gõ sai vào giao diện nhằm xem nó nhảy Lỗi. Thử gỡ pass lại đúng đối chiếu coi hệ thống chấp nhập. Bật trở ra vào danh nghĩa role "view" lại nhìn nhận cằm nút "Switch Session" đã được trả về hay không bị che.
2. **Kịch Bản Bảo Vệ XSS:** Chủ đích bật modal viết Task, đặt nguyên vẹn tên task là mã `<script>alert(1)</script>` để kiểm nghiệm rằng khi hiển thị giao diện phần đó chỉ in ra bằng text thô, chứ không kích chạy được hiện tab Window hộp thoại báo cáo lên.
3. **Thử Bắn Gửi Hỗ Trợ Spam:** Chủ động hoàn thành Support feedback qua nút Hỗ Trợ bên lề trái. Hoàn thiện Form để gửi một thư, và đè bấm tiếp một lần 2 sau khi thư 1 kết thúc ngay. Form cần đáp lại bằng hiển thị chặn Lạm Dụng thay vì nhận gửi thêm 1 lá nữa.
4. **Viết Data vào DB Rules Firebase:** Thể nghiệm nhấn Nút "Lưu Cấu Hình Mẫu" (Save Pattern Template) với độ dài chuẩn để xem có báo OK bình thường với database. Cố đặt tên dài thượt trên 150 ký tự coi có chặn lại không mắc mưu Database.
