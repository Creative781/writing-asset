export const PATH_SEP =
	typeof process !== "undefined" && process.platform === "win32" ? "\\" : "/";

const ROOT = PATH_SEP;

export function isAbsolutePath(filePath: string): boolean {
	return (
		filePath.startsWith("/") ||
		filePath.startsWith("\\") ||
		/^[A-Za-z]:[/\\]/.test(filePath)
	);
}

function drivePrefix(filePath: string): string {
	const match = /^([A-Za-z]:)[/\\]?/.exec(filePath);
	return match?.[1] ?? "";
}

function splitSegments(filePath: string): { drive: string; parts: string[] } {
	const drive = drivePrefix(filePath);
	const rest = drive ? filePath.slice(drive.length) : filePath;
	const parts = rest.split(/[/\\]+/).filter((part) => part.length > 0 && part !== ".");
	const stack: string[] = [];
	for (const part of parts) {
		if (part === "..") {
			stack.pop();
			continue;
		}
		stack.push(part);
	}
	return { drive, parts: stack };
}

export function normalizePath(filePath: string): string {
	if (!filePath) return ".";
	const { drive, parts } = splitSegments(filePath);
	const tail = parts.join(PATH_SEP);
	if (drive) return tail ? `${drive}${PATH_SEP}${tail}` : `${drive}${PATH_SEP}`;
	if (isAbsolutePath(filePath)) return `${ROOT}${tail}`;
	return tail || ".";
}

export function joinPath(...segments: string[]): string {
	if (segments.length === 0) return ".";
	let acc = "";
	for (const segment of segments) {
		if (!segment) continue;
		if (isAbsolutePath(segment)) {
			acc = segment;
			continue;
		}
		if (!acc) {
			acc = segment;
			continue;
		}
		const sep = acc.endsWith("/") || acc.endsWith("\\") ? "" : PATH_SEP;
		acc = acc + sep + segment;
	}
	return normalizePath(acc);
}

export function resolvePath(...segments: string[]): string {
	let resolved = "";
	for (const segment of segments) {
		if (!segment) continue;
		if (isAbsolutePath(segment)) resolved = segment;
		else if (!resolved) resolved = segment;
		else resolved = joinPath(resolved, segment);
	}
	const cwd = typeof process !== "undefined" ? process.cwd() : ".";
	if (!resolved) return normalizePath(cwd);
	if (!isAbsolutePath(resolved)) resolved = joinPath(cwd, resolved);
	return normalizePath(resolved);
}

export function dirnamePath(filePath: string): string {
	const normalized = normalizePath(filePath);
	const idx = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
	if (idx <= 0) {
		if (/^[A-Za-z]:/.test(normalized)) return normalized.slice(0, 2) + PATH_SEP;
		return ROOT;
	}
	const drive = drivePrefix(normalized);
	if (drive && idx <= drive.length) return `${drive}${PATH_SEP}`;
	return normalized.slice(0, idx) || ROOT;
}

export function basenamePath(filePath: string, suffix?: string): string {
	const normalized = normalizePath(filePath);
	const idx = Math.max(normalized.lastIndexOf("/"), normalized.lastIndexOf("\\"));
	let base = idx >= 0 ? normalized.slice(idx + 1) : normalized;
	if (suffix && base.endsWith(suffix)) base = base.slice(0, -suffix.length);
	return base;
}

export function extnamePath(filePath: string): string {
	const base = basenamePath(filePath);
	const dot = base.lastIndexOf(".");
	if (dot <= 0) return "";
	return base.slice(dot);
}

export function relativePath(from: string, to: string): string {
	const fromNorm = resolvePath(from);
	const toNorm = resolvePath(to);
	if (fromNorm === toNorm) return "";
	const fromParts = splitSegments(fromNorm).parts;
	const toParts = splitSegments(toNorm).parts;
	let shared = 0;
	while (
		shared < fromParts.length &&
		shared < toParts.length &&
		fromParts[shared] === toParts[shared]
	) {
		shared += 1;
	}
	const ups = Array.from({ length: fromParts.length - shared }, () => "..");
	const result = [...ups, ...toParts.slice(shared)].join(PATH_SEP);
	return result || ".";
}

export function toFileUrl(absPath: string): string {
	const normalized = absPath.replace(/\\/g, "/");
	if (/^[A-Za-z]:\//.test(normalized)) {
		return `file:///${encodeURI(normalized)}`;
	}
	if (normalized.startsWith("/")) {
		return `file://${encodeURI(normalized)}`;
	}
	return `file:///${encodeURI(normalized)}`;
}
