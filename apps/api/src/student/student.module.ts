import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentDashboardController } from './student-dashboard.controller';
import { StudentDashboardService } from './student-dashboard.service';
import { StudyContextService } from './study-context.service';
import { StudyContextController } from './study-context.controller';

@Module({
  imports: [AuthModule],
  controllers: [StudentDashboardController, StudyContextController],
  providers: [StudentDashboardService, StudyContextService],
})
export class StudentModule {}
