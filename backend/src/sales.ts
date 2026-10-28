import {
  BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, ParseIntPipe, Patch, Post,
  Query, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from './auth';
import { Database } from './database';
import { isDateOnly } from './date';

class SaleDto {
  @IsDateString()
  date!: string;

  @IsInt()
  @Min(1)
  quantity!: number;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller('sales')
@UseGuards(AuthGuard)
export class SalesController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  async list(@Query('from') from?: string, @Query('to') to?: string) {
    const validDate = (value?: string) => {
      if (value && !isDateOnly(value)) throw new BadRequestException('Khoảng ngày không hợp lệ.');
      return value ?? null;
    };
    const { rows } = await this.db.query(
      `SELECT s.id, to_char(s.sale_date, 'YYYY-MM-DD') AS date,
              s.noodle_quantity AS quantity, s.unit_price AS "unitPrice",
              s.total_amount AS amount, s.note, s.created_at, s.updated_at
       FROM daily_sales s
       WHERE s.deleted_at IS NULL
         AND ($1::date IS NULL OR s.sale_date >= $1::date)
         AND ($2::date IS NULL OR s.sale_date <= $2::date)
       ORDER BY s.sale_date DESC, s.created_at DESC`,
      [validDate(from), validDate(to)],
    );
    return rows;
  }

  @Post()
  async create(@Body() body: SaleDto, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const { rows: businesses } = await client.query('SELECT id, noodle_price FROM businesses ORDER BY id LIMIT 1');
      if (!businesses[0]) throw new NotFoundException('Chưa cấu hình quán.');
      const business = businesses[0];
      const { rows: income } = await client.query(
        `INSERT INTO transactions
          (business_id, transaction_type, amount, description, transaction_date, source_type, created_by)
         VALUES ($1, 'income', $2, 'Doanh thu bán Mỳ Quảng', $3, 'daily_sale', $4)
         RETURNING id`,
        [business.id, body.quantity * Number(business.noodle_price), body.date, user.id],
      );
      const { rows } = await client.query(
        `INSERT INTO daily_sales
          (business_id, sale_date, noodle_quantity, unit_price, note, income_transaction_id, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, to_char(sale_date, 'YYYY-MM-DD') AS date,
                   noodle_quantity AS quantity, unit_price AS "unitPrice",
                   total_amount AS amount, note, created_at, updated_at`,
        [business.id, body.date, body.quantity, business.noodle_price, body.note?.trim() || null, income[0].id, user.id],
      );
      await client.query(
        `UPDATE transactions SET source_id = $1 WHERE id = $2`,
        [rows[0].id, income[0].id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, new_data)
         VALUES ($1, $2, 'create', 'daily_sales', $3, $4::jsonb)`,
        [business.id, user.id, rows[0].id, JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: SaleDto, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const old = await client.query(
        `SELECT s.*, t.business_id FROM daily_sales s
         JOIN transactions t ON t.id = s.income_transaction_id
         WHERE s.id = $1 AND s.deleted_at IS NULL FOR UPDATE OF s, t`,
        [id],
      );
      if (!old.rows[0]) throw new NotFoundException('Không tìm thấy bản ghi bán mỳ.');
      const previous = old.rows[0];
      const amount = body.quantity * Number(previous.unit_price);
      const { rows } = await client.query(
        `UPDATE daily_sales SET sale_date = $2, noodle_quantity = $3, note = $4, updated_by = $5, updated_at = NOW()
         WHERE id = $1
         RETURNING id, to_char(sale_date, 'YYYY-MM-DD') AS date,
                   noodle_quantity AS quantity, unit_price AS "unitPrice",
                   total_amount AS amount, note, created_at, updated_at`,
        [id, body.date, body.quantity, body.note?.trim() || null, user.id],
      );
      await client.query(
        `UPDATE transactions SET amount = $2, transaction_date = $3, updated_by = $4, updated_at = NOW()
         WHERE id = $1`,
        [previous.income_transaction_id, amount, body.date, user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
         VALUES ($1, $2, 'update', 'daily_sales', $3, $4::jsonb, $5::jsonb)`,
        [previous.business_id, user.id, id, JSON.stringify(previous), JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const old = await client.query(
        `SELECT s.*, t.business_id FROM daily_sales s
         JOIN transactions t ON t.id = s.income_transaction_id
         WHERE s.id = $1 AND s.deleted_at IS NULL FOR UPDATE OF s, t`,
        [id],
      );
      if (!old.rows[0]) throw new NotFoundException('Không tìm thấy bản ghi bán mỳ.');
      const sale = old.rows[0];
      await client.query('UPDATE daily_sales SET deleted_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1', [id, user.id]);
      await client.query(
        'UPDATE transactions SET deleted_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1',
        [sale.income_transaction_id, user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data)
         VALUES ($1, $2, 'delete', 'daily_sales', $3, $4::jsonb)`,
        [sale.business_id, user.id, id, JSON.stringify(sale)],
      );
      return { success: true };
    });
  }
}
