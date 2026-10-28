# Deploy Sổ quán lên VPS bằng Docker Compose

Hướng dẫn production trên Ubuntu 22.04/24.04. Docker Compose chạy PostgreSQL, NestJS backend và React/Vite frontend; Nginx trên host proxy HTTPS về frontend container.

> **Quan trọng:** Không nạp các file `backend/scripts/mock-*.sql` lên production. PostgreSQL và backend không publish cổng ra Internet.

## 1. Chuẩn bị VPS/domain

Tạo bản ghi DNS `A` cho domain, ví dụ `soquan.example.com`, trỏ về IP VPS. SSH vào VPS:

```sh
ssh root@IP_VPS
```

Cập nhật hệ thống, cài Nginx, Certbot, firewall và Docker theo hướng dẫn chính thức cho Ubuntu:

```sh
apt update
apt upgrade -y
apt install -y ca-certificates curl gnupg nginx certbot python3-certbot-nginx ufw
```

Cài Docker Engine và Compose plugin: <https://docs.docker.com/engine/install/ubuntu/>.

Tạo user deploy, bật firewall chỉ cho SSH/HTTP/HTTPS:

```sh
adduser --disabled-password --gecos "" myquang
usermod -aG sudo myquang
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw enable
ufw status
```

Thiết lập SSH key cho user `myquang` trước khi tắt đăng nhập root/mật khẩu SSH. Không mở cổng `5432` hoặc `3000`.

## 2. Đưa source lên VPS

Clone repository hoặc đồng bộ source. Ví dụ từ máy local:

```sh
rsync -av \
  --exclude node_modules --exclude dist --exclude .env \
  /đường-dẫn/my-quang/ myquang@DOMAIN_VPS:/opt/my-quang/
```

Hoặc dùng Git:

```sh
sudo -u myquang git clone URL_REPOSITORY /opt/my-quang
```

```sh
chown -R myquang:myquang /opt/my-quang
```

Thay domain, đường dẫn và URL repository bằng thông tin thực tế. Không đưa file `.env` vào source control.

## 3. Cấu hình secrets/domain

Tạo file Compose environment:

```sh
sudo -u myquang cp /opt/my-quang/.env.example /opt/my-quang/.env
sudo -u myquang nano /opt/my-quang/.env
```

Ví dụ:

```dotenv
POSTGRES_PASSWORD=MAT_KHAU_DATABASE_NGAU_NHIEN_DAI
JWT_SECRET=CHUOI_NGAU_NHIEN_TOI_THIEU_32_KY_TU
FRONTEND_ORIGIN=https://soquan.example.com
APP_PORT=127.0.0.1:8080
```

- Thay password và JWT secret bằng giá trị ngẫu nhiên riêng; không dùng giá trị mẫu.
- Tạo JWT secret bằng `openssl rand -base64 48`.
- Chọn password PostgreSQL chỉ gồm ký tự chữ/số để tránh lỗi URL khi script quản trị kết nối database.
- `APP_PORT=127.0.0.1:8080` chỉ cho Nginx trên VPS truy cập frontend container.

Giới hạn quyền file:

```sh
chown myquang:myquang /opt/my-quang/.env
chmod 600 /opt/my-quang/.env
```

## 4. Build images và khởi động database

Compose có ba service:

- `db`: PostgreSQL chỉ trong private Docker network, lưu dữ liệu bằng volume `postgres_data`.
- `backend`: NestJS API, chỉ frontend container truy cập được.
- `frontend`: build React/Vite và phục vụ static bằng Nginx; proxy `/api` về backend.

Build images và khởi động database:

```sh
cd /opt/my-quang
docker compose build
docker compose up -d db
docker compose ps
docker compose logs --tail=50 db
```

Không xóa volume PostgreSQL trong quá trình deploy. Nếu đã có database từ lần chạy trước, không thay `POSTGRES_PASSWORD` tùy ý; cần đổi mật khẩu bên trong PostgreSQL rồi cập nhật `.env`.

