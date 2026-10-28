import {
  BadRequestException, Body, ConflictException, Controller, Delete, Get, Inject,
  NotFoundException, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsNumber, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from './auth';
import { Database } from './database';
import { isDateOnly } from './date';

class EmployeeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(150)
  fullName!: string;
}

class EmployeePaymentDto {
  @IsDateString()
  month!: string;

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(1)
  amount!: number;
}

function payrollMonth(value?: string) {
  if (!value || !/^\d{4}-\d{2}$/.test(value) || !isDateOnly(`${value}-01`)) {
    throw new BadRequestException('Tháng lương không hợp lệ.');
  }
  return `${value}-01`;
}

@Controller('employees')
@UseGuards(AuthGuard)
export class EmployeesController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  async list() {
    const { rows } = await this.db.query(
      `SELECT id, full_name AS "fullName"
       FROM employees WHERE is_active = TRUE
       ORDER BY full_name`,
    );
    return rows;
  }

  @Post()
  async create(@Body() body: EmployeeDto, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const { rows: businesses } = await client.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
      if (!businesses[0]) throw new NotFoundException('Chưa cấu hình quán.');
      const { rows } = await client.query(
        `INSERT INTO employees (business_id, full_name, created_by)
         VALUES ($1, $2, $3)
         RETURNING id, full_name AS "fullName"`,
        [businesses[0].id, body.fullName.trim(), user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, new_data)
         VALUES ($1, $2, 'create', 'employees', $3, $4::jsonb)`,
        [businesses[0].id, user.id, rows[0].id, JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Patch(':id')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EmployeeDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.db.transaction(async (client) => {
      const { rows: oldRows } = await client.query(
        'SELECT * FROM employees WHERE id = $1 AND is_active = TRUE FOR UPDATE',
        [id],
      );
      const old = oldRows[0];
      if (!old) throw new NotFoundException('Không tìm thấy nhân viên.');
      const { rows } = await client.query(
        `UPDATE employees SET full_name = $2, updated_at = NOW()
         WHERE id = $1 RETURNING id, full_name AS "fullName"`,
        [id, body.fullName.trim()],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
         VALUES ($1, $2, 'update', 'employees', $3, $4::jsonb, $5::jsonb)`,
        [old.business_id, user.id, id, JSON.stringify(old), JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        'SELECT * FROM employees WHERE id = $1 AND is_active = TRUE FOR UPDATE',
        [id],
      );
      const employee = rows[0];
      if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');
      await client.query(
        'UPDATE employees SET is_active = FALSE, updated_at = NOW() WHERE id = $1',
        [id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data)
         VALUES ($1, $2, 'delete', 'employees', $3, $4::jsonb)`,
        [employee.business_id, user.id, id, JSON.stringify(employee)],
      );
      return { success: true };
    });
  }

  @Get(':id/payments')
  async listPayments(@Param('id', ParseIntPipe) id: number) {
    const { rows: employees } = await this.db.query(
      'SELECT id FROM employees WHERE id = $1 AND is_active = TRUE',
      [id],
    );
    if (!employees[0]) throw new NotFoundException('Không tìm thấy nhân viên.');
    const { rows } = await this.db.query(
      `SELECT id, employee_id AS "employeeId",
              to_char(payroll_month, 'YYYY-MM-DD') AS month, amount,
              created_at AS "createdAt"
       FROM employee_salary_payments
       WHERE employee_id = $1 AND deleted_at IS NULL
       ORDER BY payroll_month DESC`,
      [id],
    );
    return rows;
  }

  @Post(':id/payments')
  async createPayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: EmployeePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    const month = payrollMonth(body.month.slice(0, 7));
    return this.db.transaction(async (client) => {
      const { rows: employees } = await client.query(
        'SELECT * FROM employees WHERE id = $1 AND is_active = TRUE FOR UPDATE',
        [id],
      );
      const employee = employees[0];
      if (!employee) throw new NotFoundException('Không tìm thấy nhân viên.');

      const { rows: transactions } = await client.query(
        `INSERT INTO transactions
          (business_id, transaction_type, amount, description, note, transaction_date,
           source_type, created_by)
         VALUES ($1, 'expense', $2, $3, $4, $5::date, 'employee_salary', $6)
         RETURNING id`,
        [
          employee.business_id,
          body.amount,
          `Lương tháng ${month.slice(0, 7)} - ${employee.full_name}`,
          `Lương tháng ${month.slice(0, 7)}`,
          month,
          user.id,
        ],
      );
      const { rows: payments } = await client.query(
        `INSERT INTO employee_salary_payments
          (employee_id, payroll_month, amount, transaction_id, created_by)
         VALUES ($1, $2::date, $3, $4, $5)
         RETURNING id, employee_id AS "employeeId",
                   to_char(payroll_month, 'YYYY-MM-DD') AS month, amount,
                   created_at AS "createdAt"`,
        [id, month, body.amount, transactions[0].id, user.id],
      );
      await client.query(
        'UPDATE transactions SET source_id = $1 WHERE id = $2',
        [payments[0].id, transactions[0].id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, new_data)
         VALUES ($1, $2, 'create', 'employee_salary_payments', $3, $4::jsonb)`,
        [employee.business_id, user.id, payments[0].id, JSON.stringify(payments[0])],
      );
      return payments[0];
    }).catch((error: unknown) => {
      if (typeof error === 'object' && error !== null && 'code' in error && error.code === '23505') {
        throw new ConflictException('Đã có khoản lương cho nhân viên trong tháng này.');
      }
      throw error;
    });
  }

  @Patch(':id/payments/:paymentId')
  async updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @Body() body: EmployeePaymentDto,
    @CurrentUser() user: AuthUser,
  ) {
    const month = payrollMonth(body.month.slice(0, 7));
    return this.db.transaction(async (client) => {
      const { rows: payments } = await client.query(
        `SELECT p.*, e.business_id, e.full_name FROM employee_salary_payments p
         JOIN employees e ON e.id = p.employee_id
         WHERE p.id = $1 AND p.employee_id = $2 AND p.deleted_at IS NULL
         FOR UPDATE OF p, e`,
        [paymentId, id],
      );
      const payment = payments[0];
      if (!payment) throw new NotFoundException('Không tìm thấy khoản lương.');
      const duplicate = await client.query(
        `SELECT 1 FROM employee_salary_payments
         WHERE employee_id = $1 AND payroll_month = $2::date
           AND id <> $3 AND deleted_at IS NULL`,
        [id, month, paymentId],
      );
      if (duplicate.rowCount) throw new ConflictException('Đã có khoản lương cho nhân viên trong tháng này.');

      const { rows } = await client.query(
        `UPDATE employee_salary_payments
         SET payroll_month = $2::date, amount = $3
         WHERE id = $1
         RETURNING id, employee_id AS "employeeId",
                   to_char(payroll_month, 'YYYY-MM-DD') AS month, amount,
                   created_at AS "createdAt"`,
        [paymentId, month, body.amount],
      );
      await client.query(
        `UPDATE transactions
         SET amount = $2, transaction_date = $3::date,
             description = $4, note = $5, updated_by = $6, updated_at = NOW()
         WHERE id = $1`,
        [
          payment.transaction_id,
          body.amount,
          month,
          `Lương tháng ${month.slice(0, 7)} - ${payment.full_name}`,
          `Lương tháng ${month.slice(0, 7)}`,
          user.id,
        ],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
         VALUES ($1, $2, 'update', 'employee_salary_payments', $3, $4::jsonb, $5::jsonb)`,
        [payment.business_id, user.id, paymentId, JSON.stringify(payment), JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Delete(':id/payments/:paymentId')
  async removePayment(
    @Param('id', ParseIntPipe) id: number,
    @Param('paymentId', ParseIntPipe) paymentId: number,
    @CurrentUser() user: AuthUser,
  ) {
    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT p.*, e.business_id FROM employee_salary_payments p
         JOIN employees e ON e.id = p.employee_id
         WHERE p.id = $1 AND p.employee_id = $2 AND p.deleted_at IS NULL
         FOR UPDATE OF p`,
        [paymentId, id],
      );
      const payment = rows[0];
      if (!payment) throw new NotFoundException('Không tìm thấy khoản lương.');

      await client.query(
        'UPDATE employee_salary_payments SET deleted_at = NOW() WHERE id = $1',
        [paymentId],
      );
      await client.query(
        `UPDATE transactions SET deleted_at = NOW(), updated_by = $2, updated_at = NOW()
         WHERE id = $1`,
        [payment.transaction_id, user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data)
         VALUES ($1, $2, 'delete', 'employee_salary_payments', $3, $4::jsonb)`,
        [payment.business_id, user.id, paymentId, JSON.stringify(payment)],
      );
      return { success: true };
    });
  }
}
