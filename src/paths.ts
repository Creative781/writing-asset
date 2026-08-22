import * as fs from "fs";
import * as nodePath from "path";
import { pathToFileURL } from "url";

export function toStoredPath(absPath: string, assetRoot: string): string {
	if (!assetRoot) return absPath;
	const root = nodePath.resolve(assetRoot);
	const abs = nodePath.resolve(absPath);
	const prefix = root.endsWith(nodePath.sep) ? root : root + nodePath.sep;
	if (abs === root || abs.startsWith(prefix)) {
		return nodePath.relative(root, abs) || ".";
	}
	return abs;
}

export function resolveAssetPath(storedPath: string, assetRoot: string): string {
	if (nodePath.isAbsolute(storedPath)) return storedPath;
	if (!assetRoot) return storedPath;
	return nodePath.resolve(assetRoot, storedPath);
}

export function fileExists(absPath: string): boolean {
	try {
		return fs.existsSync(absPath) && fs.statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function toFileUrl(absPath: string): string {
	return pathToFileURL(absPath).href;
}

export function replacePathPrefix(
	storedPath: string,
	oldPrefix: string,
	newPrefix: string,
): string {
	const abs = nodePath.resolve(storedPath);
	const from = nodePath.resolve(oldPrefix);
	const to = nodePath.resolve(newPrefix);
	if (abs === from) return to;
	const fromPrefix = from.endsWith(nodePath.sep) ? from : from + nodePath.sep;
	if (abs.startsWith(fromPrefix)) {
		return nodePath.join(to, abs.slice(fromPrefix.length));
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
