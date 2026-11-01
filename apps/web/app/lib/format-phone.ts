function localDigits(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  const explicitCountryCode = /^\s*\+\s*55(?:\D|$)/.test(phone);
  if ((explicitCountryCode || digits.length > 11) && digits.startsWith("55")) digits = digits.slice(2);
  if (digits.startsWith("0") && digits.length === 12) digits = digits.slice(1);
  return digits.slice(0, 11);
}

/** Máscara progressiva para campos de edição, sem mudar o valor até salvar. */
export function formatPhoneForInput(phone?: string | null): string {
  if (!phone) return "";
  const digits = localDigits(phone);
  if (!digits) return "";
  const ddd = digits.slice(0, 2);
  if (digits.length <= 2) return `+ 55 (${ddd}${digits.length === 2 ? ")" : ""}`;
  const number = digits.slice(2);
  const prefix = `+ 55 (${ddd}) `;
  if (number.length >= 9) {
    return `${prefix}${number.slice(0, 1)} ${number.slice(1, 5)}${number.length > 5 ? `-${number.slice(5)}` : ""}`;
  }
  return `${prefix}${number.length > 4 ? `${number.slice(0, 4)}-${number.slice(4)}` : number}`;
}

/** Formata números brasileiros apenas para leitura. */
export function formatPhoneForDisplay(phone?: string | null): string {
  if (!phone) return "";
  const digits = localDigits(phone);
  if (digits.length === 10 || digits.length === 11) return formatPhoneForInput(digits);
  return phone.trim();
}

/** Salva números brasileiros em dígitos com o código do país 55. */
export function normalizePhoneForStorage(phone?: string | null): string {
  if (!phone) return "";
  const digits = localDigits(phone);
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  return "";
}
