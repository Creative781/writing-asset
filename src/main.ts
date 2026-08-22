import { MarkdownView, Notice, Plugin, TFile } from "obsidian";
import { CatalogService } from "./catalog";
import { AssetEmbed, parseAssetBlock } from "./embed";
import { pickLocalFiles } from "./electron";
import { exportGroupFolder } from "./export-folder";
import { GroupModal } from "./group-modal";
import { toStoredPath as storeRelativePath, resolveAssetPath } from "./paths";
import { PickerModal } from "./picker-modal";
import { RegisterModal } from "./register-modal";
import { WritingAssetSettingTab } from "./settings";
import { DEFAULT_SETTINGS, type AssetItem, type WritingAssetSettings } from "./types";

export default class WritingAssetPlugin extends Plugin {
	settings: WritingAssetSettings = { ...DEFAULT_SETTINGS };
	catalog = new CatalogService(this);
	private assetListeners = new Set<() => void>();

	async onload(): Promise<void> {
		await this.loadSettings();

		this.registerMarkdownCodeBlockProcessor("writing-asset", async (source, el, ctx) => {
			const block = parseAssetBlock(source);
			if (!block) {
				el.createDiv({
					cls: "writing-asset-embed is-missing",
					text: "Could not read this asset block.",
				});
				return;
			}

			const found = await this.catalog.findItemAnywhere(
				block.id,
				block.group || undefined,
			);
			const item = found?.item ?? null;
			const abs = item
				? resolveAssetPath(item.path, this.settings.assetRoot)
				: null;
			const missing = found
				? "File not found. Fix the path in Writing Asset."
				: `Asset ${block.id} was not found.`;
			ctx.addChild(
				new AssetEmbed(
					el,
					this,
					item,
					abs,
					block.mode,
					missing,
					block.group || found?.group || "",
				),
			);
		});

		this.addCommand({
			id: "open-library",
			name: "Browse assets",
			callback: () => void this.openPicker(),
		});

		this.addCommand({
			id: "add-files",
			name: "Register files",
			callback: () => void this.addFiles(),
		});

		this.addCommand({
			id: "set-group",
			name: "Assign asset group to this note",
			callback: () => void this.assignGroup(),
		});

		this.addCommand({
			id: "export-folder",
			name: "Export this group to a folder",
			callback: () => void this.exportCurrentGroup(),
		});

		this.addRibbonIcon("paperclip", "Writing Asset: Browse assets", () => {
			void this.openPicker();
		});

		this.addSettingTab(new WritingAssetSettingTab(this.app, this));
		this.applyPdfExportClass();
	}

	applyPdfExportClass(): void {
		document.body.removeClass("wa-pdf-all", "wa-pdf-images");
		document.body.addClass(
			this.settings.pdfExportMode === "all" ? "wa-pdf-all" : "wa-pdf-images",
		);
	}

	onAssetsChanged(callback: () => void): () => void {
		this.assetListeners.add(callback);
		return () => {
			this.assetListeners.delete(callback);
		};
	}

	notifyAssetsChanged(): void {
		for (const callback of this.assetListeners) callback();
	}

	async saveEditedItem(group: string, item: AssetItem): Promise<void> {
		const items = await this.catalog.loadItems(group);
		await this.catalog.saveItems(
			group,
			items.map((entry) => (entry.id === item.id ? item : entry)),
		);
		this.notifyAssetsChanged();
	}

	toStoredPath(absPath: string): string {
		return storeRelativePath(absPath, this.settings.assetRoot);
	}

	insertAtCursor(text: string): boolean {
		const view = this.app.workspace.getActiveViewOfType(MarkdownView);
		if (!view) return false;
		view.editor.replaceSelection(text);
		return true;
	}

	async writeGroupToNote(file: TFile | null, group: string): Promise<void> {
		if (!file) return;
		await this.app.fileManager.processFrontMatter(file, (frontmatter: Record<string, unknown>) => {
			frontmatter[this.settings.propertyName] = group;
		});
	}

	private async resolveGroup(forceAsk = false): Promise<string | null> {
		const file = this.app.workspace.getActiveFile();
		const current = forceAsk ? null : this.catalog.groupFromFile(file);
		if (current) return current;

		const groups = await this.catalog.listGroups();
		return new Promise((resolve) => {
			new GroupModal(
				this,
				groups,
				(group, writeToNote) => {
					if (writeToNote) void this.writeGroupToNote(file, group);
					resolve(group);
				},
				() => resolve(null),
			).open();
		});
	}

	async openPicker(): Promise<void> {
		const group = await this.resolveGroup();
		if (!group) return;
		new PickerModal(this, group).open();
	}

	async assignGroup(): Promise<void> {
		const group = await this.resolveGroup(true);
		if (!group) return;
		new Notice(`Asset group: ${group}`);
	}

	async exportCurrentGroup(): Promise<void> {
		const group = await this.resolveGroup();
		if (!group) return;
		try {
			await exportGroupFolder(this, group);
		} catch (error) {
			console.error(error);
			new Notice("Could not export to a folder.");
		}
	}

	async addFiles(): Promise<void> {
		const group = await this.resolveGroup();
		if (!group) return;
		let paths: string[];
		try {
			paths = await pickLocalFiles(true);
		} catch (error) {
			console.error(error);
			new Notice("Could not open the file picker.");
			return;
		}
		if (!paths.length) return;
		const existing = await this.catalog.loadItems(group);
		const existingAbs = new Set(
			existing.map((item) => resolveAssetPath(item.path, this.settings.assetRoot)),
		);
		const fresh = paths.filter((path) => !existingAbs.has(path));
		if (paths.length !== fresh.length) {
			new Notice(
				`Skipped ${paths.length - fresh.length} already registered file(s).`,
			);
		}
		if (!fresh.length) return;
		const ids = new Set(existing.map((item) => item.id));
		new RegisterModal(this, group, fresh, ids, async (items) => {
			try {
				await this.catalog.saveItems(group, [...existing, ...items]);
				new Notice(`Registered ${items.length} asset(s).`);
			} catch (error) {
				console.error(error);
				new Notice("Could not save assets.");
			}
		}).open();
	}

	async loadSettings(): Promise<void> {
		const loaded = (await this.loadData()) as Partial<WritingAssetSettings> | null;
		this.settings = Object.assign({}, DEFAULT_SETTINGS, loaded);
		this.settings.cardFields = {
			...DEFAULT_SETTINGS.cardFields,
			...(loaded?.cardFields ?? {}),
		};
		this.applyPdfExportClass();
	}

	async saveSettings(): Promise<void> {
		await this.saveData(this.settings);
		this.applyPdfExportClass();
	}
}
