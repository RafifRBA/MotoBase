const key = (orderId: string) => `motobase:tracking:${orderId}`;

/** Token pelacakan hanya dikirim backend saat dibuat/diganti, jadi disimpan sementara di tab ini. */
export function saveTrackingToken(orderId: string, token: string) {
  try {
    sessionStorage.setItem(key(orderId), token);
  } catch {}
}
export function readTrackingToken(orderId: string): string | null {
  try {
    return sessionStorage.getItem(key(orderId));
  } catch {
    return null;
  }
}
export function clearTrackingToken(orderId: string) {
  try {
    sessionStorage.removeItem(key(orderId));
  } catch {}
}
