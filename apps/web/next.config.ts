import dotenv from 'dotenv';
import path from 'node:path';
import type { NextConfig } from 'next';

dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3101/api/v1',
  },
};

export default nextConfig;
