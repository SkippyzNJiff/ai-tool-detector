export function stringifyCookies(
  cookies: Array<{ name: string; value: string }> | undefined
) {
  if (!cookies || cookies.length === 0) {
    return undefined;
  }

  return cookies.map((cookie) => `${cookie.name}=${cookie.value}`).join("; ");
}

export function findNumericScore(payload: unknown, candidates: string[]): number | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }

  const queue: unknown[] = [payload];
  while (queue.length > 0) {
    const item = queue.shift();
    if (!item || typeof item !== "object") {
      continue;
    }

    if (Array.isArray(item)) {
      queue.push(...item);
      continue;
    }

    const record = item as Record<string, unknown>;
    for (const key of candidates) {
      const value = record[key];
      if (typeof value === "number") {
        return value <= 1 ? value * 100 : value;
      }
      if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
        const numeric = Number(value);
        return numeric <= 1 ? numeric * 100 : numeric;
      }
    }

    queue.push(...Object.values(record));
  }

  return null;
}

export async function parseJsonSafely(response: Response) {
  const text = await response.text();
  try {
    return text ? (JSON.parse(text) as unknown) : null;
  } catch {
    return { rawText: text };
  }
}
