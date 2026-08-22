import {
	isAbsolutePath,
	joinPath,
	PATH_SEP,
	relativePath,
	resolvePath,
	toFileUrl,
} from "./path-utils";
import { isExistingFile } from "./sys";

export function toStoredPath(absPath: string, assetRoot: string): string {
	if (!assetRoot) return absPath;
	const root = resolvePath(assetRoot);
	const abs = resolvePath(absPath);
	const prefix = root.endsWith(PATH_SEP) ? root : root + PATH_SEP;
	if (abs === root || abs.startsWith(prefix)) {
		return relativePath(root, abs) || ".";
	}
	return abs;
}

export function resolveAssetPath(storedPath: string, assetRoot: string): string {
	if (isAbsolutePath(storedPath)) return storedPath;
	if (!assetRoot) return storedPath;
	return resolvePath(assetRoot, storedPath);
}

export function fileExists(absPath: string): boolean {
	return isExistingFile(absPath);
}

export { toFileUrl };

export function replacePathPrefix(
	storedPath: string,
	oldPrefix: string,
	newPrefix: string,
): string {
	const abs = resolvePath(storedPath);
	const from = resolvePath(oldPrefix);
	const to = resolvePath(newPrefix);
	if (abs === from) return to;
	const fromPrefix = from.endsWith(PATH_SEP) ? from : from + PATH_SEP;
	if (abs.startsWith(fromPrefix)) {
		return joinPath(to, abs.slice(fromPrefix.length));
	}
	return storedPath;
}

export function uniqueAssetId(filename: string, existing: Set<string>): string {
	const stem = filename.replace(/\.[^.]+$/, "");
	const base =
		stem
			.toLowerCase()
			.replace(/[^a-z0-9가-힣]+/gi, "-")
			.replace(/^-+|-+$/g, "")
			.slice(0, 40) || "asset";
	if (!existing.has(base)) return base;
	let i = 2;
	while (existing.has(`${base}-${i}`)) i += 1;
	return `${base}-${i}`;
}

export function displayTitle(item: { title: string; filename: string }): string {
	return item.title.trim() || item.filename;
}
