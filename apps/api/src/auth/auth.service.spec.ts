import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
jest.mock('argon2', () => ({ verify: jest.fn() }));
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from './auth.service';

describe('AuthService', () => {
  const activeUser = {
    id: '10000000-0000-4000-8000-000000000001', fullName: 'Student One',
    email: 'student.one@example.test', role: 'STUDENT', status: 'ACTIVE', passwordHash: 'argon-hash',
  };
  let users: { findUnique: jest.Mock };
  let jwt: { signAsync: jest.Mock };
  let auth: AuthService;

  beforeEach(() => {
    (argon2.verify as jest.Mock).mockReset().mockResolvedValue(true);
    users = { findUnique: jest.fn().mockResolvedValue(activeUser) };
    jwt = { signAsync: jest.fn().mockResolvedValue('signed-token') };
    auth = new AuthService({ user: users } as unknown as PrismaService, jwt as unknown as JwtService);
  });

  it('normalizes email, verifies Argon2id password, and returns the public User and token', async () => {
    const result = await auth.login({ email: ' Student.One@Example.Test ', password: 'correct-password' });
    expect(users.findUnique).toHaveBeenCalledWith(expect.objectContaining({ where: { email: 'student.one@example.test' } }));
    expect(result).toEqual({
      accessToken: 'signed-token',
      user: { id: activeUser.id, fullName: activeUser.fullName, email: activeUser.email, role: 'STUDENT', status: 'ACTIVE' },
    });
    expect(jwt.signAsync).toHaveBeenCalledWith({ sub: activeUser.id }, { algorithm: 'HS256', expiresIn: '2h' });
    expect(argon2.verify).toHaveBeenCalledWith(activeUser.passwordHash, 'correct-password');
  });

  it('returns the same invalid-credential response for unknown email and wrong password', async () => {
    (argon2.verify as jest.Mock).mockResolvedValue(false);
    users.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce(activeUser);
    const unknown = auth.login({ email: 'missing@example.test', password: 'wrong-password' });
    const wrong = auth.login({ email: activeUser.email, password: 'wrong-password' });
    await expect(unknown).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(wrong).rejects.toBeInstanceOf(UnauthorizedException);
    expect((await unknown.catch((error) => error.getResponse())).code).toBe('INVALID_CREDENTIALS');
    expect((await wrong.catch((error) => error.getResponse())).code).toBe('INVALID_CREDENTIALS');
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });

  it('rejects a disabled user with valid credentials and does not issue a token', async () => {
    users.findUnique.mockResolvedValue({ ...activeUser, status: 'DISABLED' });
    await expect(auth.login({ email: activeUser.email, password: 'correct-password' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(jwt.signAsync).not.toHaveBeenCalled();
  });
});
