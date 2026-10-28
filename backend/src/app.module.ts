import { Module } from '@nestjs/common';
import { AuthController, AuthGuard } from './auth';
import { BusinessController } from './business';
import { Database } from './database';
import { EmployeesController } from './employees';
import { ReportsController } from './reports';
import { SalesController } from './sales';
import { TransactionsController } from './transactions';

@Module({
  controllers: [AuthController, BusinessController, EmployeesController, ReportsController, SalesController, TransactionsController],
  providers: [Database, AuthGuard],
})
export class AppModule {}
