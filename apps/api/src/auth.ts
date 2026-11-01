import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private jwt: JwtService) {}
  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest<Request>();
    const token = (req.headers.authorization || "").replace(/^Bearer\s+/i, "");
    try {
      (req as any).user = this.jwt.verify(token, {
        secret: process.env.JWT_ACCESS_SECRET,
      });
      return true;
    } catch {
      throw new UnauthorizedException("Faça login para continuar.");
    }
  }
}
export const CurrentUser = createParamDecorator(
  (_data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user,
);
