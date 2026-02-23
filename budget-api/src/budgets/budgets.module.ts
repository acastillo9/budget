import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Budget, BudgetSchema } from './entities/budget.entity';
import {
  Transaction,
  TransactionSchema,
} from 'src/transactions/entities/transaction.entity';
import { BudgetsController } from './budgets.controller';
import { BudgetsService } from './budgets.service';
import { CategoriesModule } from 'src/categories/categories.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Budget.name, schema: BudgetSchema },
      { name: Transaction.name, schema: TransactionSchema },
    ]),
    CategoriesModule,
  ],
  controllers: [BudgetsController],
  providers: [BudgetsService],
})
export class BudgetsModule {}
