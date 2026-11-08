import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { AdminFeedbackService } from './admin-feedback.service';
import { AdminHistoryService } from './admin-history.service';
import { AdminAnalysisSaveService } from './admin-analysis-save.service';

@Module({ imports: [AuthModule, PrismaModule], controllers: [AdminController], providers: [AdminService, AdminFeedbackService, AdminHistoryService, AdminAnalysisSaveService] })
export class AdminModule {}
