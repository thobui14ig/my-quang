ALTER TABLE employee_salary_payments
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE employee_salary_payments
  DROP CONSTRAINT IF EXISTS employee_salary_payments_employee_id_payroll_month_key;

CREATE UNIQUE INDEX IF NOT EXISTS idx_employee_salary_payments_employee_month_active
  ON employee_salary_payments (employee_id, payroll_month)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_employee_salary_payments_employee_month
  ON employee_salary_payments (employee_id, payroll_month DESC)
  WHERE deleted_at IS NULL;
