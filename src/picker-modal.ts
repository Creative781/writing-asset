import { Modal, Notice, Setting } from "obsidian";
import type WritingAssetPlugin from "./main";
import { openInOs, pathsFromDrop, pickLocalFiles } from "./electron";
import { serializeAssetBlock } from "./embed";
import { exportGroupFolder } from "./export-folder";
import { canEmbed } from "./kinds";
import { localMediaBlobUrl } from "./media";
import {
	displayTitle,
	fileExists,
	resolveAssetPath,
} from "./paths";
import { EditAssetModal } from "./edit-modal";
import { RegisterModal } from "./register-modal";
import { RelinkPrefixModal } from "./relink-modal";
import {
	CATEGORIES,
	KIND_LABELS,
	type AssetCategory,
	type AssetItem,
} from "./types";

export class PickerModal extends Modal {
	private items: AssetItem[] = [];
	private selectedId: string | null = null;
	private filter = "";
	private keepOpen = false;
	private mediaUrls = new Map<string, string>();
	private dragDepth = 0;

	constructor(
		private plugin: WritingAssetPlugin,
		private group: string,
	) {
		super(plugin.app);
	}

	async onOpen(): Promise<void> {
		this.modalEl.addClass("writing-asset-picker-modal");
		this.titleEl.setText(`Assets · ${this.group}`);
		this.bindDrop(this.modalEl);
		await this.reload();
		this.render();
	}

	private bindDrop(el: HTMLElement): void {
		el.addEventListener("dragenter", (event) => this.onDragEnter(event));
		el.addEventListener("dragover", (event) => this.onDragOver(event));
		el.addEventListener("dragleave", (event) => this.onDragLeave(event));
		el.addEventListener("drop", (event) => void this.onDrop(event));
	}

	private isFileDrag(event: DragEvent): boolean {
		return Array.from(event.dataTransfer?.types ?? []).includes("Files");
	}

	private onDragEnter(event: DragEvent): void {
		if (!this.isFileDrag(event)) return;
		event.preventDefault();
		this.dragDepth += 1;
		this.modalEl.addClass("is-drop-target");
	}

	private onDragOver(event: DragEvent): void {
		if (!this.isFileDrag(event)) return;
		event.preventDefault();
		if (event.dataTransfer) event.dataTransfer.dropEffect = "copy";
	}

	private onDragLeave(event: DragEvent): void {
		if (!this.isFileDrag(event)) return;
		this.dragDepth = Math.max(0, this.dragDepth - 1);
		if (this.dragDepth === 0) this.modalEl.removeClass("is-drop-target");
	}

	private async onDrop(event: DragEvent): Promise<void> {
		if (!this.isFileDrag(event)) return;
		event.preventDefault();
		event.stopPropagation();
		this.dragDepth = 0;
		this.modalEl.removeClass("is-drop-target");
		const paths = pathsFromDrop(event);
		if (!paths.length) {
			new Notice("Could not read the dropped file path(s).");
			return;
		}
		await this.registerPaths(paths);
	}

	private async reload(): Promise<void> {
		this.items = await this.plugin.catalog.loadItems(this.group);
		if (this.selectedId && !this.items.some((item) => item.id === this.selectedId)) {
			this.selectedId = this.items[0]?.id ?? null;
		}
		if (!this.selectedId) this.selectedId = this.items[0]?.id ?? null;
	}

	private mediaSrc(absPath: string): string | null {
		const cached = this.mediaUrls.get(absPath);
		if (cached) return cached;
		const url = localMediaBlobUrl(absPath);
		if (url) this.mediaUrls.set(absPath, url);
		return url;
	}

	private absPath(item: AssetItem): string {
		return resolveAssetPath(item.path, this.plugin.settings.assetRoot);
	}

	private selected(): AssetItem | undefined {
		return this.items.find((item) => item.id === this.selectedId);
	}

