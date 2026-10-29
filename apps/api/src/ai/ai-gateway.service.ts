import { HttpException } from '@nestjs/common';
import { RuntimeHttpAdapter, RuntimeHttpResponse } from './runtime-http.client';
import { InferenceRequest } from './capacity-preflight.service';
import { AiSchemaValidationError, SchemaRegistryService } from './schema-registry.service';

type GatewayCode = 'AI_CONNECTION_FAILURE' | 'AI_TIMEOUT' | 'AI_EMPTY_RESPONSE' | 'AI_INVALID_STRUCTURE' | 'AI_INCOMPLETE_DATA' | 'AI_RUNTIME_FAILURE';

const errors: Record<GatewayCode, { status: number; message: string }> = {
  AI_CONNECTION_FAILURE: { status: 502, message: 'Không thể kết nối AI runtime.' },
  AI_TIMEOUT: { status: 504, message: 'AI tạm thời chưa phản hồi. Vui lòng thử lại.' },
  AI_EMPTY_RESPONSE: { status: 502, message: 'AI trả response rỗng.' },
  AI_INVALID_STRUCTURE: { status: 502, message: 'AI trả dữ liệu không hợp lệ.' },
  AI_INCOMPLETE_DATA: { status: 502, message: 'AI trả dữ liệu chưa đầy đủ.' },
  AI_RUNTIME_FAILURE: { status: 502, message: 'AI tạm thời chưa thể xử lý yêu cầu. Vui lòng thử lại sau.' },
};

export class AiGatewayError extends HttpException {
  constructor(readonly code: GatewayCode, status = errors[code].status, readonly internalCode: string = code) {
    super({ code, message: errors[code].message, details: null }, status);
    this.name = 'AiGatewayError';
  }
}

export interface RuntimeHttpResult {
  status: number;
  body: unknown;
}

export class AiGatewayService {
  constructor(private readonly adapter: RuntimeHttpAdapter, private readonly schemas: SchemaRegistryService) {}

  assertReady(): void {
    this.adapter.assertReady?.();
  }

  async infer(request: InferenceRequest): Promise<RuntimeHttpResult> {
    let response: RuntimeHttpResponse;
    try {
      response = await this.adapter.post(
        '/v1/infer',
        JSON.stringify(request),
        { 'Content-Type': 'application/json' },
        60_000,
      );
    } catch (error) {
      if (error instanceof AiGatewayError) throw error;
      const name = error && typeof error === 'object' ? (error as { name?: string }).name : undefined;
      const code = error && typeof error === 'object' ? (error as { code?: string }).code : undefined;
      if (name === 'TimeoutError' || name === 'AbortError' || code === 'ETIMEDOUT' || code === 'ECONNABORTED') {
        throw new AiGatewayError('AI_TIMEOUT');
      }
      throw new AiGatewayError('AI_CONNECTION_FAILURE');
    }

    if (response.status === 408 || response.status === 504) throw new AiGatewayError('AI_TIMEOUT');
    const body = this.parse(response.body, response.status);
    if (response.status < 200 || response.status >= 300) {
      if (response.status === 400 || response.status === 422) {
        throw new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_PROTOCOL_FAILURE');
      }
      if (response.status === 401 || response.status === 403) {
        throw new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_AUTH_FAILURE');
      }
      let runtimeCode: unknown;
      if (body && typeof body === 'object') {
        try {
          this.schemas.validateEnvelope('error', body);
          const envelope = body as { contractVersion: string; requestId: string; error: { code: string } };
          if (envelope.contractVersion === request.contractVersion && envelope.requestId === request.requestId) {
            runtimeCode = envelope.error.code;
          }
        } catch (error) {
          if (!(error instanceof AiSchemaValidationError)) throw error;
        }
      }
      if (runtimeCode === 'INFERENCE_FAILED') {
        throw new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_INFERENCE_FAILURE');
      }
      if (runtimeCode === 'RUNTIME_UNAVAILABLE') throw new AiGatewayError('AI_CONNECTION_FAILURE');
      throw new AiGatewayError('AI_RUNTIME_FAILURE', 502, 'AI_RUNTIME_TECHNICAL_FAILURE');
    }
    if (body === undefined) throw new AiGatewayError('AI_EMPTY_RESPONSE');
    return { status: response.status, body };
  }

  private parse(body: string, status: number): unknown {
    if (!body.trim()) {
      if (status < 200 || status >= 300) return undefined;
      throw new AiGatewayError('AI_EMPTY_RESPONSE');
    }
    try {
      return JSON.parse(body) as unknown;
    } catch {
      if (status < 200 || status >= 300) return undefined;
      throw new AiGatewayError('AI_INVALID_STRUCTURE');
    }
  }
}
