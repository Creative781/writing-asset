import { FileSystemAdapter, Notice } from "obsidian";
import type WritingAssetPlugin from "./main";
import { openInOs, pickDirectory } from "./electron";
import { fileExists, resolveAssetPath } from "./paths";
import {
	basenamePath,
	copyFile,
	dirnamePath,
	ensureDirectory,
	extnamePath,
	joinPath,
	pathExists,
	writeTextFile,
} from "./sys";
import type { AssetItem } from "./types";

function vaultRoot(plugin: WritingAssetPlugin): string | null {
	const adapter = plugin.app.vault.adapter;
	if (adapter instanceof FileSystemAdapter) return adapter.getBasePath();
	return null;
}

function safeName(value: string): string {
	return value.replace(/[\\/:*?"<>|]/g, "-").trim() || "export";
}

function uniqueFilename(dir: string, filename: string): string {
	if (!pathExists(joinPath(dir, filename))) return filename;
	const ext = extnamePath(filename);
	const stem = basenamePath(filename, ext);
	let i = 2;
	while (pathExists(joinPath(dir, `${stem}-${i}${ext}`))) i += 1;
	return `${stem}-${i}${ext}`;
}

export async function exportGroupFolder(
	plugin: WritingAssetPlugin,
	group: string,
): Promise<void> {
	const parent = await pickDirectory("Select export location");
	if (!parent) return;

	const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
	let target = joinPath(parent, safeName(group));
	if (pathExists(target)) {
		target = joinPath(parent, `${safeName(group)}-${stamp}`);
	}

	const notesDir = joinPath(target, "Notes");
	const assetsDir = joinPath(target, "Assets");
	ensureDirectory(notesDir);
	ensureDirectory(assetsDir);

	const root = vaultRoot(plugin);
	const notes = plugin.catalog.listWritingNotes(group);
	const catalog = await plugin.catalog.findCatalog(group);
	const items = await plugin.catalog.loadItems(group);

	let noteCount = 0;
	if (root) {
		for (const file of notes) {
			const dest = joinPath(notesDir, file.path);
			ensureDirectory(dirnamePath(dest));
			copyFile(joinPath(root, file.path), dest);
			noteCount += 1;
		}
		if (catalog) {
			copyFile(joinPath(root, catalog.path), joinPath(target, "catalog.md"));
		}
	} else {
		for (const file of notes) {
			const dest = joinPath(notesDir, file.path);
			ensureDirectory(dirnamePath(dest));
			writeTextFile(dest, await plugin.app.vault.read(file));
			noteCount += 1;
		}
		if (catalog) {
			writeTextFile(joinPath(target, "catalog.md"), await plugin.app.vault.read(catalog));
		}
	}

	const copied: { item: AssetItem; filename: string }[] = [];
	let missing = 0;
	for (const item of items) {
		const abs = resolveAssetPath(item.path, plugin.settings.assetRoot);
		if (!fileExists(abs)) {
			missing += 1;
			continue;
		}
		const filename = uniqueFilename(assetsDir, item.filename);
		copyFile(abs, joinPath(assetsDir, filename));
		copied.push({ item, filename });
	}

	const index = [
		`# ${group}`,
		"",
		`Copied writing notes and linked files for this asset group.`,
		"",
		`- Notes: ${noteCount}`,
		`- Assets: ${copied.length}` + (missing ? ` (${missing} missing)` : ""),
		"",
		"## Assets",
		"",
		...copied.map(
			({ item, filename }) =>
				`- ${item.title || item.filename} → Assets/${filename}`,
		),
		"",
	].join("\n");
	writeTextFile(joinPath(target, "README.md"), index);

	new Notice(`Exported: ${noteCount} note(s), ${copied.length} asset(s)`);
	openInOs(target);
}
