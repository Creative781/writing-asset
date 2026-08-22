import { FileSystemAdapter, Notice } from "obsidian";
import type WritingAssetPlugin from "./main";
import { openInOs, pickDirectory } from "./electron";
import { fileExists, resolveAssetPath } from "./paths";
import {
	copyFileSync,
	ensureDirectory,
	existsSync,
	path,
	writeFileSync,
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
	if (!existsSync(path.join(dir, filename))) return filename;
	const ext = path.extname(filename);
	const stem = path.basename(filename, ext);
	let i = 2;
	while (existsSync(path.join(dir, `${stem}-${i}${ext}`))) i += 1;
	return `${stem}-${i}${ext}`;
}

export async function exportGroupFolder(
	plugin: WritingAssetPlugin,
	group: string,
): Promise<void> {
	const parent = await pickDirectory("Select export location");
	if (!parent) return;

	const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
	let target = path.join(parent, safeName(group));
	if (existsSync(target)) {
		target = path.join(parent, `${safeName(group)}-${stamp}`);
	}

	const notesDir = path.join(target, "Notes");
	const assetsDir = path.join(target, "Assets");
	ensureDirectory(notesDir);
	ensureDirectory(assetsDir);

	const root = vaultRoot(plugin);
	const notes = plugin.catalog.listWritingNotes(group);
	const catalog = await plugin.catalog.findCatalog(group);
	const items = await plugin.catalog.loadItems(group);

	let noteCount = 0;
	if (root) {
		for (const file of notes) {
			const dest = path.join(notesDir, file.path);
			ensureDirectory(path.dirname(dest));
			copyFileSync(path.join(root, file.path), dest);
			noteCount += 1;
		}
		if (catalog) {
			copyFileSync(
				path.join(root, catalog.path),
				path.join(target, "catalog.md"),
			);
		}
	} else {
		for (const file of notes) {
			const dest = path.join(notesDir, file.path);
			ensureDirectory(path.dirname(dest));
			writeFileSync(dest, await plugin.app.vault.read(file), "utf8");
			noteCount += 1;
		}
		if (catalog) {
			writeFileSync(
				path.join(target, "catalog.md"),
				await plugin.app.vault.read(catalog),
				"utf8",
			);
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
		copyFileSync(abs, path.join(assetsDir, filename));
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
	writeFileSync(path.join(target, "README.md"), index, "utf8");

	new Notice(`Exported: ${noteCount} note(s), ${copied.length} asset(s)`);
	openInOs(target);
}
