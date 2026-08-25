function fallbackRandomHex(length: number): string {
  const chars = "0123456789abcdef";
  let value = "";
  for (let i = 0; i < length; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

export function stableEventId(seed: string): string {
  if (typeof window !== "undefined" && "crypto" in window && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }

  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return (crypto as Crypto).randomUUID();
  }

  const now = Date.now();
  return `ev_${now.toString(36)}_${seed}_${fallbackRandomHex(8)}`;
}

export function normalizeString(value: unknown): string {
  if (value == null) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  try {
    return JSON.stringify(value) ?? "";
  } catch {
    return String(value);
  }
}

export function hashInput(input: unknown): string {
  const text = normalizeString(input);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `f-${(hash >>> 0).toString(16)}`;
}

export function toOccurrenceDate(value?: string): string {
  return value ? new Date(value).toISOString() : new Date().toISOString();
}

export function compareEventTimes(a: { occurredAt: string }, b: { occurredAt: string }): number {
  return a.occurredAt.localeCompare(b.occurredAt);
}

