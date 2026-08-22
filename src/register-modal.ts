import { Modal, Setting } from "obsidian";
import { path } from "./sys";
import type WritingAssetPlugin from "./main";
import { kindFromFilename, suggestedCategory } from "./kinds";
import { uniqueAssetId } from "./paths";
import {
	CATEGORIES,
	isAssetCategory,
	type AssetCategory,
	type AssetItem,
} from "./types";

interface DraftItem {
	absPath: string;
	filename: string;
	title: string;
	description: string;
	category: AssetCategory;
}

export class RegisterModal extends Modal {
	private drafts: DraftItem[] = [];
	private sharedCategory: AssetCategory | "" = "";

	constructor(
		private plugin: WritingAssetPlugin,
		private group: string,
		filePaths: string[],
		existingIds: Set<string>,
		private onSave: (items: AssetItem[]) => Promise<void>,
	) {
		super(plugin.app);
		this.drafts = filePaths.map((absPath) => {
			const filename = path.basename(absPath);
			const kind = kindFromFilename(filename);
			return {
				absPath,
				filename,
				title: filename.replace(/\.[^.]+$/, ""),
				description: "",
				category: suggestedCategory(kind),
			};
		});
		this.existingIds = existingIds;
	}

	private existingIds: Set<string>;

	onOpen(): void {
		this.titleEl.setText(`Register files · ${this.group}`);
		this.modalEl.addClass("writing-asset-register-modal");
		this.render();
	}

	private render(): void {
		const { contentEl } = this;
		contentEl.empty();

		if (!this.drafts.length) {
			contentEl.createEl("p", { text: "No files to register." });
			return;
		}

		new Setting(contentEl)
			.setName("Apply category to all")
			.setDesc("If set, applies the same kind to every file below.")
			.addDropdown((dropdown) => {
				dropdown.addOption("", "Per file");
				for (const cat of CATEGORIES) {
					dropdown.addOption(cat.id, cat.label);
				}
				dropdown.setValue(this.sharedCategory);
				dropdown.onChange((value) => {
					this.sharedCategory = isAssetCategory(value) ? value : "";
					if (this.sharedCategory) {
						for (const draft of this.drafts) {
							draft.category = this.sharedCategory;
						}
					}
					this.render();
				});
			});

		for (const draft of this.drafts) {
			const wrap = contentEl.createDiv("writing-asset-draft");
			wrap.createSpan({
				cls: "writing-asset-draft-file",
				text: draft.filename,
			});

			new Setting(wrap).setName("Title").addText((text) =>
				text.setValue(draft.title).onChange((value) => {
					draft.title = value;
				}),
			);

			new Setting(wrap).setName("Kind").addDropdown((dropdown) => {
				for (const cat of CATEGORIES) {
					dropdown.addOption(cat.id, cat.label);
				}
				dropdown.setValue(draft.category);
				dropdown.onChange((value) => {
					if (isAssetCategory(value)) draft.category = value;
				});
			});

			new Setting(wrap).setName("Description").addText((text) =>
				text
					.setPlaceholder("One-line description (optional)")
					.setValue(draft.description)
					.onChange((value) => {
						draft.description = value;
					}),
			);
		}

		new Setting(contentEl).addButton((button) =>
			button
				.setButtonText(`Register ${this.drafts.length}`)
				.setCta()
				.onClick(async () => {
					const items = this.toItems();
					this.close();
					await this.onSave(items);
				}),
		);
	}

	private toItems(): AssetItem[] {
		const ids = new Set(this.existingIds);
		return this.drafts.map((draft) => {
			const id = uniqueAssetId(draft.filename, ids);
			ids.add(id);
			const kind = kindFromFilename(draft.filename);
			return {
				id,
				path: this.plugin.toStoredPath(draft.absPath),
				filename: draft.filename,
				kind,
				category: draft.category,
				title: draft.title.trim() || draft.filename,
				description: draft.description.trim(),
			};
		});
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
