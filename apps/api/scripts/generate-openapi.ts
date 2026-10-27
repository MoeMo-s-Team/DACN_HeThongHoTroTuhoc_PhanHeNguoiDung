import 'reflect-metadata';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

async function generateOpenApi() {
  process.env.JWT_ACCESS_SECRET = Buffer.alloc(32).toString('base64');
  process.env.DATABASE_URL = 'postgresql://contract:contract@127.0.0.1:1/contract?schema=public';
  process.env.FRONTEND_ORIGIN = 'http://localhost:3100';
  process.env.API_PORT = '3101';

  const [{ Test }, { AppModule }, { PrismaService }, { createOpenApiDocument }] = await Promise.all([
    import('@nestjs/testing'),
    import('../src/app.module'),
    import('../src/prisma/prisma.service'),
    import('../src/openapi'),
  ]);
  const module = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PrismaService)
    .useValue({})
    .compile();
  const app = module.createNestApplication();
  app.setGlobalPrefix('api/v1');

  try {
    await app.init();
    const output = resolve(process.argv[2] ?? '../../packages/contracts/openapi.json');
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, `${JSON.stringify(createOpenApiDocument(app), null, 2)}\n`);
  } finally {
    await app.close();
  }
}

void generateOpenApi().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
