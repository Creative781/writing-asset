import { MarkdownRenderChild, setIcon } from "obsidian";
import type WritingAssetPlugin from "./main";
import { openInOs } from "./electron";
import { canEmbed } from "./kinds";
import { localMediaDataUrl } from "./media";
import { displayTitle, fileExists, resolveAssetPath } from "./paths";
import { EditAssetModal } from "./edit-modal";
import { KIND_LABELS, type AssetItem, type CardFields } from "./types";

export interface AssetBlock {
	id: string;
	group: string;
	mode: "embed" | "link";
}

export function parseAssetBlock(source: string): AssetBlock | null {
	const lines = source
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	let id = "";
	let group = "";
	let mode: "embed" | "link" = "embed";

	for (const line of lines) {
		const matched = line.match(/^(id|group|mode)\s*:\s*(.+)$/i);
		if (matched) {
			const key = matched[1]?.toLowerCase();
			const value = matched[2]?.trim() ?? "";
			if (key === "id") id = value;
			else if (key === "group") group = value;
			else if (value === "link" || value === "embed") mode = value;
		} else if (!id) {
			id = line;
		}
	}

	if (!id) return null;
	return { id, group, mode };
}

export function serializeAssetBlock(
	id: string,
	group: string,
	mode: "embed" | "link",
): string {
	return [
		"```writing-asset",
		`id: ${id}`,
		`group: ${group}`,
		`mode: ${mode}`,
		"```",
		"",
	].join("\n");
}

export class AssetEmbed extends MarkdownRenderChild {
	private unsub: (() => void) | null = null;
	private reloading = false;

	constructor(
		containerEl: HTMLElement,
		private plugin: WritingAssetPlugin,
		private item: AssetItem | null,
		private absPath: string | null,
		private mode: "embed" | "link",
		private missingMessage: string,
		private group: string,
	) {
		super(containerEl);
		this.unsub = this.plugin.onAssetsChanged(() => {
			void this.reloadFromCatalog();
		});
	}

	onload(): void {
		this.containerEl.empty();
		this.containerEl.removeClass("is-missing", "is-image", "is-nonimage");
		this.containerEl.addClass("writing-asset-embed");
		this.containerEl.addClass(`is-${this.plugin.settings.cardPreset}`);

		if (!this.item || !this.absPath) {
			this.containerEl.addClass("is-missing");
			this.containerEl.setText(this.missingMessage);
			return;
		}

		this.addEditButton(this.containerEl);

		const exists = fileExists(this.absPath);
		const title = displayTitle(this.item);
		const shouldEmbed =
			this.mode === "embed" && exists && canEmbed(this.item.filename, this.item.kind);
		const dataUrl = shouldEmbed ? localMediaDataUrl(this.absPath) : null;

		if (shouldEmbed && this.item.kind === "image" && dataUrl) {
			this.containerEl.addClass("is-image");
			const img = this.containerEl.createEl("img", {
				attr: { src: dataUrl, alt: title },
			});
			img.addEventListener("click", () => openInOs(this.absPath!));
			if (this.plugin.settings.cardPreset !== "very-simple") {
				this.addFieldLines(this.containerEl, title, {
					skipTitle: this.plugin.settings.cardPreset !== "normal",
				});
			}
			return;
		}

		this.containerEl.addClass("is-nonimage");

		if (shouldEmbed && this.item.kind === "audio" && dataUrl) {
			this.containerEl.createEl("audio", {
				attr: { src: dataUrl, controls: "true" },
			});
			this.addFieldLines(this.containerEl, title);
			return;
		}

		if (shouldEmbed && this.item.kind === "video" && dataUrl) {
			this.containerEl.createEl("video", {
				attr: { src: dataUrl, controls: "true" },
			});
			this.addFieldLines(this.containerEl, title);
			return;
		}

		this.addCard(title, exists);
	}

	onunload(): void {
		this.unsub?.();
		this.unsub = null;
	}

