import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { AuthService, AuthUser } from './auth.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{ headers: { authorization?: string }; user?: AuthUser }>();
    const token = /^Bearer ([^\s]+)$/i.exec(request.headers.authorization ?? '')?.[1];
    if (!token) {
      throw new UnauthorizedException({ code: 'AUTH_REQUIRED', message: 'Yêu cầu đăng nhập hợp lệ.', details: null });
    }
    request.user = await this.auth.authenticate(token);
    return true;
  }
}
