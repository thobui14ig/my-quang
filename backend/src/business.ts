import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { AuthGuard } from './auth';
import { Database } from './database';

@Controller('business')
@UseGuards(AuthGuard)
export class BusinessController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Get()
  async getBusiness() {
    const { rows } = await this.db.query(
      `SELECT id, name, opening_date, initial_capital, noodle_price,
              owner_profit_percent, partner_profit_percent,
              operator_capital, partner_capital
       FROM businesses ORDER BY id LIMIT 1`,
    );
    return rows[0] ?? null;
  }
}
