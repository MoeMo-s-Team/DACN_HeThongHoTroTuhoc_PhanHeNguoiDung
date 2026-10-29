import { InferenceRequest } from '../../../src/ai/capacity-preflight.service';
import { RuntimeHttpResult } from '../../../src/ai/ai-gateway.service';

export class FakeAiRuntime {
  readonly requests: InferenceRequest[] = [];
  readonly outputs: Array<unknown | Error> = [];

  queue(...outputs: Array<unknown | Error>): this {
    this.outputs.push(...outputs);
    return this;
  }

  async infer(request: InferenceRequest): Promise<RuntimeHttpResult> {
    this.requests.push(request);
    const output = this.outputs.shift();
    if (output instanceof Error) throw output;
    if (output === undefined) throw new Error('Fake AI runtime response was not scripted');
    return {
      status: 200,
      body: {
        contractVersion: request.contractVersion,
        requestId: request.requestId,
        task: request.task,
        output,
        runtime: { modelId: 'model-1', promptVersion: `prompt-${request.task}` },
      },
    };
  }
}
