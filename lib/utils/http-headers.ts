export function setAsciiHeader(
  headers: Record<string, string>,
  name: string,
  value: string | undefined,
): boolean {
  if (!value || !/^[\x20-\x7e]+$/.test(value)) return false;
  headers[name] = value;
  return true;
}
