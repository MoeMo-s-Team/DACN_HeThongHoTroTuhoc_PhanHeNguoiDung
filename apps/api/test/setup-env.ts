import { randomBytes } from 'node:crypto';

if (!process.env.JWT_ACCESS_SECRET) process.env.JWT_ACCESS_SECRET = randomBytes(32).toString('base64');
