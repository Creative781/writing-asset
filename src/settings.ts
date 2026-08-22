import { App, PluginSettingTab, Setting, ToggleComponent } from "obsidian";
import type WritingAssetPlugin from "./main";
import { pickDirectory } from "./electron";
import { FolderSuggest } from "./folder-suggest";
import {
	CARD_PRESET_LABELS,
	fieldsForPreset,
	isCardPreset,
} from "./types";

export class WritingAssetSettingTab extends PluginSettingTab {
	private cardFieldsExpanded = false;

	constructor(
		app: App,
		private plugin: WritingAssetPlugin,
	) {
		super(app, plugin);
	}

	display(): void {
		const { containerEl } = this;
		containerEl.empty();

		new Setting(containerEl)
			.setName("Asset group property")
			.setDesc(
				"Property key shared by writing notes and asset catalogs. Default is asset-group.",
			)
			.addText((text) =>
				text
					.setPlaceholder("asset-group")
					.setValue(this.plugin.settings.propertyName)
					.onChange(async (value) => {
						this.plugin.settings.propertyName = value.trim() || "asset-group";
						await this.plugin.saveSettings();
					}),
			);

		new Setting(containerEl)
			.setName("Catalog note folder")
			.setDesc(
				"Folder for new catalog notes. Type to suggest existing folders. Leave empty or pick the vault root to create them at the top level.",
			)
			.addSearch((search) => {
				new FolderSuggest(this.app, search.inputEl);
				search
					.setPlaceholder("Select folder · empty = vault root")
					.setValue(this.plugin.settings.catalogFolder)
					.onChange(async (value) => {
						const next = value.trim();
						this.plugin.settings.catalogFolder =
							next === "/" || next === "." ? "" : next;
						await this.plugin.saveSettings();
					});
			});

		const root = new Setting(containerEl)
			.setName("Asset root folder")
			.setDesc(
				"Prefer keeping research files under this folder. Paths inside the root are stored relatively, so moving the whole folder only requires updating this setting.",
			)
			.addText((text) =>
				text
					.setPlaceholder("/Users/me/Documents/Research Files")
					.setValue(this.plugin.settings.assetRoot)
					.onChange(async (value) => {
						this.plugin.settings.assetRoot = value.trim();
						await this.plugin.saveSettings();
					}),
			)
			.addButton((button) =>
				button.setButtonText("Browse").onClick(async () => {
					const dir = await pickDirectory("Select asset root folder");
					if (!dir) return;
					this.plugin.settings.assetRoot = dir;
					await this.plugin.saveSettings();
					this.display();
				}),
			);

		root.infoEl.createDiv({
			cls: "setting-item-description",
			text: "Leave empty to always store absolute paths.",
		});

		new Setting(containerEl)
			.setName("When exporting to PDF")
			.setDesc(
				"How much linked asset content to include when Obsidian exports or prints to PDF. Does not affect on-screen reading.",
			)
			.addDropdown((dropdown) => {
				dropdown.addOption("images", "Images only");
				dropdown.addOption("all", "All linked assets");
				dropdown.setValue(this.plugin.settings.pdfExportMode);
				dropdown.onChange(async (value) => {
					this.plugin.settings.pdfExportMode =
						value === "all" ? "all" : "images";
					await this.plugin.saveSettings();
				});
			});

		new Setting(containerEl)
			.setName("Linked card style")
			.setDesc(
				"How embedded assets appear in the note. Choosing a preset also updates card fields.",
			)
			.addDropdown((dropdown) => {
				for (const [id, label] of Object.entries(CARD_PRESET_LABELS)) {
					dropdown.addOption(id, label);
				}
				dropdown.setValue(this.plugin.settings.cardPreset);
				dropdown.onChange(async (value) => {
					if (!isCardPreset(value)) return;
					this.plugin.settings.cardPreset = value;
					this.plugin.settings.cardFields = fieldsForPreset(value);
					await this.plugin.saveSettings();
					this.display();
				});
			});

		this.renderCardFieldsSection(containerEl);
	}

	private renderCardFieldsSection(containerEl: HTMLElement): void {
		const section = containerEl.createDiv("writing-asset-card-fields-section");
		const header = section.createEl("button", {
			cls: "writing-asset-card-fields-header",
			type: "button",
		});
		header.createSpan({ cls: "writing-asset-card-fields-title", text: "Card fields" });
		header.createSpan({
			cls: "writing-asset-card-fields-summary",
			text: this.cardFieldsSummary(),
		});
		const chevron = header.createSpan({ cls: "writing-asset-card-fields-chevron" });
		chevron.setText(this.cardFieldsExpanded ? "▾" : "▸");

		const body = section.createDiv("writing-asset-card-fields-body");
		if (!this.cardFieldsExpanded) body.addClass("is-collapsed");

		this.addFieldToggle(body, "title", "Title");
		this.addFieldToggle(body, "filename", "Filename");
		this.addFieldToggle(body, "description", "Description");
		this.addFieldToggle(body, "kind", "Kind");

		header.addEventListener("click", () => {
			this.cardFieldsExpanded = !this.cardFieldsExpanded;
			this.display();
		});
	}

	private cardFieldsSummary(): string {
		const labels: Record<keyof typeof this.plugin.settings.cardFields, string> = {
			title: "Title",
			filename: "Filename",
			description: "Description",
			kind: "Kind",
		};
		const on = (
			Object.entries(this.plugin.settings.cardFields) as [
				keyof typeof labels,
				boolean,
			][]
		)
			.filter(([, value]) => value)
			.map(([key]) => labels[key]);
		return on.length ? on.join(" · ") : "None";
	}

	private addFieldToggle(
		containerEl: HTMLElement,
		key: "title" | "filename" | "description" | "kind",
		name: string,
	): void {
		const row = containerEl.createDiv("writing-asset-card-field");
		row.createSpan({ cls: "writing-asset-card-field-label", text: name });
		const toggleWrap = row.createDiv("writing-asset-card-field-toggle");
		new ToggleComponent(toggleWrap)
			.setValue(this.plugin.settings.cardFields[key])
			.onChange(async (value) => {
				this.plugin.settings.cardFields[key] = value;
				await this.plugin.saveSettings();
				const summary = containerEl
					.closest(".writing-asset-card-fields-section")
					?.querySelector(".writing-asset-card-fields-summary");
				if (summary) summary.setText(this.cardFieldsSummary());
			});
	}
}
