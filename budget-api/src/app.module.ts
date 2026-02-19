import { Module } from '@nestjs/common';
import { DatabaseModule } from './database/database.module';
import { ConfigModule } from '@nestjs/config';
import { CategoriesModule } from './categories/categories.module';
import { TransactionsModule } from './transactions/transactions.module';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { AccountsModule } from './accounts/accounts.module';
import { MailModule } from './mail/mail.module';
import { AcceptLanguageResolver, I18nModule } from 'nestjs-i18n';
import { CurrenciesModule } from './currencies/currencies.module';
import * as path from 'path';
import { CacheModule } from '@nestjs/cache-manager';
import { AccountTypesModule } from './account-types/account-types.module';
import { BillsModule } from './bills/bills.module';
import { BudgetsModule } from './budgets/budgets.module';
import { AppController } from './app.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: process.env.ENV_FILE || '.env',
    }),
    DatabaseModule,
    CacheModule.register({ isGlobal: true }),
    I18nModule.forRoot({
      fallbackLanguage: 'en',
      loaderOptions: {
        path: path.join(__dirname, '/i18n/'),
        watch: true,
      },
      resolvers: [AcceptLanguageResolver],
    }),
    CategoriesModule,
    TransactionsModule,
    UsersModule,
    AuthModule,
    AccountsModule,
    MailModule,
    CurrenciesModule,
    AccountTypesModule,
    BillsModule,
    BudgetsModule,
  ],
  controllers: [AppController],
  providers: [],
})
export class AppModule {}
