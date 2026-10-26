import dotenv from 'dotenv';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.example' });

function databaseIdentity(value: string): string {
  const url = new URL(value);
  return `${url.hostname}:${url.port || '5432'}${url.pathname}${url.searchParams.get('schema') ?? ''}`;
}

export function requireTestDatabaseUrl(): string {
  const testUrl = process.env.TEST_DATABASE_URL;
  if (!testUrl) throw new Error('TEST_DATABASE_URL is required for integration tests');

  const developmentUrl = process.env.DEVELOPMENT_DATABASE_URL ?? process.env.DATABASE_URL;
  if (developmentUrl && databaseIdentity(testUrl) === databaseIdentity(developmentUrl)) {
    throw new Error('TEST_DATABASE_URL must point to a database separate from DATABASE_URL');
  }

  return testUrl;
}
