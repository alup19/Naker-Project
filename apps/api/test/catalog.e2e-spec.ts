import { Test } from "@nestjs/testing";
import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { AppModule } from "../src/modules";
import { PrismaService } from "../src/prisma.service";

describe("Public catalog API (e2e)", () => {
  let app: INestApplication;
  const prisma = {
    user: {
      findUnique: jest
        .fn()
        .mockResolvedValue({
          id: "user-1",
          name: "Distribuidora Exemplo",
          phone: "5511999999999",
          slug: "exemplo",
          logoUrl: null,
        }),
    },
    product: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { id: "p1", name: "Arroz", priceCents: 2500, active: true },
        ]),
    },
  };
  beforeAll(async () => {
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(PrismaService)
      .useValue(prisma)
      .compile();
    app = module.createNestApplication();
    app.setGlobalPrefix("api");
    await app.init();
  });
  afterAll(async () => app.close());
  it("returns the active distributor catalog without authentication", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/catalog/exemplo")
      .expect(200);
    expect(response.body.distributor.name).toBe("Distribuidora Exemplo");
    expect(response.body.products[0].priceCents).toBe(2500);
  });
});