	private async reloadFromCatalog(): Promise<void> {
		if (this.reloading || !this.item) return;
		this.reloading = true;
		try {
			const found = await this.plugin.catalog.findItemAnywhere(
				this.item.id,
				this.group || undefined,
			);
			if (found) {
				this.item = found.item;
				this.group = found.group;
				this.absPath = resolveAssetPath(
					found.item.path,
					this.plugin.settings.assetRoot,
				);
			}
			this.onload();
		} finally {
			this.reloading = false;
		}
	}

	private openEdit(): void {
		if (!this.item) return;
		const group = this.group;
		const item = this.item;
		new EditAssetModal(this.plugin, item, async (next) => {
			const targetGroup =
				group ||
				(await this.plugin.catalog.findItemAnywhere(item.id))?.group;
			if (!targetGroup) return;
			await this.plugin.saveEditedItem(targetGroup, next);
		}).open();
	}

	private addEditButton(parent: HTMLElement): void {
		const btn = parent.createSpan({
			cls: "writing-asset-edit",
			attr: { title: "Edit info", role: "button", tabindex: "0" },
		});
		setIcon(btn, "pencil");
		btn.addEventListener("click", (event) => {
			event.preventDefault();
			event.stopPropagation();
			this.openEdit();
		});
	}

	private fields(): CardFields {
		return this.plugin.settings.cardFields;
	}

	private addCard(title: string, exists: boolean): void {
		const preset = this.plugin.settings.cardPreset;
		if (preset === "normal") {
			const card = this.containerEl.createDiv("writing-asset-card");
			if (!exists) card.addClass("is-missing");
			this.addFieldLines(card, title, { clickable: exists });
			return;
		}
		this.addFieldLines(this.containerEl, title, { clickable: exists });
		if (!exists) this.containerEl.addClass("is-missing");
	}

	private addFieldLines(
		parent: HTMLElement,
		title: string,
		opts: { skipTitle?: boolean; clickable?: boolean } = {},
	): void {
		const fields = this.fields();
		const line = parent.createDiv("writing-asset-line");
		const label = fields.title ? title : fields.filename ? this.item!.filename : "";
		const showTitle = Boolean(!opts.skipTitle && label);
		const showKind = Boolean(fields.kind && this.item);

		if (showTitle || showKind) {
			const lead = line.createSpan("writing-asset-lead");
			if (showTitle) {
				const clip = lead.createSpan({
					cls: "writing-asset-clip",
					attr: { title: "Edit info" },
				});
				setIcon(clip, "paperclip");
				clip.addEventListener("click", (event) => {
					event.preventDefault();
					event.stopPropagation();
					this.openEdit();
				});
			}
			if (showKind && this.item) {
				const badge = lead.createSpan({
					cls: `writing-asset-badge is-${this.item.kind}`,
					text: KIND_LABELS[this.item.kind],
				});
				this.applyAccentBadge(badge);
			}
		}

		if (showTitle) {
			if (opts.clickable) {
				const a = line.createEl("a", {
					cls: "writing-asset-link",
					text: label,
				});
				a.setAttr("href", "#");
				a.addEventListener("click", (event) => {
					event.preventDefault();
					openInOs(this.absPath!);
				});
			} else {
				line.createSpan({ cls: "writing-asset-line-title", text: label });
			}
		}

		if (fields.description && this.item?.description) {
			const desc = line.createSpan({
				cls: "writing-asset-line-desc",
				text: this.item.description,
				attr: { title: "Edit info" },
			});
			desc.addEventListener("click", (event) => {
				event.preventDefault();
				event.stopPropagation();
				this.openEdit();
			});
		}

		const usedAsLabel =
			!opts.skipTitle && !fields.title && this.item && label === this.item.filename;
		if (fields.filename && this.item && !usedAsLabel) {
			line.createSpan({
				cls: "writing-asset-line-file",
				text: this.item.filename,
			});
		}
	}

	private applyAccentBadge(el: HTMLElement): void {
		const styles = getComputedStyle(document.body);
		const bg = styles.getPropertyValue("--interactive-accent").trim();
		const fg = styles.getPropertyValue("--text-on-accent").trim();
		if (bg) el.style.backgroundColor = bg;
		if (fg) el.style.color = fg;
	}
}

export function resolvedPathFor(item: AssetItem, assetRoot: string): string {
	return resolveAssetPath(item.path, assetRoot);
}
