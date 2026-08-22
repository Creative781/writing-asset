import { Modal, Setting } from "obsidian";
import type WritingAssetPlugin from "./main";

export class GroupModal extends Modal {
	private value = "";
	private writeToNote = true;
	private submitted = false;

	constructor(
		private plugin: WritingAssetPlugin,
		private groups: string[],
		private onSubmit: (group: string, writeToNote: boolean) => void,
		private onCancel?: () => void,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.titleEl.setText("Choose asset group");
		this.contentEl.addClass("writing-asset-group-modal");
		this.contentEl.createEl("p", {
			text: "Pick or create an asset group (asset-group) for this note. Notes with the same value share the same asset list.",
		});

		if (this.groups.length) {
			new Setting(this.contentEl)
				.setName("Existing group")
				.addDropdown((dropdown) => {
					dropdown.addOption("", "Select…");
					for (const group of this.groups) {
						dropdown.addOption(group, group);
					}
					dropdown.onChange((value) => {
						this.value = value;
					});
				});
		}

		new Setting(this.contentEl)
			.setName("New group name")
			.setDesc("Used only when you do not pick an existing group.")
			.addText((text) =>
				text.setPlaceholder("e.g. dissertation").onChange((value) => {
					this.value = value.trim();
				}),
			);

		new Setting(this.contentEl)
			.setName("Save to this note’s properties")
			.setDesc("Next time you open this note, the same list appears right away.")
			.addToggle((toggle) =>
				toggle.setValue(true).onChange((value) => {
					this.writeToNote = value;
				}),
			);

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText("Open")
				.setCta()
				.onClick(() => {
					const group = this.value.trim();
					if (!group) return;
					this.submitted = true;
					this.close();
					this.onSubmit(group, this.writeToNote);
				}),
		);
	}

	onClose(): void {
		this.contentEl.empty();
		if (!this.submitted) this.onCancel?.();
	}
}