	private visibleItems(): AssetItem[] {
		const q = this.filter.trim().toLowerCase();
		if (!q) return this.items;
		return this.items.filter((item) => {
			const hay = `${item.title} ${item.filename} ${item.description} ${item.category}`.toLowerCase();
			return hay.includes(q);
		});
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();
		contentEl.addClass("writing-asset-picker");

		const toolbar = contentEl.createDiv("writing-asset-toolbar");
		const search = toolbar.createEl("input", {
			type: "search",
			placeholder: "Search title, filename, description",
			cls: "writing-asset-search",
		});
		search.value = this.filter;
		search.addEventListener("input", () => {
			this.filter = search.value;
			this.render();
			const again = this.contentEl.querySelector<HTMLInputElement>(".writing-asset-search");
			again?.focus();
			if (again) again.setSelectionRange(this.filter.length, this.filter.length);
		});

		const actions = toolbar.createDiv("writing-asset-toolbar-actions");
		actions.createEl("button", { text: "Add files", cls: "mod-cta" }).addEventListener(
			"click",
			() => void this.addFiles(),
		);
		actions
			.createEl("button", { text: "Export to folder" })
			.addEventListener("click", () => void this.exportFolder());
		actions
			.createEl("button", { text: "Batch fix paths" })
			.addEventListener("click", () => this.openRelink());

		contentEl.createDiv({
			cls: "writing-asset-drop-hint",
			text: "You can also drag files from Finder onto this window.",
		});

		const broken = this.items.filter((item) => !fileExists(this.absPath(item))).length;
		if (broken) {
			contentEl.createDiv({
				cls: "writing-asset-banner",
				text: `${broken} file(s) not found. Select an item and use Relocate to fix the path.`,
			});
		}

		const body = contentEl.createDiv("writing-asset-picker-body");
		const list = body.createDiv("writing-asset-list");
		const preview = body.createDiv("writing-asset-preview");

		const visible = this.visibleItems();
		if (!visible.length) {
			list.createDiv({
				cls: "writing-asset-empty",
				text: this.items.length
					? "No search results."
					: "No assets yet. Drag files here or use Add files.",
			});
		} else {
			for (const category of CATEGORIES) {
				const groupItems = visible.filter((item) => item.category === category.id);
				if (!groupItems.length) continue;
				list.createDiv({
					cls: "writing-asset-category",
					text: `${category.label} (${groupItems.length})`,
				});
				for (const item of groupItems) {
					this.renderRow(list, item);
				}
			}
		}

		this.renderPreview(preview);

		const footer = contentEl.createDiv("writing-asset-footer");
		new Setting(footer)
			.setName("Keep window open after insert")
			.addToggle((toggle) =>
				toggle.setValue(this.keepOpen).onChange((value) => {
					this.keepOpen = value;
				}),
			);

		const buttons = footer.createDiv("writing-asset-footer-buttons");
		const item = this.selected();
		const exists = item ? fileExists(this.absPath(item)) : false;

		const embedBtn = buttons.createEl("button", {
			text: "Insert into note",
			cls: "mod-cta",
		});
		embedBtn.disabled = !item || !exists;
		embedBtn.addEventListener("click", () => this.insert("embed"));

		const linkBtn = buttons.createEl("button", { text: "Insert link only" });
		linkBtn.disabled = !item || !exists;
		linkBtn.addEventListener("click", () => this.insert("link"));

		const openBtn = buttons.createEl("button", { text: "Open file" });
		openBtn.disabled = !item || !exists;
		openBtn.addEventListener("click", () => {
			if (item && exists) openInOs(this.absPath(item));
		});

		const editBtn = buttons.createEl("button", { text: "Edit info" });
		editBtn.disabled = !item;
		editBtn.addEventListener("click", () => this.editSelected());

		if (item && !exists) {
			buttons
				.createEl("button", { text: "Relocate", cls: "mod-warning" })
				.addEventListener("click", () => void this.relinkOne(item));
		}
	}

	private renderRow(list: HTMLElement, item: AssetItem): void {
		const abs = this.absPath(item);
		const exists = fileExists(abs);
		const row = list.createDiv({
			cls: "writing-asset-row" + (item.id === this.selectedId ? " is-selected" : ""),
		});
		if (!exists) row.addClass("is-broken");

		if (exists && item.kind === "image") {
			const src = this.mediaSrc(abs);
			if (src) {
				row.createEl("img", {
					cls: "writing-asset-thumb",
					attr: { src, alt: "" },
				});
			} else {
				row.createDiv({
					cls: "writing-asset-thumb is-icon",
					text: thumbGlyph(item.category),
				});
			}
		} else {
			row.createDiv({
				cls: "writing-asset-thumb is-icon",
				text: thumbGlyph(item.category),
			});
		}

		const meta = row.createDiv("writing-asset-row-meta");
		meta.createDiv({ cls: "writing-asset-row-title", text: displayTitle(item) });
		meta.createDiv({
			cls: "writing-asset-row-sub",
			text: exists
				? item.description || item.filename
				: "Missing · " + item.filename,
		});

		row.addEventListener("click", () => {
			this.selectedId = item.id;
			this.render();
		});
		row.addEventListener("dblclick", () => {
			if (exists) this.insert("embed");
		});
	}

