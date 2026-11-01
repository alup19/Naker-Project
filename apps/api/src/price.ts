export function adjustedPrice(baseCents: number, percent: number) {
  if (
    !Number.isInteger(baseCents) ||
    baseCents < 0 ||
    !Number.isFinite(percent) ||
    percent < -90 ||
    percent > 500
  )
    throw new Error("Valor inválido");
  return Math.max(0, Math.round(baseCents * (1 + percent / 100)));
}
export function assertOwner(resourceOwnerId: string, requesterId: string) {
  if (resourceOwnerId !== requesterId) throw new Error("Acesso negado");
}
