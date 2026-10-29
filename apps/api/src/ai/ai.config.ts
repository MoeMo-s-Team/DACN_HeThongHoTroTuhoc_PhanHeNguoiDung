import { AiTask } from './schema-registry.service';

export interface AiTaskConfig {
  reservedOutputTokens: number;
  promptAndSchemaOverheadTokens: number;
  promptVersion: string;
}

export interface CapacityProfile {
  capacityProfileVersion: string;
  modelId: string;
  tokenizerId: string;
  contractVersion: string;
  contextWindowTokens: number;
  inputSafetyMarginTokens: number;
  tasks: Partial<Record<AiTask, AiTaskConfig>>;
}

export interface AiDeploymentBinding {
  modelId: string;
  tokenizerId: string;
  contractVersion: string;
  promptVersions: Partial<Record<AiTask, string>>;
}

export interface AiConfiguration {
  capacityProfile?: CapacityProfile;
  deployment?: AiDeploymentBinding;
  registryPromptVersions: Partial<Record<AiTask, string>>;
}

function parseJson<T>(value: string | undefined): T | undefined {
  if (!value) return undefined;
  try {
    return JSON.parse(value) as T;
  } catch {
    return undefined;
  }
}

export class AiConfig {
  constructor(readonly value: AiConfiguration) {}

  static fromEnvironment(env: NodeJS.ProcessEnv = process.env): AiConfig {
    return new AiConfig({
      capacityProfile: parseJson<CapacityProfile>(env.AI_CAPACITY_PROFILE_JSON),
      deployment: parseJson<AiDeploymentBinding>(env.AI_DEPLOYMENT_BINDING_JSON),
      registryPromptVersions: parseJson<Partial<Record<AiTask, string>>>(env.AI_REGISTRY_PROMPT_VERSIONS_JSON) ?? {},
    });
  }
}
