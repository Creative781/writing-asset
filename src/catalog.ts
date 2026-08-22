import { normalizePath, TFile, type Vault } from "obsidian";
import type WritingAssetPlugin from "./main";
import {
	CATALOG_TYPE,
	type AssetItem,
	type CatalogPayload,
} from "./types";

const DATA_FENCE = "writing-asset-data";

function yamlScalar(value: string): string {
	if (value === "" || /[:#{}[\],&*?|<>=!%@`'"]/.test(value) || /^\s|\s$/.test(value)) {
		return JSON.stringify(value);
	}
	return value;
}

function catalogTemplate(propertyName: string, group: string): string {
	return [
		"---",
		`type: ${CATALOG_TYPE}`,
		`${propertyName}: ${yamlScalar(group)}`,
		"---",
		"",
		"This note is managed by the Writing Asset plugin. The list is stored in the block below.",
		"",
		"```" + DATA_FENCE,
		JSON.stringify({ items: [] } satisfies CatalogPayload, null, 2),
		"```",
		"",
	].join("\n");
}

function extractPayload(content: string): CatalogPayload {
	const match = content.match(
		new RegExp("```" + DATA_FENCE + "\\s*\\n([\\s\\S]*?)\\n```"),
	);
	if (!match?.[1]) return { items: [] };
	try {
		const parsed = JSON.parse(match[1]) as CatalogPayload;
		return { items: Array.isArray(parsed.items) ? parsed.items : [] };
	} catch {
		return { items: [] };
	}
}

function writePayload(content: string, payload: CatalogPayload): string {
	const json = JSON.stringify(payload, null, 2);
	const block = "```" + DATA_FENCE + "\n" + json + "\n```";
	const re = new RegExp("```" + DATA_FENCE + "\\s*\\n([\\s\\S]*?)\\n```");
	if (re.test(content)) return content.replace(re, block);
	return content.trimEnd() + "\n\n" + block + "\n";
}

function safeFileName(group: string): string {
	const safe = group.replace(/[\\/:*?"<>|]/g, "-").trim();
	return `${safe || "untitled"}.md`;
}

function catalogDir(raw: string): string {
	const normalized = normalizePath(raw.trim());
	if (!normalized || normalized === "." || normalized === "/") return "";
	return normalized;
}

function catalogFilePath(folder: string, group: string): string {
	const name = safeFileName(group);
	return folder ? normalizePath(`${folder}/${name}`) : name;
}

async function ensureFolder(vault: Vault, folder: string): Promise<void> {
	if (!folder) return;
	const adapter = vault.adapter;
	const parts = folder.split("/").filter(Boolean);
	let acc = "";
	for (const part of parts) {
		acc = acc ? `${acc}/${part}` : part;
		if (!(await adapter.exists(acc))) {
			await vault.createFolder(acc);
		}
	}
}

export class CatalogService {
	constructor(private plugin: WritingAssetPlugin) {}

	groupFromFile(file: TFile | null): string | null {
		if (!file) return null;
		const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
		if (!fm) return null;
		const key = this.plugin.settings.propertyName;
		const value = fm[key] ?? fm["asset-group"];
		if (value === undefined || value === null || value === "") return null;
		return String(value);
	}

	async listGroups(): Promise<string[]> {
		const groups = new Set<string>();
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			const group = this.groupFromCatalogFile(file);
			if (group) groups.add(group);
		}
		return [...groups].sort((a, b) => a.localeCompare(b, "ko"));
	}

	groupFromCatalogFile(file: TFile): string | null {
		const fm = this.plugin.app.metadataCache.getFileCache(file)?.frontmatter;
		if (fm?.type !== CATALOG_TYPE) return null;
		const key = this.plugin.settings.propertyName;
		const value = fm[key] ?? fm["asset-group"];
		if (value === undefined || value === null || value === "") return null;
		return String(value);
	}

	listWritingNotes(group: string): TFile[] {
		const notes: TFile[] = [];
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			if (this.groupFromCatalogFile(file) === group) continue;
			if (this.groupFromFile(file) === group) notes.push(file);
		}
		return notes.sort((a, b) => a.path.localeCompare(b.path, "ko"));
	}

	async findCatalog(group: string): Promise<TFile | null> {
		for (const file of this.plugin.app.vault.getMarkdownFiles()) {
			if (this.groupFromCatalogFile(file) === group) return file;
		}
		const path = catalogFilePath(
			catalogDir(this.plugin.settings.catalogFolder),
			group,
		);
		const file = this.plugin.app.vault.getAbstractFileByPath(path);
		if (file instanceof TFile) {
			const content = await this.plugin.app.vault.read(file);
			if (content.includes(`type: ${CATALOG_TYPE}`)) return file;
		}
		return null;
	}

	async ensureCatalog(group: string): Promise<TFile> {
		const existing = await this.findCatalog(group);
		if (existing) return existing;

		const folder = catalogDir(this.plugin.settings.catalogFolder);
		await ensureFolder(this.plugin.app.vault, folder);
		const path = catalogFilePath(folder, group);
		const adapter = this.plugin.app.vault.adapter;
		if (await adapter.exists(path)) {
			const file = this.plugin.app.vault.getAbstractFileByPath(path);
			if (file instanceof TFile) return file;
		}
		return this.plugin.app.vault.create(
			path,
			catalogTemplate(this.plugin.settings.propertyName, group),
		);
	}

	async loadItems(group: string): Promise<AssetItem[]> {
		const file = await this.findCatalog(group);
		if (!file) return [];
		const content = await this.plugin.app.vault.read(file);
		return extractPayload(content).items;
	}

	async saveItems(group: string, items: AssetItem[]): Promise<void> {
		const file = await this.ensureCatalog(group);
		const content = await this.plugin.app.vault.read(file);
		await this.plugin.app.vault.modify(file, writePayload(content, { items }));
	}

	async findItem(
		group: string,
		id: string,
	): Promise<{ item: AssetItem; items: AssetItem[] } | null> {
		const items = await this.loadItems(group);
		const item = items.find((entry) => entry.id === id);
		if (!item) return null;
		return { item, items };
	}

	async findItemAnywhere(
		id: string,
		preferredGroup?: string,
	): Promise<{ group: string; item: AssetItem } | null> {
		if (preferredGroup) {
			const found = await this.findItem(preferredGroup, id);
			if (found) return { group: preferredGroup, item: found.item };
		}
		const groups = await this.listGroups();
		for (const group of groups) {
			if (group === preferredGroup) continue;
			const found = await this.findItem(group, id);
			if (found) return { group, item: found.item };
		}
		return null;
	}
}
