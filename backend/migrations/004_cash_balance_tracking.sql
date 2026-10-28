ALTER TABLE businesses
  ADD COLUMN IF NOT EXISTS cash_opening_balance NUMERIC(15, 2) NOT NULL DEFAULT 0
    CHECK (cash_opening_balance >= 0),
  ADD COLUMN IF NOT EXISTS cash_opening_date DATE NOT NULL DEFAULT CURRENT_DATE;
