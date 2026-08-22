import { pathToFileURL } from "url";
import { isExistingFile, path } from "./sys";

export function toStoredPath(absPath: string, assetRoot: string): string {
	if (!assetRoot) return absPath;
	const root = path.resolve(assetRoot);
	const abs = path.resolve(absPath);
	const prefix = root.endsWith(path.sep) ? root : root + path.sep;
	if (abs === root || abs.startsWith(prefix)) {
		return path.relative(root, abs) || ".";
	}
	return abs;
}

export function resolveAssetPath(storedPath: string, assetRoot: string): string {
	if (path.isAbsolute(storedPath)) return storedPath;
	if (!assetRoot) return storedPath;
	return path.resolve(assetRoot, storedPath);
}

export function fileExists(absPath: string): boolean {
	return isExistingFile(absPath);
}

export function toFileUrl(absPath: string): string {
	return pathToFileURL(absPath).href;
}

export function replacePathPrefix(
	storedPath: string,
	oldPrefix: string,
	newPrefix: string,
): string {
	const abs = path.resolve(storedPath);
	const from = path.resolve(oldPrefix);
	const to = path.resolve(newPrefix);
	if (abs === from) return to;
	const fromPrefix = from.endsWith(path.sep) ? from : from + path.sep;
	if (abs.startsWith(fromPrefix)) {
		return path.join(to, abs.slice(fromPrefix.length));
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
