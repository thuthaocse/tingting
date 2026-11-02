# Quy tắc nghiệp vụ

- Chọn tên từ danh sách admin; thiết bị ghi nhớ lựa chọn theo từng nhóm.
- Khách có link chỉ xem. Người đăng nhập Google xem tất cả nhóm và sửa giao dịch. Admin được tạo/quản lý nhóm và thành viên. Tài khoản có vai trò Chỉ tạo nhóm được tạo nhóm nhưng không có quyền quản trị. thuthao.cse@gmail.com là admin gốc, admin có thể cấp/thu hồi vai trò theo email Google.
- Khoản chi có một người trả và ít nhất một người cùng chia. Người trả không bắt buộc tham gia chia.
- Mặc định chia đều cho tất cả. Phần dư 1 đồng được phân bổ theo UUID tăng dần.
- Số dư = đã trả cho khoản chi − phần chia + thanh toán đã gửi − thanh toán đã nhận.
- Công nợ trực tiếp được bù trừ theo cặp; đơn giản hóa dùng số dư ròng của toàn nhóm.
- Khi bật đơn giản hóa, một người thường chỉ cần trả hoặc được nhận theo số dư ròng. Khi tắt, có thể có cả hai mục. Cả hai chế độ luôn bảo toàn số dư từng người.
- Ghi nhận thanh toán không chuyển tiền thật. Cho phép trả một phần hoặc khoản thanh toán thực tế lớn hơn đề xuất; phần vượt tạo số dư ngược chiều.
- Sửa/xóa giao dịch tính lại toàn bộ số dư. Không cộng tiền thanh toán nợ vào tổng chi.
- Thành viên đã có giao dịch không thể bị xóa. Nhóm lưu trữ chỉ đọc nhưng có thể mở lại bởi admin.
- Link mới vô hiệu hóa link cũ. Tài khoản Google được liên kết với thành viên theo email đã xác minh; chọn tên chỉ đổi góc nhìn.

- Hoạt động xếp theo ngày giao dịch giảm dần. Trong cùng ngày, thứ tự nhập mới nhất đứng trước, dùng bộ đếm chung cho khoản chi và thanh toán. Sửa giao dịch không thay đổi bộ đếm này; UUID không quyết định thứ tự.

- Link nhóm dùng mã ngẫu nhiên 16 ký tự. Các link dài cũ vẫn hoạt động sau khi rút gọn. Khi admin chủ động đổi liên kết, cả link hiện tại và các link cũ của nhóm đều bị vô hiệu hóa.

- Home tính tổng cần trả và được nhận từ nợ đã đơn giản hóa của các nhóm đang hoạt động, không bù trừ giữa các nhóm. Mở từng mục để xem người và nhóm tương ứng.
- Email không khớp hoặc trùng nhiều thành viên: hiển thị chưa liên kết, không tuyên bố đã hết nợ. Chỉ admin cập nhật email thành viên.
