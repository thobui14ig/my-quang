import {
  Body,
  CanActivate,
  Controller,
  createParamDecorator,
  ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
  UseGuards,
  Post,
  Get,
} from '@nestjs/common';
import { IsString, MinLength } from 'class-validator';
import { Request } from 'express';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { Database } from './database';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
}

interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export class LoginDto {
  @IsString()
  username!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const header = request.headers.authorization;
    const token = header?.startsWith('Bearer ') ? header.slice(7) : '';
    const secret = process.env.JWT_SECRET;
    if (!secret || !token) throw new UnauthorizedException('Vui lòng đăng nhập.');
    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;
      if (typeof payload.sub !== 'string' || typeof payload.username !== 'string' || typeof payload.fullName !== 'string') {
        throw new Error('Invalid token payload');
      }
      request.user = {
        id: Number(payload.sub),
        username: payload.username,
        fullName: payload.fullName,
      };
      return Number.isSafeInteger(request.user.id);
    } catch {
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
    }
  }
}

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthUser =>
    context.switchToHttp().getRequest<AuthenticatedRequest>().user,
);

@Controller('auth')
export class AuthController {
  constructor(@Inject(Database) private readonly db: Database) {}

  @Post('login')
  async login(@Body() body: LoginDto) {
    const { rows } = await this.db.query<{
      id: number;
      username: string;
      full_name: string;
      password_hash: string;
      is_active: boolean;
    }>(
      'SELECT id, username, full_name, password_hash, is_active FROM users WHERE username = $1',
      [body.username.trim()],
    );
    const user = rows[0];
    if (!user || !user.is_active || !(await bcrypt.compare(body.password, user.password_hash))) {
      throw new UnauthorizedException('Tên đăng nhập hoặc mật khẩu không đúng.');
    }
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error('JWT_SECRET chưa được cấu hình.');
    const token = jwt.sign(
      { username: user.username, fullName: user.full_name },
      secret,
      { subject: String(user.id), expiresIn: '12h' },
    );
    return {
      accessToken: token,
      user: { id: user.id, username: user.username, fullName: user.full_name },
    };
  }

  @UseGuards(AuthGuard)
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return user;
  }
}
