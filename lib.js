export function toMinutes(str) {
  const [h, m] = str.split(":").map(Number);
  return h * 60 + m;
}
