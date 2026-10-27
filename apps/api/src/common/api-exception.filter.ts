import { ArgumentsHost, Catch, ExceptionFilter, HttpException, HttpStatus } from '@nestjs/common';

type ApiResponse = { status(code: number): { json(body: unknown): void } };

@Catch()
export class ApiExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<ApiResponse>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;
    const body = exception instanceof HttpException ? exception.getResponse() : null;
    if (body && typeof body === 'object' && 'code' in body) {
      return response.status(status).json(body);
    }
    if (status === HttpStatus.BAD_REQUEST) {
      const messages = body && typeof body === 'object' && 'message' in body ? body.message : null;
      return response.status(status).json({
        code: 'VALIDATION_ERROR',
        message: 'Dữ liệu đầu vào không hợp lệ.',
        details: Array.isArray(messages) ? messages : null,
      });
    }
    const code = status === HttpStatus.UNAUTHORIZED ? 'AUTH_REQUIRED' : status === HttpStatus.FORBIDDEN ? 'FORBIDDEN_RESOURCE' : status === HttpStatus.NOT_FOUND ? 'RESOURCE_NOT_FOUND' : 'DATABASE_FAILURE';
    const message = status === HttpStatus.UNAUTHORIZED ? 'Yêu cầu đăng nhập hợp lệ.' : status === HttpStatus.FORBIDDEN ? 'Không có quyền thực hiện thao tác này.' : status === HttpStatus.NOT_FOUND ? 'Không tìm thấy tài nguyên.' : 'Không thể xử lý yêu cầu.';
    return response.status(status).json({ code, message, details: null });
  }
}
