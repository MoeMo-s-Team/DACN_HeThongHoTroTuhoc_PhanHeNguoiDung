import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { TeacherController } from './teacher.controller';
import { TeacherService } from './teacher.service';
import { TeacherHistoryService } from './teacher-history.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [TeacherController],
  providers: [TeacherService, TeacherHistoryService],
  exports: [TeacherService, TeacherHistoryService],
})
export class TeacherModule {}
