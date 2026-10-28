# Kế hoạch website quản lý thu chi quán Mỳ Quảng

## 1. Mục tiêu

Xây dựng website nội bộ để hai người cùng quản lý thu chi của quán Mỳ
Quảng. Mỗi người có tài khoản đăng nhập riêng, cùng xem dữ liệu và báo
cáo chung.

Thông tin kinh doanh ban đầu:

-   Vốn ban đầu: **15.000.000 VNĐ**.
-   Người trực tiếp vận hành góp: **10.000.000 VNĐ**, tỷ lệ vốn
    **66,67%**.
-   Người chỉ góp vốn góp: **5.000.000 VNĐ**, tỷ lệ vốn **33,33%**.
-   Chỉ bán **một loại mỳ Quảng**, giá mặc định **25.000 VNĐ/tô**.
-   Người vận hành trực tiếp mua nguyên liệu, nấu, bán hàng và quản lý.
-   Không theo dõi tồn kho. Mọi khoản mua sắm, nguyên liệu và chi phí
    đều được nhập vào mục **Chi**.
-   Không cần phân loại tiền mặt/chuyển khoản.
-   Không tạo chức năng thu riêng cho nước hoặc mặt hàng khác. Mọi khoản
    thu đều nhập chung vào **Thu**.
-   Không theo dõi số dư tiền mặt, số dư ngân hàng hoặc khoản phải trả.

## 2. Chức năng

### 2.1. Đăng nhập và người dùng

-   Hai tài khoản đăng nhập riêng.
-   Mỗi người xem được toàn bộ sổ thu chi, báo cáo và lợi nhuận của
    quán.
-   Lưu người tạo và thời điểm tạo/sửa giao dịch.
-   Mật khẩu phải được backend băm an toàn; không lưu mật khẩu thuần.
-   Chỉ người dùng đã đăng nhập mới truy cập được dữ liệu.

### 2.2. Dashboard

Hiển thị các chỉ số theo ngày được chọn và theo tháng:

-   Tổng thu hôm nay.
-   Tổng chi hôm nay.
-   Chênh lệch thu - chi hôm nay.
-   Số tô mỳ bán hôm nay.
-   Doanh thu từ mỳ hôm nay.
-   Tổng thu, tổng chi và chênh lệch thu - chi trong tháng.
-   Tổng số tô đã bán trong tháng.
-   Lợi nhuận/chênh lệch thu chi lũy kế.
-   Phần phân chia tham khảo của từng người theo tỷ lệ vốn góp.

Không hiển thị số dư tiền mặt, số dư ngân hàng hay công nợ.

### 2.3. Ghi nhận bán mỳ

-   Một loại sản phẩm duy nhất: Mỳ Quảng.
-   Giá mặc định: 25.000 VNĐ/tô.
-   Người dùng nhập ngày bán và số tô bán được.
-   Hệ thống tự tính doanh thu = số tô × giá bán.
-   Doanh thu bán mỳ được ghi nhận vào sổ **Thu** tự động, không được
    ghi trùng lần nữa.
-   Cho phép chỉnh sửa bản ghi bán trong trường hợp nhập sai; việc sửa
    phải cập nhật khoản thu liên kết.
-   Mỗi ngày có thể có một bản tổng kết số tô, hoặc thiết kế theo nhiều
    lần nhập trong ngày nhưng báo cáo phải cộng tổng chính xác.
-   Nếu cho phép thay đổi giá trong tương lai, lưu giá bán thực tế tại
    bản ghi bán để dữ liệu cũ không bị thay đổi khi cập nhật giá mặc
    định.

### 2.4. Ghi nhận khoản Thu

Các trường: - Ngày thu. - Số tiền. - Nội dung/mô tả. - Ghi chú không bắt
buộc. - Người tạo và thời gian tạo/sửa.

Mọi khoản thu khác ngoài doanh thu mỳ cũng nhập tại đây. Không cần phân
loại nguồn thu, không cần phân loại tiền mặt/chuyển khoản.

### 2.5. Ghi nhận khoản Chi

Các trường: - Ngày chi. - Số tiền. - Nội dung/mô tả, ví dụ: mua thịt,
rau, mỳ, gia vị, gas, điện nước, mặt bằng, bàn ghế, nồi và dụng cụ. -
Ghi chú không bắt buộc. - Người tạo và thời gian tạo/sửa.

Không theo dõi tồn kho. Toàn bộ khoản mua nguyên liệu, dụng cụ, tài sản
và chi phí khác đều được ghi nhận là **Chi** theo yêu cầu. Vì vậy, báo
cáo thu trừ chi là chỉ số quản lý dòng thu chi, không nhất thiết tương
đương lợi nhuận kế toán chuẩn.

### 2.6. Báo cáo

