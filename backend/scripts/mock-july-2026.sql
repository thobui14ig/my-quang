-- Development/demo data only. Do not run this in production.
-- Adds one sale per day from 2026-07-01 through 2026-07-31.
-- The deterministic quantity formula always yields 20-50 bowls per day.
-- Tagged records are skipped on reruns.

BEGIN;

DO $$
DECLARE
  v_business_id BIGINT;
  v_user_id BIGINT;
  v_sale_date DATE;
  v_quantity INTEGER;
  v_unit_price NUMERIC(12, 2);
  v_transaction_id BIGINT;
  v_sale_id BIGINT;
BEGIN
  SELECT id INTO v_business_id FROM businesses ORDER BY id LIMIT 1;
  SELECT id INTO v_user_id FROM users WHERE is_active ORDER BY id LIMIT 1;

  IF v_business_id IS NULL THEN
    RAISE EXCEPTION 'No business found. Run migrations first.';
  END IF;
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'No active user found. Create a login first.';
  END IF;

  SELECT noodle_price INTO v_unit_price FROM businesses WHERE id = v_business_id;

  FOR v_sale_date, v_quantity IN
    SELECT ('2026-07-01'::date + day_offset), 20 + ((day_offset * 7) % 31)
    FROM generate_series(0, 30) AS days(day_offset)
  LOOP
    IF NOT EXISTS (
      SELECT 1 FROM daily_sales
      WHERE business_id = v_business_id
        AND sale_date = v_sale_date
        AND note = 'MOCK:2026-07'
        AND deleted_at IS NULL
    ) THEN
      INSERT INTO transactions (
        business_id, transaction_type, amount, description, note,
        transaction_date, source_type, created_by
      )
      VALUES (
        v_business_id, 'income', v_quantity * v_unit_price,
        'Doanh thu bán Mỳ Quảng', 'MOCK:2026-07',
        v_sale_date, 'daily_sale', v_user_id
      )
      RETURNING id INTO v_transaction_id;

      INSERT INTO daily_sales (
        business_id, sale_date, noodle_quantity, unit_price, note,
        income_transaction_id, created_by
      )
      VALUES (
        v_business_id, v_sale_date, v_quantity, v_unit_price,
        'MOCK:2026-07', v_transaction_id, v_user_id
      )
      RETURNING id INTO v_sale_id;

      UPDATE transactions SET source_id = v_sale_id WHERE id = v_transaction_id;
    END IF;
  END LOOP;
END $$;

INSERT INTO transactions (
  business_id, transaction_type, amount, description, note,
  transaction_date, source_type, created_by
)
SELECT b.id, 'expense', costs.amount, costs.description, 'MOCK:2026-07',
       costs.transaction_date, 'manual', u.id
FROM businesses b
CROSS JOIN (
  VALUES
    ('2026-07-03'::date, 830000::numeric, 'Mua thịt, rau và gia vị'),
    ('2026-07-06'::date, 180000::numeric, 'Mua gas'),
    ('2026-07-10'::date, 910000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-07-13'::date, 250000::numeric, 'Điện nước'),
    ('2026-07-17'::date, 1020000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-07-20'::date, 180000::numeric, 'Mua gas'),
    ('2026-07-24'::date, 960000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-07-27'::date, 250000::numeric, 'Điện nước'),
    ('2026-07-30'::date, 870000::numeric, 'Mua thịt, rau và gia vị')
) AS costs(transaction_date, amount, description)
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE is_active ORDER BY id LIMIT 1
) u
WHERE b.id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.business_id = b.id
      AND t.transaction_date = costs.transaction_date
      AND t.description = costs.description
      AND t.note = 'MOCK:2026-07'
      AND t.deleted_at IS NULL
  );

COMMIT;
