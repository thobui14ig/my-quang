CREATE TABLE
  IF NOT EXISTS users (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );

CREATE TABLE
  IF NOT EXISTS businesses (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    name VARCHAR(200) NOT NULL DEFAULT 'Quán Mỳ Quảng',
    opening_date DATE NOT NULL DEFAULT CURRENT_DATE,
    initial_capital NUMERIC(15, 2) NOT NULL DEFAULT 18000000 CHECK (initial_capital >= 0),
    noodle_price NUMERIC(12, 2) NOT NULL DEFAULT 25000 CHECK (noodle_price >= 0),
    owner_profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 83.33 CHECK (owner_profit_percent BETWEEN 0 AND 100),
    partner_profit_percent NUMERIC(5, 2) NOT NULL DEFAULT 16.67 CHECK (partner_profit_percent BETWEEN 0 AND 100),
    operator_capital NUMERIC(15, 2) NOT NULL DEFAULT 15000000 CHECK (operator_capital >= 0),
    partner_capital NUMERIC(15, 2) NOT NULL DEFAULT 3000000 CHECK (partner_capital >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    CHECK (
      owner_profit_percent + partner_profit_percent = 100
    ),
    CHECK (
      operator_capital + partner_capital = initial_capital
    )
  );

INSERT INTO
  businesses (name)
SELECT
  'Quán Mỳ Quảng'
WHERE
  NOT EXISTS (
    SELECT
      1
    FROM
      businesses
  );

CREATE TABLE
  IF NOT EXISTS transactions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses (id),
    transaction_type VARCHAR(10) NOT NULL CHECK (transaction_type IN ('income', 'expense')),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    description VARCHAR(255) NOT NULL,
    note TEXT,
    transaction_date DATE NOT NULL DEFAULT CURRENT_DATE,
    source_type VARCHAR(30) NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'daily_sale')),
    source_id BIGINT,
    created_by BIGINT NOT NULL REFERENCES users (id),
    updated_by BIGINT REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX IF NOT EXISTS idx_transactions_business_date ON transactions (business_id, transaction_date)
WHERE
  deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_business_type_date ON transactions (business_id, transaction_type, transaction_date)
WHERE
  deleted_at IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_daily_sale_source ON transactions (source_id)
WHERE
  source_type = 'daily_sale';

CREATE TABLE
  IF NOT EXISTS daily_sales (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses (id),
    sale_date DATE NOT NULL DEFAULT CURRENT_DATE,
    noodle_quantity INTEGER NOT NULL CHECK (noodle_quantity >= 0),
    unit_price NUMERIC(12, 2) NOT NULL DEFAULT 25000 CHECK (unit_price >= 0),
    total_amount NUMERIC(15, 2) GENERATED ALWAYS AS (noodle_quantity * unit_price) STORED,
    note TEXT,
    income_transaction_id BIGINT UNIQUE REFERENCES transactions (id),
    created_by BIGINT NOT NULL REFERENCES users (id),
    updated_by BIGINT REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    deleted_at TIMESTAMPTZ
  );

CREATE INDEX IF NOT EXISTS idx_daily_sales_business_date ON daily_sales (business_id, sale_date)
WHERE
  deleted_at IS NULL;

CREATE TABLE
  IF NOT EXISTS capital_contributions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses (id),
    user_id BIGINT NOT NULL REFERENCES users (id),
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    contribution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    note TEXT,
    created_by BIGINT REFERENCES users (id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );

CREATE TABLE
  IF NOT EXISTS profit_distributions (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT NOT NULL REFERENCES businesses (id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_profit NUMERIC(15, 2) NOT NULL CHECK (total_profit >= 0),
    owner_amount NUMERIC(15, 2) NOT NULL CHECK (owner_amount >= 0),
    partner_amount NUMERIC(15, 2) NOT NULL CHECK (partner_amount >= 0),
    distributed_at TIMESTAMPTZ NOT NULL DEFAULT NOW (),
    created_by BIGINT NOT NULL REFERENCES users (id),
    note TEXT,
    CHECK (period_end >= period_start),
    CHECK (owner_amount + partner_amount = total_profit)
  );

CREATE INDEX IF NOT EXISTS idx_profit_distributions_business_period ON profit_distributions (business_id, period_start, period_end);

CREATE TABLE
  IF NOT EXISTS audit_logs (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    business_id BIGINT REFERENCES businesses (id),
    user_id BIGINT REFERENCES users (id),
    action VARCHAR(20) NOT NULL CHECK (action IN ('create', 'update', 'delete')),
    table_name VARCHAR(100) NOT NULL,
    record_id BIGINT,
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW ()
  );

CREATE INDEX IF NOT EXISTS idx_audit_logs_business_created ON audit_logs (business_id, created_at DESC);