-   Lọc giao dịch theo ngày, tháng và khoảng thời gian.
-   Báo cáo ngày: tổng thu, tổng chi, chênh lệch thu chi, số tô bán và
    doanh thu mỳ.
-   Báo cáo tháng: tổng thu, tổng chi, chênh lệch thu chi, tổng tô mỳ.
-   Báo cáo lũy kế từ ngày khai trương.
-   So sánh các tháng nếu cần.
-   Xuất Excel/CSV là chức năng có thể triển khai sau; không bắt buộc
    trong bản đầu nếu muốn giữ MVP gọn.

### 2.7. Vốn góp và tỷ lệ phân chia

Lưu thông tin vốn góp: - Người vận hành: 10.000.000 VNĐ. - Người góp
vốn: 5.000.000 VNĐ. - Tổng vốn: 15.000.000 VNĐ. - Tỷ lệ phân chia mặc
định: 66,67% và 33,33%.

Không tính vốn góp là khoản Thu kinh doanh. Không tính khoản góp vốn ban
đầu là lợi nhuận.

Tỷ lệ dùng để hiển thị phần lợi nhuận tham khảo: - Người vận hành:
66,67%. - Người góp vốn: 33,33%.

Khi cần chia lợi nhuận thực tế, hai người xác nhận số tiền và kỳ chia;
lưu lịch sử phân chia để tránh tính/chia lặp. Phần lợi nhuận được chia
không phải khoản chi vận hành thông thường, cần lưu riêng và không trừ
vào chỉ số lợi nhuận kinh doanh.

### 2.8. Lịch sử thao tác

-   Ghi nhận người tạo/sửa giao dịch.
-   Khuyến nghị không xóa cứng giao dịch; dùng xóa mềm hoặc lưu log thao
    tác.
-   Có thể ghi lại dữ liệu trước/sau khi sửa để hai người đối chiếu.

## 3. Quy tắc tính toán

-   **Doanh thu mỳ** = số tô × giá bán của bản ghi bán.
-   **Tổng thu** = tổng các giao dịch loại `income`, bao gồm khoản thu
    được tạo tự động từ bán mỳ.
-   **Tổng chi** = tổng các giao dịch loại `expense`.
-   **Chênh lệch thu chi** = tổng thu − tổng chi.
-   **Phần tham khảo người vận hành** = chênh lệch thu chi dương ×
    66,67%.
-   **Phần tham khảo người góp vốn** = chênh lệch thu chi dương ×
    33,33%.

Nếu chênh lệch thu chi âm, hiển thị lỗ; không tự động tạo khoản lợi
nhuận âm để chia. Cần thống nhất riêng cách xử lý lỗ và việc có chia lợi
nhuận hay không.

Không tính vốn góp là doanh thu. Không ghi doanh thu bán mỳ hai lần.
Giao dịch vốn góp, lịch sử phân chia lợi nhuận và giao dịch thu chi phải
tách biệt.

## 4. Đề xuất SQL PostgreSQL

Tạo các bảng: 1. `users`: tài khoản. 2. `businesses`: thông tin quán,
ngày khai trương, giá mỳ mặc định và tỷ lệ phân chia. 3.
`capital_contributions`: lịch sử góp vốn của mỗi người. 4.
`transactions`: sổ Thu/Chi chung. 5. `daily_sales`: ghi nhận số tô mỳ
bán theo ngày và giá bán thực tế. 6. `profit_distributions`: lịch sử
chia lợi nhuận. 7. `audit_logs`: lịch sử thao tác.

### SQL DDL

``` sql
BEGIN;

CREATE TABLE users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE businesses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL DEFAULT 'Quán Mỳ Quảng',
    opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_capital NUMERIC(15, 2) NOT NULL DEFAULT 15000000
        CHECK (initial_capital >= 0),
    noodle_price NUMERIC(12, 2) NOT NULL DEFAULT 25000
        CHECK (noodle_price >= 0),
    owner_profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 66.67
        CHECK (owner_profit_percent BETWEEN 0 AND 100),
    partner_profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 33.33
        CHECK (partner_profit_percent BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (owner_profit_percent + partner_profit_percent = 100)
);

CREATE TABLE capital_contributions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id),
    user_id BIGINT NOT NULL REFERENCES users(id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id),
    transaction_type VARCHAR(10) NOT NULL
        CHECK (transaction_type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    note TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual'
        CHECK (source_type IN ('manual', 'daily_sale')),
    source_id BIGINT,
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_transactions_business_date
    ON transactions (business_id, transaction_date);

CREATE INDEX idx_transactions_business_type_date
    ON transactions (business_id, transaction_type, transaction_date);

CREATE TABLE daily_sales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    noodle_quantity INTEGER NOT NULL CHECK (noodle_quantity >= 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 25000
        CHECK (unit_price >= 0),
    total_amount NUMERIC(15, 2)
        GENERATED ALWAYS AS (noodle_quantity * unit_price) STORED,
    note TEXT,
    income_transaction_id BIGINT UNIQUE REFERENCES transactions(id),
    created_by BIGINT NOT NULL REFERENCES users(id),
    updated_by BIGINT REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_daily_sales_business_date
    ON daily_sales (business_id, sale_date);

CREATE TABLE profit_distributions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_profit NUMERIC(15, 2) NOT NULL CHECK (total_profit >= 0),
    owner_amount NUMERIC(15, 2) NOT NULL CHECK (owner_amount >= 0),
    partner_amount NUMERIC(15, 2) NOT NULL CHECK (partner_amount >= 0),
    distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by BIGINT NOT NULL REFERENCES users(id),
    note TEXT,
    CHECK (period_end >= period_start),
    CHECK (owner_amount + partner_amount = total_profit)
);

CREATE INDEX idx_profit_distributions_business_period
    ON profit_distributions (business_id, period_start, period_end);

CREATE TABLE audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT REFERENCES businesses(id),
    user_id BIGINT REFERENCES users(id),
    action VARCHAR(20) NOT NULL
        CHECK (action IN ('create', 'update', 'delete')),
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_logs_business_created
    ON audit_logs (business_id, created_at DESC);

COMMIT;
```

