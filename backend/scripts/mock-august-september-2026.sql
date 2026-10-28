-- Development/demo data only. Do not run this in production.
-- Adds one sale per day for August and September 2026.
-- Daily quantity is always between 20 and 50 bowls.
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
  v_mock_tag TEXT;
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
    SELECT sale_date::date, 20 + (((EXTRACT(DAY FROM sale_date)::integer - 1) * 7
                                  + EXTRACT(MONTH FROM sale_date)::integer * 3) % 31)
    FROM generate_series(
      TIMESTAMP '2026-08-01',
      TIMESTAMP '2026-09-30',
      INTERVAL '1 day'
    ) AS dates(sale_date)
  LOOP
    v_mock_tag := 'MOCK:' || to_char(v_sale_date, 'YYYY-MM');

    IF NOT EXISTS (
      SELECT 1 FROM daily_sales
      WHERE business_id = v_business_id
        AND sale_date = v_sale_date
        AND note = v_mock_tag
        AND deleted_at IS NULL
    ) THEN
      INSERT INTO transactions (
        business_id, transaction_type, amount, description, note,
        transaction_date, source_type, created_by
      )
      VALUES (
        v_business_id, 'income', v_quantity * v_unit_price,
        'Doanh thu bán Mỳ Quảng', v_mock_tag,
        v_sale_date, 'daily_sale', v_user_id
      )
      RETURNING id INTO v_transaction_id;

      INSERT INTO daily_sales (
        business_id, sale_date, noodle_quantity, unit_price, note,
        income_transaction_id, created_by
      )
      VALUES (
        v_business_id, v_sale_date, v_quantity, v_unit_price,
        v_mock_tag, v_transaction_id, v_user_id
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
SELECT b.id, 'expense', costs.amount, costs.description, costs.mock_tag,
       costs.transaction_date, 'manual', u.id
FROM businesses b
CROSS JOIN (
  VALUES
    ('2026-08-03'::date, 'MOCK:2026-08', 860000::numeric, 'Mua thịt, rau và gia vị'),
    ('2026-08-06'::date, 'MOCK:2026-08', 180000::numeric, 'Mua gas'),
    ('2026-08-10'::date, 'MOCK:2026-08', 940000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-08-13'::date, 'MOCK:2026-08', 250000::numeric, 'Điện nước'),
    ('2026-08-17'::date, 'MOCK:2026-08', 1010000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-08-20'::date, 'MOCK:2026-08', 180000::numeric, 'Mua gas'),
    ('2026-08-24'::date, 'MOCK:2026-08', 970000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-08-27'::date, 'MOCK:2026-08', 250000::numeric, 'Điện nước'),
    ('2026-08-30'::date, 'MOCK:2026-08', 890000::numeric, 'Mua thịt, rau và gia vị'),
    ('2026-09-02'::date, 'MOCK:2026-09', 840000::numeric, 'Mua thịt, rau và gia vị'),
    ('2026-09-05'::date, 'MOCK:2026-09', 180000::numeric, 'Mua gas'),
    ('2026-09-09'::date, 'MOCK:2026-09', 930000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-09-12'::date, 'MOCK:2026-09', 250000::numeric, 'Điện nước'),
    ('2026-09-16'::date, 'MOCK:2026-09', 1040000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-09-19'::date, 'MOCK:2026-09', 180000::numeric, 'Mua gas'),
    ('2026-09-23'::date, 'MOCK:2026-09', 990000::numeric, 'Mua nguyên liệu trong tuần'),
    ('2026-09-26'::date, 'MOCK:2026-09', 250000::numeric, 'Điện nước'),
    ('2026-09-29'::date, 'MOCK:2026-09', 880000::numeric, 'Mua thịt, rau và gia vị')
) AS costs(transaction_date, mock_tag, amount, description)
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE is_active ORDER BY id LIMIT 1
) u
WHERE b.id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
  AND NOT EXISTS (
    SELECT 1 FROM transactions t
    WHERE t.business_id = b.id
      AND t.transaction_date = costs.transaction_date
      AND t.description = costs.description
      AND t.note = costs.mock_tag
      AND t.deleted_at IS NULL
  );

COMMIT;
