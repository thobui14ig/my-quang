import { BadRequestException, Controller, Get, Inject, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth';
import { Database } from './database';
import { isDateOnly } from './date';

function requireDate(value: string | undefined, field: string): string {
  if (!value || !isDateOnly(value)) {
    throw new BadRequestException(`${field} phải theo định dạng YYYY-MM-DD.`);
  }
  return value;
}

@Controller()
@UseGuards(AuthGuard)
export class ReportsController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get('dashboard')
  async dashboard(@Query('date') selectedDate?: string, @Query('month') selectedMonth?: string) {
    const date = selectedDate ? requireDate(selectedDate, 'Ngày') : new Date().toISOString().slice(0, 10);
    const month = selectedMonth
      ? `${requireDate(`${selectedMonth}-01`, 'Tháng').slice(0, 7)}-01`
      : `${date.slice(0, 7)}-01`;
    const { rows } = await this.db.query(
      `WITH selected AS (SELECT $1::date AS day, $2::date AS month),
       sums AS (
         SELECT
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income' AND transaction_date = selected.day), 0) AS day_income,
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense' AND transaction_date = selected.day), 0) AS day_expense,
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income' AND transaction_date >= selected.month AND transaction_date < (selected.month + interval '1 month')::date), 0) AS month_income,
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense' AND transaction_date >= selected.month AND transaction_date < (selected.month + interval '1 month')::date), 0) AS month_expense,
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'income'), 0) AS lifetime_income,
           COALESCE(SUM(amount) FILTER (WHERE transaction_type = 'expense'), 0) AS lifetime_expense
         FROM transactions, selected
         WHERE deleted_at IS NULL
       ),
       sales AS (
         SELECT
           COALESCE(SUM(noodle_quantity) FILTER (WHERE sale_date = selected.day), 0) AS day_quantity,
           COALESCE(SUM(total_amount) FILTER (WHERE sale_date = selected.day), 0) AS day_noodle_revenue,
           COALESCE(SUM(noodle_quantity) FILTER (WHERE sale_date >= selected.month AND sale_date < (selected.month + interval '1 month')::date), 0) AS month_quantity
         FROM daily_sales, selected WHERE deleted_at IS NULL
       ),
       payroll AS (
         SELECT COUNT(*) FILTER (WHERE e.is_active = TRUE) AS active_employee_count,
                COUNT(*) FILTER (
                  WHERE e.is_active = TRUE AND NOT EXISTS (
                    SELECT 1 FROM employee_salary_payments p
                    WHERE p.employee_id = e.id
                      AND p.payroll_month = selected.month
                      AND p.deleted_at IS NULL
                  )
                ) AS pending_employee_count
         FROM selected
         LEFT JOIN employees e ON TRUE
       )
       SELECT sums.*, sales.*, payroll.active_employee_count, payroll.pending_employee_count,
              b.initial_capital, b.operator_capital, b.partner_capital,
              b.owner_profit_percent, b.partner_profit_percent
       FROM sums CROSS JOIN sales CROSS JOIN payroll CROSS JOIN businesses b`,
      [date, month],
    );
    const result = rows[0];
    const dayNet = Number(result.day_income) - Number(result.day_expense);
    const monthNet = Number(result.month_income) - Number(result.month_expense);
    const lifetimeNet = Number(result.lifetime_income) - Number(result.lifetime_expense);
    const positiveMonthProfit = Math.max(0, monthNet);
    const positiveLifetimeProfit = Math.max(0, lifetimeNet);
    const operatorShare = (profit: number) =>
      Math.floor(profit * Number(result.operator_capital) / Number(result.initial_capital));
    return {
      date,
      day: {
        income: Number(result.day_income), expense: Number(result.day_expense), net: dayNet,
        bowls: Number(result.day_quantity), noodleRevenue: Number(result.day_noodle_revenue),
      },
      month: {
        income: Number(result.month_income), expense: Number(result.month_expense), net: monthNet,
        bowls: Number(result.month_quantity),
        activeEmployeeCount: Number(result.active_employee_count),
        pendingEmployeeCount: Number(result.pending_employee_count),
        operatorShare: operatorShare(positiveMonthProfit),
        partnerShare: positiveMonthProfit - operatorShare(positiveMonthProfit),
      },
      lifetime: {
        income: Number(result.lifetime_income), expense: Number(result.lifetime_expense), net: lifetimeNet,
        operatorShare: operatorShare(positiveLifetimeProfit),
        partnerShare: positiveLifetimeProfit - operatorShare(positiveLifetimeProfit),
      },
    };
  }

  @Get('reports')
  async report(@Query('from') from?: string, @Query('to') to?: string) {
    const start = requireDate(from, 'Ngày bắt đầu');
    const end = requireDate(to, 'Ngày kết thúc');
    if (start > end) throw new BadRequestException('Ngày bắt đầu không được sau ngày kết thúc.');
    const { rows } = await this.db.query(
      `SELECT to_char(t.transaction_date, 'YYYY-MM-DD') AS date,
              COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'income'), 0) AS income,
              COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'expense'), 0) AS expense,
              COALESCE(SUM(s.noodle_quantity), 0) AS bowls,
              COALESCE(SUM(s.total_amount), 0) AS noodle_revenue
       FROM transactions t
       LEFT JOIN daily_sales s ON s.income_transaction_id = t.id AND s.deleted_at IS NULL
       WHERE t.deleted_at IS NULL AND t.transaction_date BETWEEN $1::date AND $2::date
       GROUP BY t.transaction_date ORDER BY t.transaction_date DESC`,
      [start, end],
    );
    return rows.map((row) => ({
      ...row,
      income: Number(row.income),
      expense: Number(row.expense),
      net: Number(row.income) - Number(row.expense),
      bowls: Number(row.bowls),
      noodle_revenue: Number(row.noodle_revenue),
    }));
  }
}
