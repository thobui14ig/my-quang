import {
  BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, ParseIntPipe, Patch, Post,
  Query, UseGuards,
} from '@nestjs/common';
import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';
import { AuthGuard, AuthUser, CurrentUser } from './auth';
import { Database } from './database';
import { isDateOnly } from './date';

class TransactionDto {
  @IsIn(['income', 'expense'])
  type!: 'income' | 'expense';

  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  amount!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(255)
  description!: string;

  @IsDateString()
  date!: string;

  @IsOptional()
  @IsString()
  note?: string;
}

function dateFilter(from?: string, to?: string) {
  if (from && !isDateOnly(from)) throw new BadRequestException('Ngày bắt đầu không hợp lệ.');
  if (to && !isDateOnly(to)) throw new BadRequestException('Ngày kết thúc không hợp lệ.');
  if (from && to && from > to) throw new BadRequestException('Ngày bắt đầu không được sau ngày kết thúc.');
  return { from, to };
}

@Controller('transactions')
@UseGuards(AuthGuard)
export class TransactionsController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  async list(@Query('from') from?: string, @Query('to') to?: string) {
    const range = dateFilter(from, to);
    const { rows } = await this.db.query(
      `SELECT id, transaction_type AS type, amount, description, note,
              to_char(transaction_date, 'YYYY-MM-DD') AS date,
              source_type, source_id, created_at, updated_at
       FROM transactions
       WHERE deleted_at IS NULL
         AND ($1::date IS NULL OR transaction_date >= $1::date)
         AND ($2::date IS NULL OR transaction_date <= $2::date)
       ORDER BY transaction_date DESC, created_at DESC`,
      [range.from ?? null, range.to ?? null],
    );
    return rows;
  }

  @Post()
  async create(@Body() body: TransactionDto, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const { rows: businessRows } = await client.query('SELECT id FROM businesses ORDER BY id LIMIT 1');
      if (!businessRows[0]) throw new NotFoundException('Chưa cấu hình quán.');
      const { rows } = await client.query(
        `INSERT INTO transactions
          (business_id, transaction_type, amount, description, note, transaction_date, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, transaction_type AS type, amount, description, note,
                   to_char(transaction_date, 'YYYY-MM-DD') AS date,
                   source_type, source_id, created_at, updated_at`,
        [businessRows[0].id, body.type, body.amount, body.description.trim(), body.note?.trim() || null, body.date, user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, new_data)
         VALUES ($1, $2, 'create', 'transactions', $3, $4::jsonb)`,
        [businessRows[0].id, user.id, rows[0].id, JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Patch(':id')
  async update(@Param('id', ParseIntPipe) id: number, @Body() body: TransactionDto, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const old = await client.query(
        `SELECT * FROM transactions WHERE id = $1 AND deleted_at IS NULL AND source_type = 'manual' FOR UPDATE`,
        [id],
      );
      if (!old.rows[0]) throw new NotFoundException('Không tìm thấy khoản thu/chi.');
      const { rows } = await client.query(
        `UPDATE transactions
         SET transaction_type = $2, amount = $3, description = $4, note = $5,
             transaction_date = $6, updated_by = $7, updated_at = NOW()
         WHERE id = $1
         RETURNING id, transaction_type AS type, amount, description, note,
                   to_char(transaction_date, 'YYYY-MM-DD') AS date,
                   source_type, source_id, created_at, updated_at`,
        [id, body.type, body.amount, body.description.trim(), body.note?.trim() || null, body.date, user.id],
      );
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data, new_data)
         VALUES ($1, $2, 'update', 'transactions', $3, $4::jsonb, $5::jsonb)`,
        [old.rows[0].business_id, user.id, id, JSON.stringify(old.rows[0]), JSON.stringify(rows[0])],
      );
      return rows[0];
    });
  }

  @Delete(':id')
  async remove(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser) {
    return this.db.transaction(async (client) => {
      const old = await client.query(
        `SELECT * FROM transactions WHERE id = $1 AND deleted_at IS NULL AND source_type = 'manual' FOR UPDATE`,
        [id],
      );
      if (!old.rows[0]) throw new NotFoundException('Không tìm thấy khoản thu/chi.');
      await client.query('UPDATE transactions SET deleted_at = NOW(), updated_by = $2, updated_at = NOW() WHERE id = $1', [id, user.id]);
      await client.query(
        `INSERT INTO audit_logs (business_id, user_id, action, table_name, record_id, old_data)
         VALUES ($1, $2, 'delete', 'transactions', $3, $4::jsonb)`,
        [old.rows[0].business_id, user.id, id, JSON.stringify(old.rows[0])],
      );
      return { success: true };
    });
  }
}
