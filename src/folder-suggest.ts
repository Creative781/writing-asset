import { AbstractInputSuggest, App, TFolder } from "obsidian";

export class FolderSuggest extends AbstractInputSuggest<TFolder> {
	constructor(
		app: App,
		private textInput: HTMLInputElement,
	) {
		super(app, textInput);
	}

	protected getSuggestions(query: string): TFolder[] {
		const q = query.toLowerCase().trim();
		const folders: TFolder[] = [];
		for (const file of this.app.vault.getAllLoadedFiles()) {
			if (file instanceof TFolder) folders.push(file);
		}
		folders.sort((a, b) => {
			if (a.isRoot()) return -1;
			if (b.isRoot()) return 1;
			return a.path.localeCompare(b.path, "ko");
		});
		if (!q) return folders;
		return folders.filter((folder) => {
			const label = folder.isRoot() ? "/" : folder.path;
			return label.toLowerCase().includes(q);
		});
	}

	renderSuggestion(folder: TFolder, el: HTMLElement): void {
		el.setText(folder.isRoot() ? "/ (vault root)" : folder.path);
	}

	selectSuggestion(folder: TFolder): void {
		const path = folder.isRoot() ? "" : folder.path;
		this.setValue(path);
		this.textInput.value = path;
		this.textInput.dispatchEvent(new Event("input"));
		this.close();
	}
}
