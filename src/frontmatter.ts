export function readFrontmatterString(
	fm: Record<string, unknown> | undefined,
	key: string,
	fallbackKey?: string,
): string | null {
	if (!fm) return null;
	const raw = fm[key] ?? (fallbackKey ? fm[fallbackKey] : undefined);
	if (raw === undefined || raw === null || raw === "") return null;
	if (typeof raw === "string") return raw;
	if (typeof raw === "number" || typeof raw === "boolean") return String(raw);
	return null;
}
