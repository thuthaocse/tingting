export function splitEvenly(amount, ids) {
  if (
    !Number.isSafeInteger(amount) ||
    amount <= 0 ||
    amount > 1_000_000_000_000 ||
    !ids.length ||
    new Set(ids).size !== ids.length
  )
    throw Error('Số tiền hoặc người chia không hợp lệ');
  const sorted = [...ids].sort();
  return sorted.map((memberId, i) => ({
    memberId,
    amount: Math.floor(amount / ids.length) + (i < amount % ids.length ? 1 : 0),
  }));
}
export function money(n) {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(n);
}
export function today() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Ho_Chi_Minh',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
}
