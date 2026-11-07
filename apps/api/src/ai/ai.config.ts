export const AI_RUNTIME_TIMEOUT_MS = 60_000;

export type AiConfig =
  | { available: true; baseUrl: string; token: string; timeoutMs: number }
  | { available: false; reason: 'missing_configuration' | 'invalid_configuration'; timeoutMs: number };

export function loadAiConfig(config: Record<string, unknown>): AiConfig {
  const baseUrl = config.AI_RUNTIME_BASE_URL;
  const token = config.AI_RUNTIME_TOKEN;

  if (baseUrl === undefined || token === undefined) {
    return { available: false, reason: 'missing_configuration', timeoutMs: AI_RUNTIME_TIMEOUT_MS };
  }

  if (typeof baseUrl !== 'string' || typeof token !== 'string' || !baseUrl.trim() || !token.trim()) {
    return { available: false, reason: 'invalid_configuration', timeoutMs: AI_RUNTIME_TIMEOUT_MS };
  }

  try {
    const url = new URL(baseUrl.trim());
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
      return { available: false, reason: 'invalid_configuration', timeoutMs: AI_RUNTIME_TIMEOUT_MS };
    }
  } catch {
    return { available: false, reason: 'invalid_configuration', timeoutMs: AI_RUNTIME_TIMEOUT_MS };
  }

  return { available: true, baseUrl: baseUrl.trim(), token, timeoutMs: AI_RUNTIME_TIMEOUT_MS };
}
