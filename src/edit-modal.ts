import { Modal, Setting } from "obsidian";
import type WritingAssetPlugin from "./main";
import {
	CATEGORIES,
	isAssetCategory,
	type AssetItem,
} from "./types";

export class EditAssetModal extends Modal {
	private title: string;
	private description: string;
	private category: AssetItem["category"];

	constructor(
		private plugin: WritingAssetPlugin,
		private item: AssetItem,
		private onSave: (item: AssetItem) => Promise<void>,
	) {
		super(plugin.app);
		this.title = item.title;
		this.description = item.description;
		this.category = item.category;
	}

	onOpen(): void {
		this.titleEl.setText("Edit info");
		this.modalEl.addClass("writing-asset-register-modal");
		const { contentEl } = this;

		contentEl.createDiv({
			cls: "writing-asset-draft-file",
			text: this.item.filename,
		});

		new Setting(contentEl).setName("Title").addText((text) =>
			text.setValue(this.title).onChange((value) => {
				this.title = value;
			}),
		);

		new Setting(contentEl).setName("Kind").addDropdown((dropdown) => {
			for (const cat of CATEGORIES) {
				dropdown.addOption(cat.id, cat.label);
			}
			dropdown.setValue(this.category);
			dropdown.onChange((value) => {
				if (isAssetCategory(value)) this.category = value;
			});
		});

		new Setting(contentEl).setName("Description").addText((text) =>
			text
				.setPlaceholder("One-line description (optional)")
				.setValue(this.description)
				.onChange((value) => {
					this.description = value;
				}),
		);

		new Setting(contentEl)
			.addButton((button) =>
				button.setButtonText("Cancel").onClick(() => this.close()),
			)
			.addButton((button) =>
				button
					.setButtonText("Save")
					.setCta()
					.onClick(async () => {
						const next: AssetItem = {
							...this.item,
							title: this.title.trim() || this.item.filename,
							description: this.description.trim(),
							category: this.category,
						};
						this.close();
						await this.onSave(next);
					}),
			);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
