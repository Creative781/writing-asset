import { Modal, Setting } from "obsidian";
import type WritingAssetPlugin from "./main";
import { pickDirectory } from "./electron";
import { replacePathPrefix, resolveAssetPath } from "./paths";
import type { AssetItem } from "./types";

export class RelinkPrefixModal extends Modal {
	private oldPrefix = "";
	private newPrefix = "";

	constructor(
		private plugin: WritingAssetPlugin,
		private group: string,
		private items: AssetItem[],
		private onDone: (items: AssetItem[]) => Promise<void>,
	) {
		super(plugin.app);
	}

	onOpen(): void {
		this.titleEl.setText("Replace path prefix");
		this.contentEl.createEl("p", {
			text: "If you moved a whole folder, set the old and new locations to update paths in this group at once. If you moved the entire asset root, change only the root in settings.",
		});

		const oldSetting = new Setting(this.contentEl)
			.setName("Old folder")
			.addText((text) =>
				text.setPlaceholder("/Users/.../old").onChange((value) => {
					this.oldPrefix = value.trim();
				}),
			)
			.addButton((button) =>
				button.setButtonText("Browse").onClick(async () => {
					const dir = await pickDirectory("Old folder");
					if (!dir) return;
					this.oldPrefix = dir;
					oldSetting.controlEl.querySelector("input")?.setAttribute("value", dir);
					const input = oldSetting.controlEl.querySelector("input");
					if (input) input.value = dir;
				}),
			);

		const newSetting = new Setting(this.contentEl)
			.setName("New folder")
			.addText((text) =>
				text.setPlaceholder("/Users/.../new").onChange((value) => {
					this.newPrefix = value.trim();
				}),
			)
			.addButton((button) =>
				button.setButtonText("Browse").onClick(async () => {
					const dir = await pickDirectory("New folder");
					if (!dir) return;
					this.newPrefix = dir;
					const input = newSetting.controlEl.querySelector("input");
					if (input) input.value = dir;
				}),
			);

		new Setting(this.contentEl).addButton((button) =>
			button
				.setButtonText("Apply")
				.setCta()
				.onClick(async () => {
					if (!this.oldPrefix || !this.newPrefix) return;
					const root = this.plugin.settings.assetRoot;
					const next = this.items.map((item) => {
						const abs = resolveAssetPath(item.path, root);
						const updated = replacePathPrefix(abs, this.oldPrefix, this.newPrefix);
						if (updated === abs) return item;
						return {
							...item,
							path: this.plugin.toStoredPath(updated),
						};
					});
					this.close();
					await this.onDone(next);
				}),
		);
	}

	onClose(): void {
		this.contentEl.empty();
	}
}