	private renderPreview(preview: HTMLElement): void {
		preview.empty();
		const item = this.selected();
		if (!item) {
			preview.createDiv({
				cls: "writing-asset-empty",
				text: "Select an asset.",
			});
			return;
		}

		const abs = this.absPath(item);
		const exists = fileExists(abs);
		preview.createEl("h3", { text: displayTitle(item) });
		preview.createDiv({
			cls: "writing-asset-preview-meta",
			text: `${KIND_LABELS[item.kind]} · ${item.filename}`,
		});
		if (item.description) {
			preview.createDiv({
				cls: "writing-asset-preview-desc",
				text: item.description,
			});
		}

		if (!exists) {
			preview.createDiv({
				cls: "writing-asset-banner",
				text: "No file at this path. Use Relocate to pick a new location.",
			});
			preview.createDiv({
				cls: "writing-asset-path",
				text: abs,
			});
			return;
		}

		if (item.kind === "image") {
			const src = this.mediaSrc(abs);
			if (src) {
				preview.createEl("img", {
					cls: "writing-asset-preview-image",
					attr: { src, alt: displayTitle(item) },
				});
			} else {
				preview.createDiv({
					cls: "writing-asset-preview-file",
					text: "Could not create a preview. Use Open file to view the original.",
				});
			}
		} else if (item.kind === "audio") {
			const src = this.mediaSrc(abs);
			if (src) {
				preview.createEl("audio", {
					cls: "writing-asset-preview-audio",
					attr: { src, controls: "true" },
				});
			}
		} else if (item.kind === "video") {
			const src = this.mediaSrc(abs);
			if (src) {
				preview.createEl("video", {
					cls: "writing-asset-preview-video",
					attr: { src, controls: "true" },
				});
			} else {
				preview.createDiv({
					cls: "writing-asset-preview-file",
					text: "File is too large for preview. Use Open file to play it.",
				});
			}
		} else if (item.filename.toLowerCase().endsWith(".pdf")) {
			const src = this.mediaSrc(abs);
			if (src) {
				preview.createEl("iframe", {
					cls: "writing-asset-preview-pdf",
					attr: { src, title: displayTitle(item) },
				});
			}
		} else {
			preview.createDiv({
				cls: "writing-asset-preview-file",
				text: "This format does not show inside the note. Use Open file for the original.",
			});
		}
		preview.createDiv({ cls: "writing-asset-path", text: abs });
	}

	private insert(requested: "embed" | "link"): void {
		const item = this.selected();
		if (!item) return;
		const abs = this.absPath(item);
		if (!fileExists(abs)) {
			new Notice("File not found.");
			return;
		}
		const mode =
			requested === "embed" && canEmbed(item.filename, item.kind)
				? "embed"
				: "link";
		const ok = this.plugin.insertAtCursor(
			serializeAssetBlock(item.id, this.group, mode),
		);
		if (!ok) {
			new Notice("Run this from a note you are editing.");
			return;
		}
		new Notice(
			mode === "embed" ? "Inserted into note." : "Link inserted.",
		);
		if (!this.keepOpen) this.close();
	}

	private async addFiles(): Promise<void> {
		let paths: string[];
		try {
			paths = await pickLocalFiles(true);
		} catch (error) {
			console.error(error);
			new Notice("Could not open the file picker.");
			return;
		}
		await this.registerPaths(paths);
	}

	private async registerPaths(paths: string[]): Promise<void> {
		if (!paths.length) return;
		const existing = await this.plugin.catalog.loadItems(this.group);
		const existingAbs = new Set(
			existing.map((item) => this.absPath(item)),
		);
		const fresh = paths.filter((p) => !existingAbs.has(p));
		const skipped = paths.length - fresh.length;
		if (skipped) new Notice(`Skipped ${skipped} already registered file(s).`);
		if (!fresh.length) return;

		const ids = new Set(existing.map((item) => item.id));
		new RegisterModal(this.plugin, this.group, fresh, ids, async (items) => {
			try {
				await this.plugin.catalog.saveItems(this.group, [...existing, ...items]);
				new Notice(`Registered ${items.length} asset(s).`);
				await this.reload();
				this.selectedId = items[0]?.id ?? this.selectedId;
				this.render();
			} catch (error) {
				console.error(error);
				new Notice("Could not save assets.");
			}
		}).open();
	}

	private async relinkOne(item: AssetItem): Promise<void> {
		const paths = await pickLocalFiles(false);
		const nextPath = paths[0];
		if (!nextPath) return;
		const updated = this.items.map((entry) =>
			entry.id === item.id
				? {
						...entry,
						path: this.plugin.toStoredPath(nextPath),
						filename: nextPath.split("/").pop() ?? entry.filename,
					}
				: entry,
		);
		await this.plugin.catalog.saveItems(this.group, updated);
		new Notice("Path updated.");
		await this.reload();
		this.render();
	}

	private async exportFolder(): Promise<void> {
		try {
			await exportGroupFolder(this.plugin, this.group);
		} catch (error) {
			console.error(error);
			new Notice("Could not export to a folder.");
		}
	}

	private editSelected(): void {
		const item = this.selected();
		if (!item) return;
		new EditAssetModal(this.plugin, item, async (next) => {
			await this.plugin.saveEditedItem(this.group, next);
			new Notice("Asset updated. Changes also apply in notes already using it.");
			await this.reload();
			this.render();
		}).open();
	}

	private openRelink(): void {
		new RelinkPrefixModal(
			this.plugin,
			this.group,
			this.items,
			async (items) => {
				await this.plugin.catalog.saveItems(this.group, items);
				new Notice("Paths updated in batch.");
				await this.reload();
				this.render();
			},
		).open();
	}

	onClose(): void {
		this.contentEl.empty();
		for (const url of this.mediaUrls.values()) URL.revokeObjectURL(url);
		this.mediaUrls.clear();
	}
}

function thumbGlyph(category: AssetCategory): string {
	switch (category) {
		case "photo":
			return "🖼";
		case "figure":
			return "✏️";
		case "table":
			return "▦";
		case "document":
			return "📄";
		default:
			return "•";
	}
}
