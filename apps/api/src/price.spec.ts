import { adjustedPrice, assertOwner } from "./price";
describe("adjustedPrice", () => {
  it("aplica desconto e arredonda em centavos", () =>
    expect(adjustedPrice(1001, -10)).toBe(901));
  it("aplica acréscimo", () => expect(adjustedPrice(1000, 12.5)).toBe(1125));
  it("rejeita percentual fora do limite", () =>
    expect(() => adjustedPrice(1000, -100)).toThrow());
});
describe("assertOwner", () => {
  it("permite somente o dono", () =>
    expect(() => assertOwner("owner-1", "owner-1")).not.toThrow());
  it("nega acesso a recurso alheio", () =>
    expect(() => assertOwner("owner-1", "owner-2")).toThrow("Acesso negado"));
});
