import { validateJwtAccessSecret } from './auth.config';

describe('validateJwtAccessSecret', () => {
  it('rejects a missing secret', () => {
    expect(() => validateJwtAccessSecret(undefined)).toThrow('JWT_ACCESS_SECRET');
  });

  it('rejects malformed Base64', () => {
    expect(() => validateJwtAccessSecret('not-base64')).toThrow('JWT_ACCESS_SECRET');
  });

  it('rejects Base64 that decodes to fewer than 32 bytes', () => {
    expect(() => validateJwtAccessSecret(Buffer.from('short').toString('base64'))).toThrow('JWT_ACCESS_SECRET');
  });

  it('returns decoded secret bytes for at least 32 bytes', () => {
    expect(validateJwtAccessSecret(Buffer.alloc(32, 7).toString('base64'))).toEqual(Buffer.alloc(32, 7));
  });
});
