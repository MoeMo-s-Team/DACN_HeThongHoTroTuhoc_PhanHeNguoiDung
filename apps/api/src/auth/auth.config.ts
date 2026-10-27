export function validateJwtAccessSecret(value: unknown): Buffer {
  if (typeof value !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)) {
    throw new Error('JWT_ACCESS_SECRET must be Base64 for at least 32 random bytes');
  }
  const secret = Buffer.from(value, 'base64');
  if (secret.length < 32 || secret.toString('base64') !== value) {
    throw new Error('JWT_ACCESS_SECRET must be Base64 for at least 32 random bytes');
  }
  return secret;
}
