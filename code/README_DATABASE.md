# Database TTTN_MIS_04

## Database mới
Chạy `schema.sql`, sau đó `seed.sql`.

## Database đã có dữ liệu
Không DROP database. Chạy `migration_existing.sql` để bổ sung Check-in.

Migration tự kiểm tra cột trước khi thêm và tạo `checkin_code` cho Event cũ.

## Tài khoản demo
Sau khi database có đủ bảng/role, vào backend và chạy:

`npm run setup:test-users`

Tất cả tài khoản demo dùng mật khẩu `123456`.