## 5. Migration và tài khoản ban đầu

Chạy migration trên image backend:

```sh
docker compose run --rm backend npm run migrate:prod
```

Tạo tài khoản thứ nhất. Nhập password ẩn; không ghi mật khẩu trực tiếp vào shell history:

```sh
read -r -p "Username: " NEW_USERNAME
read -r -p "Họ tên: " NEW_FULL_NAME
read -r -s -p "Mật khẩu (ít nhất 12 ký tự): " NEW_PASSWORD
echo
export NEW_USERNAME NEW_FULL_NAME NEW_PASSWORD
docker compose run --rm -e NEW_USERNAME -e NEW_FULL_NAME -e NEW_PASSWORD backend npm run user:create:prod
unset NEW_USERNAME NEW_FULL_NAME NEW_PASSWORD
```

Lặp lại để tạo tài khoản thứ hai. Mật khẩu được bcrypt hash trước khi lưu; không có API đăng ký công khai.

## 6. Khởi động ứng dụng

```sh
cd /opt/my-quang
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend frontend
```

Healthcheck backend phải ở trạng thái `healthy`; frontend được khởi động sau backend. Có thể thử frontend trực tiếp tại `http://127.0.0.1:8080` từ VPS. Endpoint đăng nhập chưa xác thực trả `401` là bình thường:

```sh
curl -i http://127.0.0.1:8080/api/auth/me
```

## 7. Nginx và HTTPS

Tạo virtual host trên host:

```sh
nano /etc/nginx/sites-available/my-quang
```

Thay `soquan.example.com` bằng domain thật:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name soquan.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Bật cấu hình và cấp HTTPS:

```sh
ln -s /etc/nginx/sites-available/my-quang /etc/nginx/sites-enabled/my-quang
nginx -t
systemctl reload nginx
certbot --nginx -d soquan.example.com
certbot renew --dry-run
```

Chọn chuyển hướng HTTP sang HTTPS trong Certbot. Mở `https://soquan.example.com`, đăng nhập và thử ghi một khoản để kiểm tra toàn bộ ứng dụng.

## 8. Cập nhật phiên bản

Sao lưu database trước khi cập nhật. Đồng bộ source mới, giữ nguyên `.env`, sau đó:

```sh
cd /opt/my-quang
docker compose build
docker compose run --rm backend npm run migrate:prod
docker compose up -d
docker compose ps
docker compose logs --tail=100 backend frontend
```

Compose tạo lại các container với image mới, đồng thời giữ volume database. Nếu migration hoặc build thất bại, dừng deploy và xử lý lỗi; không xóa volume.

## 9. Backup/restore PostgreSQL

Tạo backup gzip chỉ root đọc được:

```sh
install -d -m 700 /var/backups/my-quang
cd /opt/my-quang
docker compose exec -T db pg_dump -U my_quang my_quang \
  | gzip > "/var/backups/my-quang/db-$(date +%F-%H%M).sql.gz"
```

Kiểm tra file backup có dung lượng khác 0 và định kỳ sao chép bản backup ra nơi lưu trữ riêng ngoài VPS. Restore cần bảo trì/downtime; xác minh đúng database đích trước khi thực hiện:

```sh
gunzip -c /var/backups/my-quang/TEN_FILE_BACKUP.sql.gz \
  | docker compose exec -T db psql -U my_quang -d my_quang
```

## Checklist bàn giao

- [ ] DNS trỏ đúng VPS, HTTPS hoạt động và tự gia hạn.
- [ ] Firewall chỉ mở SSH, 80, 443.
- [ ] `POSTGRES_PASSWORD`, `JWT_SECRET` là secrets riêng; `.env` có quyền `600`.
- [ ] PostgreSQL không publish cổng host; API chỉ truy cập qua frontend proxy.
- [ ] Migration đã chạy, hai tài khoản được tạo an toàn.
- [ ] Không nạp script `mock-*.sql` vào production.
- [ ] Ba container hoạt động; có quy trình backup và bản backup ngoài VPS.
