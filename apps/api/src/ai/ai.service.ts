import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { AuthUser } from '../auth/auth.service';
import { assertAiCapacityProfileAvailable } from './ai-capacity-preflight';
import { AiRequestLogService } from './ai-request-log.service';
import { AiTaskKey } from './ai-task.registry';
import { AiGateway } from './ai.gateway';

@Injectable()
export class AiService {
  constructor(private readonly gateway: AiGateway, private readonly requestLog: AiRequestLogService) {}

  async infer(user: AuthUser, feature: AiTaskKey, input: unknown): Promise<Record<string, unknown>> {
    assertAiCapacityProfileAvailable();
    const requestId = randomUUID();
    return this.requestLog.runAttempt({
      userId: user.id,
      feature,
      requestId,
      input,
      dispatch: () => this.gateway.infer(feature, requestId, input),
    });
  }
}
