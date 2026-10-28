CREATE TABLE IF NOT EXISTS cash_movements (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id),
  movement_type VARCHAR(20) NOT NULL CHECK (movement_type IN ('contribution', 'withdrawal')),
  amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
  movement_date DATE NOT NULL DEFAULT CURRENT_DATE,
  note TEXT,
  created_by BIGINT NOT NULL REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_cash_movements_business_date
  ON cash_movements (business_id, movement_date DESC)
  WHERE deleted_at IS NULL;
