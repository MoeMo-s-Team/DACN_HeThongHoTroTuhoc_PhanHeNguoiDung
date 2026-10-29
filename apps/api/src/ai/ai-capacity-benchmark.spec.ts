import { AiConfig } from './ai.config';
import { AiPreflightError, CapacityPreflightService } from './capacity-preflight.service';

const task = 'STUDENT_LEARNING_ANALYSIS';
function setup(estimate: number, mismatch = false) {
  const promptVersion = mismatch ? 'other' : 'prompt-v1';
  const config = new AiConfig({
    capacityProfile: { capacityProfileVersion: 'candidate-v1', modelId: 'candidate-model', tokenizerId: 'candidate-tokenizer',
      contractVersion: '1.0', contextWindowTokens: 1000, inputSafetyMarginTokens: 20,
      tasks: { [task]: { reservedOutputTokens: 100, promptAndSchemaOverheadTokens: 50, promptVersion } } },
    deployment: { modelId: 'candidate-model', tokenizerId: 'candidate-tokenizer', contractVersion: '1.0', promptVersions: { [task]: 'prompt-v1' } },
    registryPromptVersions: { [task]: 'prompt-v1' },
  });
  const estimator = { tokenizerId: 'candidate-tokenizer', capacityProfileVersion: 'candidate-v1', estimate: () => estimate };
  return new CapacityPreflightService(config, estimator);
}

describe('candidate capacity budget integration seam', () => {
  it('allows exact budget and dispatches only after preflight', () => {
    const service = setup(830); const dispatch = jest.fn();
    const result = service.preflight(service.buildRequest(task, { text: 'complete payload' }, 'at-budget'));
    dispatch(result.serializedPayload);
    expect(result.inputBudgetTokens).toBe(830);
    expect(dispatch).toHaveBeenCalledTimes(1);
  });

  it('rejects budget plus one before dispatch or log creation', () => {
    const service = setup(831); const dispatch = jest.fn(); const log = jest.fn();
    try { dispatch(service.preflight(service.buildRequest(task, {}, 'over-budget'))); } catch (error) {
      expect(error).toBeInstanceOf(AiPreflightError);
      expect((error as AiPreflightError).getStatus()).toBe(422);
    }
    expect(dispatch).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  });

  it('maps a profile mismatch to 502 without dispatch or log', () => {
    const service = setup(1, true); const dispatch = jest.fn(); const log = jest.fn();
    try { dispatch(service.preflight(service.buildRequest(task, {}, 'mismatch'))); } catch (error) {
      expect(error).toBeInstanceOf(AiPreflightError);
      expect((error as AiPreflightError).getStatus()).toBe(502);
    }
    expect(dispatch).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  });
});
