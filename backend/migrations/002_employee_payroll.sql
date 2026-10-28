ALTER TABLE transactions
  DROP CONSTRAINT IF EXISTS transactions_source_type_check;

ALTER TABLE transactions
  ADD CONSTRAINT transactions_source_type_check
  CHECK (source_type IN ('manual', 'daily_sale', 'employee_salary'));

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id),
  full_name VARCHAR(150) NOT NULL,
  monthly_salary NUMERIC(15, 2) NOT NULL DEFAULT 6000000 CHECK (monthly_salary > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_employees_business_active
  ON employees (business_id, is_active, full_name);

CREATE TABLE IF NOT EXISTS employee_salary_payments (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  employee_id BIGINT NOT NULL REFERENCES employees(id),
  payroll_month DATE NOT NULL,
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  transaction_id BIGINT NOT NULL UNIQUE REFERENCES transactions(id),
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (employee_id, payroll_month),
  CHECK (EXTRACT(DAY FROM payroll_month) = 1)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_employee_salary_source
  ON transactions (source_id) WHERE source_type = 'employee_salary';
