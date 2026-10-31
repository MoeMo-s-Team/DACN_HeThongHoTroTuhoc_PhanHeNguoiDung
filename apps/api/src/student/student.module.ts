import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentDashboardController } from './student-dashboard.controller';
import { StudentDashboardService } from './student-dashboard.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentDashboardController],
  providers: [StudentDashboardService],
})
export class StudentModule {}
