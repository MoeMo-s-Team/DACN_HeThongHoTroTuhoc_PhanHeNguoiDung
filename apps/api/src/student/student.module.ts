import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { AiModule } from '../ai/ai.module';
import { StudentDashboardController } from './student-dashboard.controller';
import { StudentDashboardService } from './student-dashboard.service';
import { StudyContextService } from './study-context.service';
import { StudyContextController } from './study-context.controller';
import { StudentTasksController } from './student-tasks.controller';
import { StudentTasksService } from './student-tasks.service';
import { StudyPlanGenerationController } from './study-plan-generation.controller';
import { StudyPlanGenerationService } from './study-plan-generation.service';
import { StudyPlanApplyController } from './study-plan-apply.controller';
import { StudyPlanApplyService } from './study-plan-apply.service';
import { StudentLearningAnalysisController } from './student-learning-analysis.controller';
import { StudentLearningAnalysisService } from './student-learning-analysis.service';
import { StudyPlanAdjustmentController } from './study-plan-adjustment.controller';
import { StudyPlanAdjustmentService } from './study-plan-adjustment.service';

@Module({
  imports: [AuthModule, AiModule],
  controllers: [StudentDashboardController, StudyContextController, StudentTasksController, StudyPlanGenerationController, StudyPlanApplyController, StudentLearningAnalysisController, StudyPlanAdjustmentController],
  providers: [StudentDashboardService, StudyContextService, StudentTasksService, StudyPlanGenerationService, StudyPlanApplyService, StudentLearningAnalysisService, StudyPlanAdjustmentService],
})
export class StudentModule {}
