export const DATE_ERROR_MESSAGE = "올바른 날짜를 선택해주세요.";

export function todayYmd() {
  return new Date().toISOString().slice(0, 10);
}

export function toDateOnly(value) {
  if (!value) return null;
  if (typeof value === "string") {
    const normalized = value.length >= 10 ? value.slice(0, 10) : value;
    const date = new Date(normalized);
    return Number.isNaN(date.getTime()) ? null : date;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function isFutureDate(value) {
  const date = toDateOnly(value);
  if (!date) return false;
  const today = new Date(todayYmd());
  return date > today;
}

export function validatePastOrToday(value) {
  if (!value) return false;
  return !isFutureDate(value);
}
