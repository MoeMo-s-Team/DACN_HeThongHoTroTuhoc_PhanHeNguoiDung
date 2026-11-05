import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StudentDashboardController } from './student-dashboard.controller';
import { StudentDashboardService } from './student-dashboard.service';
import { StudyContextService } from './study-context.service';
import { StudyContextController } from './study-context.controller';
import { StudentTasksController } from './student-tasks.controller';
import { StudentTasksService } from './student-tasks.service';

@Module({
  imports: [AuthModule],
  controllers: [StudentDashboardController, StudyContextController, StudentTasksController],
  providers: [StudentDashboardService, StudyContextService, StudentTasksService],
})
export class StudentModule {}
