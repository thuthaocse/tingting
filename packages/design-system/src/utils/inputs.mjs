export function formatMoneyInput(amount) {
  return amount > 0 && Number.isSafeInteger(amount)
    ? new Intl.NumberFormat('en-US').format(amount)
    : '';
}
export function parseMoneyInput(text, maximum = 1_000_000_000_000) {
  const digits = text.normalize('NFKC').replace(/[,\.\s₫đ]/g, '');
  if (!/^\d*$/.test(digits)) return null;
  const amount = Number(digits);
  return Number.isSafeInteger(amount) && amount >= 0 && amount <= maximum ? amount : null;
}
export function caretAfterDigits(text, digits) {
  if (digits === 0) return 0;
  let count = 0;
  for (let index = 0; index < text.length; index++) {
    if (/\d/.test(text[index]) && ++count === digits) return index + 1;
  }
  return text.length;
}
export function searchKey(text) {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[đĐ]/g, 'd')
    .toLowerCase()
    .trim();
}
