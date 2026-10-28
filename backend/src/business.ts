import {
  BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException,
  Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from './auth';
import { Database } from './database';
import { isDateOnly } from './date';

class CashBalanceDto {
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  openingBalance!: number;

  @IsDateString()
  openingDate!: string;
}

class CashMovementDto {
  @IsIn(['contribution', 'withdrawal'])
  type!: 'contribution' | 'withdrawal';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  @MaxLength(1000)
  note?: string;
}

@Controller('business')
@UseGuards(AuthGuard)
export class BusinessController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  async getBusiness() {
    const { rows } = await this.db.query(
      `SELECT id, name, opening_date, initial_capital, noodle_price,
              owner_profit_percent, partner_profit_percent,
              operator_capital, partner_capital,
              cash_opening_balance AS "cashOpeningBalance",
              to_char(cash_opening_date, 'YYYY-MM-DD') AS "cashOpeningDate"
       FROM businesses ORDER BY id LIMIT 1`,
    );
    return rows[0] ?? null;
  }

  @Get('cash-balance')
  async cashBalance() {
    const { rows } = await this.db.query(
      `WITH shop AS (
         SELECT id, cash_opening_balance, cash_opening_date
         FROM businesses ORDER BY id LIMIT 1
       ), transaction_totals AS (
         SELECT
           COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'income'), 0) AS income,
           COALESCE(SUM(t.amount) FILTER (WHERE t.transaction_type = 'expense'), 0) AS expense
         FROM shop
         LEFT JOIN transactions t
           ON t.business_id = shop.id
          AND t.deleted_at IS NULL
          AND t.transaction_date >= shop.cash_opening_date
       ), movement_totals AS (
         SELECT
           COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'contribution'), 0) AS contributions,
           COALESCE(SUM(m.amount) FILTER (WHERE m.movement_type = 'withdrawal'), 0) AS withdrawals
         FROM shop
         LEFT JOIN cash_movements m
           ON m.business_id = shop.id
          AND m.deleted_at IS NULL
          AND m.movement_date >= shop.cash_opening_date
       )
       SELECT shop.cash_opening_balance AS "openingBalance",
              to_char(shop.cash_opening_date, 'YYYY-MM-DD') AS "openingDate",
              transaction_totals.income, transaction_totals.expense,
              movement_totals.contributions, movement_totals.withdrawals,
              shop.cash_opening_balance + transaction_totals.income - transaction_totals.expense
                + movement_totals.contributions - movement_totals.withdrawals AS balance
       FROM shop CROSS JOIN transaction_totals CROSS JOIN movement_totals`,
    );
    if (!rows[0]) throw new NotFoundException('Chưa cấu hình quán.');
    return Object.fromEntries(
      Object.entries(rows[0]).map(([key, value]) => [key, key === 'openingDate' ? value : Number(value)]),
    );
  }

  @Patch('cash-balance')
  async updateCashBalance(@Body() body: CashBalanceDto, @CurrentUser() user: AuthUser) {
    if (!isDateOnly(body.openingDate)) throw new BadRequestException('Ngày bắt đầu không hợp lệ.');
    return this.db.transaction(async (client) => {
      const { rows: oldRows } = await client.query(
        'SELECT * FROM businesses ORDER BY id LIMIT 1 FOR UPDATE',
      );
      const old = oldRows[0];
      if (!old) throw new NotFoundException('Chưa cấu hình quán.');
      const { rows } = await client.query(
        `UPDATE businesses
         SET cash_opening_balance = $2, cash_opening_date = $3::date
         WHERE id = $1
         RETURNING cash_opening_balance AS "openingBalance",
                   to_char(cash_opening_date, 'YYYY-MM-DD') AS "openingDate"`,
        [old.id, body.openingBalance, body.openingDate],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
         VALUES ($1, $2, 'update', 'businesses', $3, $4::jsonb, $5::jsonb)`,
        [old.id, user.id, old.id, JSON.stringify(old), JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Get('cash-movements')
  async listCashMovements() {
    const { rows } = await this.db.query(
      `SELECT m.id, m.movement_type AS type, m.amount,
              to_char(m.movement_date, 'YYYY-MM-DD') AS date,
              m.note, m.created_at AS "createdAt"
       FROM cash_movements m
       WHERE m.business_id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
         AND m.deleted_at IS NULL
       ORDER BY m.movement_date DESC, m.created_at DESC`,
    );
    return rows;
  }

  @Post('cash-movements')
  async createCashMovement(@Body() body: CashMovementDto, @CurrentUser() user: AuthUser) {
    if (!isDateOnly(body.date)) throw new BadRequestException('Ngày giao dịch không hợp lệ.');
    return this.db.transaction(async (client) => {
      const { rows: businesses } = await client.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
      if (!businesses[0]) throw new NotFoundException('Chưa cấu hình quán.');
      const { rows } = await client.query(
        `INSERT INTO cash_movements
          (business_id, movement_type, amount, movement_date, note, created_by)
         VALUES ($1, $2, $3, $4::date, $5, $6)
         RETURNING id, movement_type AS type, amount,
                   to_char(movement_date, 'YYYY-MM-DD') AS date,
                   note, created_at AS "createdAt"`,
        [businesses[0].id, body.type, body.amount, body.date, body.note?.trim() || null, user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, new_data)
         VALUES ($1, $2, 'create', 'cash_movements', $3, $4::jsonb)`,
        [businesses[0].id, user.id, rows[0].id, JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Delete('cash-movements/:id')
  async removeCashMovement(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const { rows } = await client.query(
        `SELECT * FROM cash_movements
         WHERE id = $1
           AND business_id = (SELECT id FROM businesses ORDER BY id LIMIT 1)
           AND deleted_at IS NULL
         FOR UPDATE`,
        [id],
      );
      const movement = rows[0];
      if (!movement) throw new NotFoundException('Không tìm thấy giao dịch vốn.');
      await client.query('UPDATE cash_movements SET deleted_at = NOW() WHERE id = $1', [id]);
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data)
         VALUES ($1, $2, 'delete', 'cash_movements', $3, $4::jsonb)`,
        [movement.business_id, user.id, id, JSON.stringify(movement)],
      );
      return { success: true };
    });
  }
}
