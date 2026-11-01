import {
  Module,
  Injectable,
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
  Res,
  BadRequestException,
  NotFoundException,
  ConflictException,
  UseInterceptors,
  UploadedFile,
} from "@nestjs/common";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { ThrottlerModule, ThrottlerGuard, Throttle } from "@nestjs/throttler";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import {
  IsBoolean,
  IsArray,
  IsEmail,
  IsInt,
  IsIn,
  IsOptional,
  IsString,
  Min,
  MinLength,
  ArrayNotEmpty,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { Request, Response } from "express";
import { randomBytes, createHash } from "crypto";
import * as bcrypt from "bcrypt";
import * as fs from "fs/promises";
import * as path from "path";
import sharp from "sharp";
import { PrismaService } from "./prisma.service";
import { AuthGuard, CurrentUser } from "./auth";
import { adjustedPrice } from "./price";

class RegisterDto {
  @IsString() @MinLength(2) name!: string;
  @IsEmail() email!: string;
  @IsString() @MinLength(8) password!: string;
  @IsOptional() @IsString() phone?: string;
}
class LoginDto {
  @IsEmail() email!: string;
  @IsString() password!: string;
}
class ResetPasswordDto {
  @IsString() token!: string;
  @IsString() @MinLength(8) password!: string;
}
class EmailDto {
  @IsEmail() email!: string;
}
class CategoryDto {
  @IsString() @MinLength(2) name!: string;
}
class ProductDto {
  @IsString() @MinLength(2) name!: string;
  @IsInt() @Min(0) priceCents!: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() description?: string;
  @IsOptional() @IsString() categoryId?: string;
  @IsOptional() @IsBoolean() active?: boolean;
}
class UpdateProductDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsInt() @Min(0) priceCents?: number;
  @IsOptional() @IsString() imageUrl?: string;
  @IsOptional() @IsString() description?: string | null;
  @IsOptional() @IsString() categoryId?: string | null;
  @IsOptional() @IsBoolean() active?: boolean;
}
class CustomerDto {
  @IsString() @MinLength(2) name!: string;
  @IsString() phone!: string;
  @IsOptional() @IsString() notes?: string;
}
class UpdateCustomerDto {
  @IsOptional() @IsString() @MinLength(2) name?: string;
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsString() notes?: string;
}
class PriceDto {
  @IsString() productId!: string;
  @IsInt() @Min(0) priceCents!: number;
}
class BatchPricesDto {
  @IsArray() @ArrayNotEmpty() @ValidateNested({ each: true }) @Type(() => PriceDto)
  items!: PriceDto[];
}
class UpdateProfileDto {
  @IsOptional() @IsString() phone?: string;
  @IsOptional() @IsIn(["dark", "light"]) themeMode?: string;
  @IsOptional() @IsIn(["gold", "blue", "emerald"]) accentColor?: string;
}
@Injectable()
class StorageService {
  async save(file: Express.Multer.File) {
    if (
      !file ||
      !["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)
    )
      throw new BadRequestException("Envie uma imagem JPEG, PNG ou WebP.");
    if (file.size > 5 * 1024 * 1024)
      throw new BadRequestException("A imagem deve ter até 5 MB.");
    const dir = path.resolve(process.env.UPLOAD_DIR || "uploads");
    await fs.mkdir(dir, { recursive: true });
    const name = `${randomBytes(16).toString("hex")}.webp`;
    await sharp(file.buffer)
      .rotate()
      .resize(1200, 1200, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 82 })
      .toFile(path.join(dir, name));
    return `/uploads/${name}`;
  }
}
@Injectable()
class AuthService {
  constructor(
    private db: PrismaService,
    private jwt: JwtService,
  ) {}
  async register(d: RegisterDto) {
    const email = d.email.toLowerCase().trim();
    if (await this.db.user.findUnique({ where: { email } }))
      throw new ConflictException("Este e-mail já está cadastrado.");
    const slugBase = d.name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    const user = await this.db.user.create({
      data: {
        name: d.name,
        email,
        passwordHash: await bcrypt.hash(d.password, 12),
        phone: d.phone,
        slug: `${slugBase}-${randomBytes(3).toString("hex")}`,
      },
    });
    return this.issue(user);
  }
  async login(d: LoginDto) {
    const user = await this.db.user.findUnique({
      where: { email: d.email.toLowerCase().trim() },
    });
    if (!user || !(await bcrypt.compare(d.password, user.passwordHash)))
      throw new BadRequestException("E-mail ou senha inválidos.");
    return this.issue(user);
  }
  private issue(u: any) {
    const payload = { sub: u.id, email: u.email };
    return {
      user: {
        id: u.id,
        name: u.name,
        email: u.email,
        slug: u.slug,
        phone: u.phone,
        themeMode: u.themeMode,
        accentColor: u.accentColor,
      },
      accessToken: this.jwt.sign(payload, {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: "15m",
      }),
      refreshToken: this.jwt.sign(payload, {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: "30d",
      }),
    };
  }
  async refresh(token: string) {
    try {
      const p = this.jwt.verify(token, {
        secret: process.env.JWT_REFRESH_SECRET,
      });
      const u = await this.db.user.findUnique({ where: { id: p.sub } });
      if (!u) throw 0;
      return this.issue(u);
    } catch {
      throw new BadRequestException("Sessão expirada. Entre novamente.");
    }
  }
  async requestReset(email: string) {
    const u = await this.db.user.findUnique({
      where: { email: email.toLowerCase().trim() },
    });
    if (!u)
      return {
        message: "Se o e-mail estiver cadastrado, enviaremos as instruções.",
      };
    const raw = randomBytes(32).toString("hex");
    await this.db.passwordReset.create({
      data: {
        userId: u.id,
        tokenHash: createHash("sha256").update(raw).digest("hex"),
        expiresAt: new Date(Date.now() + 3600000),
      },
    });
    if (process.env.NODE_ENV !== "production")
      console.log(`Password reset token for ${email}: ${raw}`);
    return {
      message: "Se o e-mail estiver cadastrado, enviaremos as instruções.",
    };
  }
  async resetPassword(d: ResetPasswordDto) {
    const tokenHash = createHash("sha256").update(d.token).digest("hex");
    const reset = await this.db.passwordReset.findUnique({
      where: { tokenHash },
    });
    if (!reset || reset.usedAt || reset.expiresAt.getTime() < Date.now())
      throw new BadRequestException("Link inválido ou expirado.");
    await this.db.$transaction([
      this.db.user.update({
        where: { id: reset.userId },
        data: { passwordHash: await bcrypt.hash(d.password, 12) },
      }),
      this.db.passwordReset.update({
        where: { id: reset.id },
        data: { usedAt: new Date() },
      }),
    ]);
    return { message: "Senha atualizada. Faça login novamente." };
  }
}
@ApiTags("Autenticação")
@Controller("auth")
class AuthController {
  constructor(
    private auth: AuthService,
    private jwt: JwtService,
  ) {}
  @Post("register") async register(
    @Body() d: RegisterDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const s = await this.auth.register(d);
    res.cookie("refreshToken", s.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 30 * 86400000,
    });
    return { user: s.user, accessToken: s.accessToken };
  }
  @Post("login")
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 8, ttl: 60000 } })
  async login(@Body() d: LoginDto, @Res({ passthrough: true }) res: Response) {
    const s = await this.auth.login(d);
    res.cookie("refreshToken", s.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 30 * 86400000,
    });
    return { user: s.user, accessToken: s.accessToken };
  }
  @Post("refresh") async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const s = await this.auth.refresh((req as any).cookies?.refreshToken);
    res.cookie("refreshToken", s.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/api/auth",
      maxAge: 30 * 86400000,
    });
    return { user: s.user, accessToken: s.accessToken };
  }
  @Post("logout") logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie("refreshToken", { path: "/api/auth" });
    return { message: "Sessão encerrada." };
  }
  @Post("forgot-password") forgot(@Body() d: EmailDto) {
    return this.auth.requestReset(d.email);
  }
  @Post("reset-password") resetPassword(@Body() d: ResetPasswordDto) {
    return this.auth.resetPassword(d);
  }
}
@ApiTags("Perfil")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("profile")
class ProfileController {
  constructor(private db: PrismaService) {}
  @Patch()
  async update(@CurrentUser() user: any, @Body() d: UpdateProfileDto) {
    const data: { phone?: string | null; themeMode?: string; accentColor?: string } = {};
    if (d.phone !== undefined) data.phone = d.phone.trim() || null;
    if (d.themeMode !== undefined) data.themeMode = d.themeMode;
    if (d.accentColor !== undefined) data.accentColor = d.accentColor;
    const saved = await this.db.user.update({
      where: { id: user.sub },
      data,
      select: { id: true, name: true, email: true, phone: true, slug: true, themeMode: true, accentColor: true },
    });
    return saved;
  }
}
@ApiTags("Produtos")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("products")
class ProductController {
  constructor(private db: PrismaService) {}
  @Get() list(
    @CurrentUser() u: any,
    @Query("q") q = "",
    @Query("categoryId") categoryId?: string,
    @Query("page") page = "1",
  ) {
    const take = 24,
      skip = (Math.max(1, +page) - 1) * take;
    return this.db.product.findMany({
      where: {
        userId: u.sub,
        ...(categoryId ? { categoryId } : {}),
        ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
      },
      include: { category: true },
      orderBy: { createdAt: "desc" },
      skip,
      take,
    });
  }
  @Post() async create(@CurrentUser() u: any, @Body() d: ProductDto) {
    if (
      d.categoryId &&
      !(await this.db.category.findFirst({
        where: { id: d.categoryId, userId: u.sub },
      }))
    )
      throw new NotFoundException("Categoria não encontrada.");
    return this.db.product.create({ data: { ...d, userId: u.sub } });
  }
  @Patch(":id") async update(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() d: UpdateProductDto,
  ) {
    const p = await this.db.product.findFirst({ where: { id, userId: u.sub } });
    if (!p) throw new NotFoundException("Produto não encontrado.");
    if (
      d.categoryId &&
      !(await this.db.category.findFirst({
        where: { id: d.categoryId, userId: u.sub },
      }))
    )
      throw new NotFoundException("Categoria não encontrada.");
    return this.db.product.update({ where: { id }, data: d });
  }
  @Delete(":id") async remove(@CurrentUser() u: any, @Param("id") id: string) {
    const p = await this.db.product.findFirst({ where: { id, userId: u.sub } });
    if (!p) throw new NotFoundException("Produto não encontrado.");
    await this.db.product.delete({ where: { id } });
    return { message: "Produto removido." };
  }
}
@ApiTags("Categorias")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("categories")
class CategoryController {
  constructor(private db: PrismaService) {}
  @Get() list(@CurrentUser() u: any) {
    return this.db.category.findMany({
      where: { userId: u.sub },
      orderBy: { name: "asc" },
    });
  }
  @Post() async create(@CurrentUser() u: any, @Body() d: CategoryDto) {
    return this.db.category.create({ data: { name: d.name, userId: u.sub } });
  }
  @Delete(":id") async remove(@CurrentUser() u: any, @Param("id") id: string) {
    const c = await this.db.category.findFirst({
      where: { id, userId: u.sub },
    });
    if (!c) throw new NotFoundException();
    await this.db.category.delete({ where: { id } });
    return { message: "Categoria removida." };
  }
}
@ApiTags("Clientes")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("customers")
class CustomerController {
  constructor(private db: PrismaService) {}
  @Get() list(@CurrentUser() u: any) {
    return this.db.customer.findMany({
      where: { userId: u.sub },
      include: { _count: { select: { prices: true } } },
      orderBy: { name: "asc" },
    });
  }
  @Post() create(@CurrentUser() u: any, @Body() d: CustomerDto) {
    return this.db.customer.create({ data: { ...d, userId: u.sub } });
  }
  @Patch(":id") async update(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() d: UpdateCustomerDto,
  ) {
    const c = await this.db.customer.findFirst({
      where: { id, userId: u.sub },
    });
    if (!c) throw new NotFoundException();
    return this.db.customer.update({ where: { id }, data: d });
  }
  @Delete(":id") async remove(@CurrentUser() u: any, @Param("id") id: string) {
    const c = await this.db.customer.findFirst({
      where: { id, userId: u.sub },
    });
    if (!c) throw new NotFoundException();
    await this.db.customer.delete({ where: { id } });
    return { message: "Cliente removido." };
  }
  @Get(":id/prices") async prices(
    @CurrentUser() u: any,
    @Param("id") id: string,
  ) {
    const c = await this.db.customer.findFirst({
      where: { id, userId: u.sub },
    });
    if (!c) throw new NotFoundException();
    return this.db.product.findMany({
      where: { userId: u.sub },
      include: { prices: { where: { customerId: id } } },
      orderBy: { name: "asc" },
    });
  }
  @Put(":id/prices") async setPrice(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() d: PriceDto,
  ) {
    const c = await this.db.customer.findFirst({
        where: { id, userId: u.sub },
      }),
      p = await this.db.product.findFirst({
        where: { id: d.productId, userId: u.sub },
      });
    if (!c || !p) throw new NotFoundException();
    return this.db.customerPrice.upsert({
      where: {
        customerId_productId: { customerId: id, productId: d.productId },
      },
      create: {
        customerId: id,
        productId: d.productId,
        priceCents: d.priceCents,
      },
      update: { priceCents: d.priceCents },
    });
  }
  @Put(":id/prices/batch") async setPrices(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() d: BatchPricesDto,
  ) {
    const customer = await this.db.customer.findFirst({
      where: { id, userId: u.sub },
      select: { id: true },
    });
    if (!customer) throw new NotFoundException("Cliente não encontrado.");
    const productIds = d.items.map((item) => item.productId);
    if (new Set(productIds).size !== productIds.length)
      throw new BadRequestException("Há produtos repetidos na lista de preços.");
    const ownedProducts = await this.db.product.findMany({
      where: { id: { in: productIds }, userId: u.sub },
      select: { id: true },
    });
    if (ownedProducts.length !== productIds.length)
      throw new NotFoundException("Um ou mais produtos não foram encontrados.");
    return this.db.$transaction(d.items.map((item) => this.db.customerPrice.upsert({
      where: { customerId_productId: { customerId: id, productId: item.productId } },
      create: { customerId: id, productId: item.productId, priceCents: item.priceCents },
      update: { priceCents: item.priceCents },
    })));
  }
  @Post(":id/adjust") async adjust(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body("percent") percent: number,
  ) {
    const c = await this.db.customer.findFirst({
      where: { id, userId: u.sub },
    });
    if (!c) throw new NotFoundException();
    let products: any[];
    try {
      products = await this.db.product.findMany({
        where: { userId: u.sub, active: true },
      });
      const ops = products.map((p: any) => {
        const priceCents = adjustedPrice(p.priceCents, percent);
        return this.db.customerPrice.upsert({
          where: { customerId_productId: { customerId: id, productId: p.id } },
          create: { customerId: id, productId: p.id, priceCents },
          update: { priceCents },
        });
      });
      await this.db.$transaction(ops);
    } catch {
      throw new BadRequestException(
        "Percentual inválido. Informe um valor entre -90% e 500%.",
      );
    }
    return { updated: products.length };
  }
  @Post(":id/share-link") async share(
    @CurrentUser() u: any,
    @Param("id") id: string,
    @Body() body: { active?: boolean; regenerate?: boolean },
  ) {
    const c = await this.db.customer.findFirst({
      where: { id, userId: u.sub },
    });
    if (!c) throw new NotFoundException();
    const active = body.active ?? true;
    const token = active
      ? body.regenerate || !c.publicToken
        ? randomBytes(32).toString("base64url")
        : c.publicToken
      : c.publicToken;
    const saved = await this.db.customer.update({
      where: { id },
      data: { publicToken: token, linkActive: active },
    });
    return {
      active: saved.linkActive,
      token: active ? saved.publicToken : null,
    };
  }
}
@ApiTags("Upload")
@ApiBearerAuth()
@UseGuards(AuthGuard)
@Controller("upload")
class UploadController {
  constructor(private storage: StorageService) {}
  @Post()
  @UseInterceptors(
    FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }),
  )
  async upload(@UploadedFile() file: Express.Multer.File) {
    return { url: await this.storage.save(file) };
  }
}
@ApiTags("Catálogo público")
@Controller()
class PublicController {
  constructor(private db: PrismaService) {}
  @Get("catalog/:slug") async catalog(@Param("slug") slug: string) {
    const u = await this.db.user.findUnique({ where: { slug } });
    if (!u) throw new NotFoundException("Catálogo não encontrado.");
    return {
      distributor: {
        name: u.name,
        phone: u.phone,
        slug: u.slug,
        logoUrl: u.logoUrl,
        themeMode: u.themeMode,
        accentColor: u.accentColor,
      },
      products: await this.db.product.findMany({
        where: { userId: u.id, active: true },
        include: { category: true },
        orderBy: { name: "asc" },
      }),
    };
  }
  @Get("share/:token") async customerCatalog(@Param("token") token: string) {
    const c = await this.db.customer.findUnique({
      where: { publicToken: token },
      include: { user: true },
    });
    if (!c || !c.linkActive)
      throw new NotFoundException("Este link não está mais disponível.");
    const products = await this.db.product.findMany({
      where: { userId: c.userId, active: true },
      include: { category: true, prices: { where: { customerId: c.id } } },
      orderBy: { name: "asc" },
    });
    return {
      distributor: {
        name: c.user.name,
        phone: c.user.phone,
        slug: c.user.slug,
        logoUrl: c.user.logoUrl,
        themeMode: c.user.themeMode,
        accentColor: c.user.accentColor,
      },
      customerName: c.name,
      products: products.map((p: any) => ({
        ...p,
        priceCents: p.prices[0]?.priceCents ?? p.priceCents,
        prices: undefined,
      })),
    };
  }
}
@Module({
  imports: [
    JwtModule.register({}),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
  ],
  controllers: [
    AuthController,
    ProfileController,
    ProductController,
    CategoryController,
    CustomerController,
    UploadController,
    PublicController,
  ],
  providers: [PrismaService, AuthService, AuthGuard, StorageService],
})
export class AppModule {}
