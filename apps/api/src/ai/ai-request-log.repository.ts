import { Injectable } from '@nestjs/common';
import { AIRequestStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface TerminalAiRequestLog {
  userId: string;
  feature: string;
  status: AIRequestStatus;
  errorCode: string | null;
  durationMs: number | null;
  createdAt: Date;
}

@Injectable()
export class AiRequestLogRepository {
  constructor(private readonly prisma: PrismaService) {}

  async createTerminal(data: TerminalAiRequestLog): Promise<void> {
    await this.prisma.aIRequestLog.create({ data });
  }
}
