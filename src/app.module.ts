import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/environment.validation';
import { DatabaseModule } from './database/database.module';
import { ActivationsModule } from './modules/activations/activations.module';
import { ApprovalsModule } from './modules/approvals/approvals.module';
import { AuthModule } from './modules/auth/auth.module';
import { CashbackModule } from './modules/cashback/cashback.module';
import { HealthModule } from './modules/health/health.module';
import { OffersModule } from './modules/offers/offers.module';
import { PurchasesModule } from './modules/purchases/purchases.module';
import { StorefrontModule } from './modules/storefront/storefront.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      validate: validateEnvironment,
    }),
    DatabaseModule,
    HealthModule,
    UsersModule,
    AuthModule,
    OffersModule,
    ApprovalsModule,
    StorefrontModule,
    ActivationsModule,
    PurchasesModule,
    CashbackModule,
  ],
})
export class AppModule {}
