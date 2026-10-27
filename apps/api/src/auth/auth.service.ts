import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';

export type AuthUser = {
  id: string;
  fullName: string;
  email: string;
  role: 'STUDENT' | 'TEACHER' | 'ADMINISTRATOR';
  status: 'ACTIVE';
};

function userSummary(user: AuthUser): AuthUser {
  return { id: user.id, fullName: user.fullName, email: user.email, role: user.role, status: user.status };
}

function invalidCredentials() {
  return new UnauthorizedException({ code: 'INVALID_CREDENTIALS', message: 'Thông tin đăng nhập không hợp lệ.', details: null });
}

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService, private readonly jwt: JwtService) {}

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email.trim().toLowerCase() },
      select: { id: true, fullName: true, email: true, role: true, status: true, passwordHash: true },
    });
    if (!user || !await argon2.verify(user.passwordHash, input.password)) throw invalidCredentials();
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.', details: null });
    }
    const accessToken = await this.jwt.signAsync({ sub: user.id }, { algorithm: 'HS256', expiresIn: '2h' });
    return { accessToken, user: userSummary(user as AuthUser) };
  }

  async authenticate(token: string): Promise<AuthUser> {
    let payload: { sub?: unknown; iat?: unknown; exp?: unknown };
    try {
      payload = await this.jwt.verifyAsync(token, { algorithms: ['HS256'] });
    } catch {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null });
    }
    if (typeof payload.sub !== 'string'
      || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(payload.sub)
      || !Number.isInteger(payload.iat)
      || !Number.isInteger(payload.exp)
      || (payload.exp as number) - (payload.iat as number) !== 7200) {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null });
    }
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, fullName: true, email: true, role: true, status: true },
    });
    if (!user) throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null });
    if (user.status !== 'ACTIVE') {
      throw new ForbiddenException({ code: 'ACCOUNT_DISABLED', message: 'Tài khoản đã bị vô hiệu hóa.', details: null });
    }
    return userSummary(user as AuthUser);
  }
}
