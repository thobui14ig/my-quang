# Sổ quán Mỳ Quảng

Ứng dụng quản lý thu chi dùng NestJS, React + Vite và PostgreSQL. Giao diện tiếng Việt, tối ưu điện thoại; không theo dõi tồn kho, phương thức thanh toán, công nợ hay số dư tiền.

Hướng dẫn triển khai Ubuntu VPS: [DEPLOY-VPS.md](./DEPLOY-VPS.md).

## Yêu cầu

- Docker Engine và Docker Compose plugin
- Node.js 20+ nếu chạy frontend/backend trực tiếp để phát triển
- npm

## Chạy toàn bộ stack bằng Docker Compose

```sh
cp .env.example .env
# Sửa POSTGRES_PASSWORD và JWT_SECRET thành giá trị ngẫu nhiên riêng.
docker compose build
docker compose up -d db
docker compose run --rm backend npm run migrate:prod
docker compose up -d
```

Frontend tại <http://localhost:8080>; đường dẫn `/api` được Nginx trong container frontend chuyển tiếp tới NestJS. PostgreSQL chỉ nằm trong network nội bộ Compose, không publish cổng ra host.

Tạo riêng hai tài khoản, nhập thông tin khi được hỏi:

```sh
read -r -p "Username: " NEW_USERNAME
read -r -p "Họ tên: " NEW_FULL_NAME
read -r -s -p "Mật khẩu (ít nhất 12 ký tự): " NEW_PASSWORD
echo
export NEW_USERNAME NEW_FULL_NAME NEW_PASSWORD
docker compose run --rm -e NEW_USERNAME -e NEW_FULL_NAME -e NEW_PASSWORD backend npm run user:create:prod
unset NEW_USERNAME NEW_FULL_NAME NEW_PASSWORD
```

Lặp lại để tạo tài khoản thứ hai. Mật khẩu được bcrypt hash; không có đăng ký công khai.

## Chạy trực tiếp khi phát triển

Nếu muốn dùng Vite hot reload thay vì Docker frontend:

1. Khởi động PostgreSQL bằng Compose: `docker compose up -d db`.
2. Cấu hình `backend/.env` từ `.env.example` của backend với `DATABASE_URL` trỏ đến localhost và JWT secret riêng.
3. Trong `backend/`, chạy `npm ci`, `npm run migrate`, rồi `npm run start:dev`.
4. Trong `frontend/`, chạy `npm ci`, cấu hình `VITE_API_URL=http://localhost:3000/api`, rồi `npm run dev`. Giao diện mở tại <http://localhost:5173>.

Migration tạo schema và cấu hình quán theo yêu cầu: vốn 15 triệu (10 triệu/5 triệu), giá mỳ mặc định 25.000 đồng. Không tạo tài khoản hoặc giao dịch giả.

Các image Compose chạy dưới Node/Nginx riêng; PostgreSQL và API không publish cổng host. `docker compose run --rm backend npm run migrate:prod` chạy migration đã biên dịch trong image production.

## Build production

```sh
cd backend && npm run build
cd ../frontend && npm run build
```

Chạy backend bằng `npm start` sau khi build. Đặt `DATABASE_URL`, `JWT_SECRET`, `FRONTEND_ORIGIN` và `PORT` qua secret manager/environment của môi trường deploy; không đưa `.env` vào source control. Chạy `npm run migrate` trước khi khởi động phiên bản mới.

### Dữ liệu demo (chỉ môi trường local/dev)

Có thể nạp dữ liệu mẫu các tháng 7–10/2026 sau khi migrate và tạo tài khoản:

```sh
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/mock-july-2026.sql
# Tháng 8 và 9:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/mock-august-september-2026.sql
# Tháng 10:
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/mock-october-2026.sql
```

Script ghi nhận bán mỳ mỗi ngày trong tháng (tháng 7: 01–31; tháng 10: 01–28), tối đa 50 tô/ngày, cùng một số khoản chi mẫu. Các khoản demo được gắn nhãn `MOCK:YYYY-MM` để không bị thêm trùng khi chạy lại. Không chạy script này trên production.

## Quy tắc dữ liệu

- Bản ghi bán mỳ lưu đơn giá tại thời điểm ghi nhận, đồng thời tạo khoản Thu liên kết trong cùng transaction PostgreSQL. Sửa/xóa bản bán cập nhật/xóa mềm khoản Thu liên kết nguyên tử.
- Khoản thu, chi nhập tay được sửa/xóa mềm; thao tác tạo/sửa/xóa được ghi vào `audit_logs`.
- Danh sách nhân viên lưu tên; mỗi khoản tiền trả lưu số tiền và tháng. Tạo/sửa/xóa khoản trả đồng bộ khoản Chi liên kết trong cùng database transaction; mỗi nhân viên chỉ có một khoản trả mỗi tháng.
- Vốn góp không phải doanh thu. Phần chia trên dashboard chỉ là tham khảo, tính theo tỷ lệ vốn thực tế; phân chia lợi nhuận thực tế chưa được tự động hóa.
- Không có API đăng ký công khai. Chỉ tài khoản được provision bằng lệnh quản trị mới đăng nhập được.

## API chính

`POST /api/auth/login`, `GET /api/auth/me`, `GET /api/business`, `GET /api/dashboard?date=YYYY-MM-DD`, `GET /api/reports?from=YYYY-MM-DD&to=YYYY-MM-DD`, cùng các endpoint `/api/transactions`, `/api/sales` và `/api/employees`. Quản lý nhân viên bằng `GET/POST /api/employees`, `PATCH/DELETE /api/employees/:id`; quản lý khoản đã trả tại `/api/employees/:id/payments` với `month: "YYYY-MM-01"` và `amount`. Trừ đăng nhập, API yêu cầu Bearer JWT.