### Lưu ý triển khai quan trọng

-   SQL trên chỉ tạo cấu trúc bảng, không có lệnh `INSERT` dữ liệu mẫu.
-   Backend phải đảm bảo khi tạo/sửa/xóa bản ghi `daily_sales`, khoản
    Thu liên kết trong `transactions` được tạo/cập nhật đồng bộ trong
    cùng một database transaction. Không được ghi doanh thu mỳ hai lần.
-   `source_type` và `source_id` dùng để phân biệt giao dịch nhập tay
    với giao dịch Thu tự động từ bán mỳ. Nên bổ sung ràng buộc hoặc
    logic backend để không tạo nhiều giao dịch Thu cho cùng một bản ghi
    bán.
-   Không cần tạo bảng tồn kho.
-   Không cần bảng riêng cho phương thức thanh toán.
-   Tỷ lệ 66,67% và 33,33% là tỷ lệ hiển thị/làm tròn. Nếu cần chia
    chính xác theo vốn 10/15 và 5/15, backend nên tính theo phân số
    `10/15` và `5/15`, sau đó làm tròn số tiền đến đồng và xử lý phần
    dư.
-   Không cộng vốn góp vào `transactions` loại `income`.
-   Các khoản mua sắm ban đầu được nhập vào `transactions` loại
    `expense` theo đúng yêu cầu. Vì vậy chỉ số thu trừ chi là chỉ số
    quản lý đơn giản; chi phí mua dụng cụ lớn có thể làm tháng khai
    trương có kết quả thấp hơn.
-   Bảo vệ các API bằng xác thực và phân quyền. Mật khẩu chỉ lưu dạng
    hash.

## 5. Gợi ý triển khai cho AI coding agent

Hãy đọc toàn bộ tài liệu này trước khi sửa code. Triển khai website quản
lý thu chi quán Mỳ Quảng theo các yêu cầu sau:

1.  Dùng PostgreSQL và tạo migration cho các bảng trong tài liệu.
2.  Xây dựng đăng nhập cho hai tài khoản, mật khẩu được hash an toàn.
3.  Xây dựng dashboard theo ngày/tháng, hiển thị tổng thu, tổng chi,
    chênh lệch thu chi, số tô mỳ và phần chia tham khảo.
4.  Xây dựng form nhập Thu và Chi đơn giản.
5.  Xây dựng form nhập số tô mỳ, giá mặc định 25.000 VNĐ/tô và tự ghi
    nhận khoản Thu liên kết.
6.  Đảm bảo sửa hoặc xóa bản ghi bán mỳ cập nhật khoản Thu tương ứng một
    cách nguyên tử.
7.  Xây dựng báo cáo lọc ngày/tháng và lịch sử giao dịch.
8.  Hiển thị vốn góp 10 triệu/5 triệu và tỷ lệ chia 66,67%/33,33%; không
    tính vốn góp là doanh thu.
9.  Không xây dựng tồn kho, quản lý phương thức thanh toán, công nợ,
    nhiều loại mỳ hoặc nhóm thu riêng cho nước/đồ uống.
10. Giao diện responsive, tiếng Việt, tối ưu cho điện thoại.
11. Không tự tạo dữ liệu giả trong môi trường production.
12. Viết hướng dẫn cấu hình môi trường, chạy migration, khởi động ứng
    dụng và tạo tài khoản ban đầu an toàn.

Trước khi viết code, hãy kiểm tra cấu trúc repository hiện tại và sử
dụng đúng stack đã có nếu dự án đã tồn tại. Nếu là dự án mới, đề xuất
stack rõ ràng rồi triển khai đồng bộ frontend, backend và database.
