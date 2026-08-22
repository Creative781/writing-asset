import { TFile, TFolder, type App } from "obsidian";

function walkMarkdownFiles(folder: TFolder, out: TFile[]): void {
	for (const child of folder.children) {
		if (child instanceof TFile && child.extension === "md") out.push(child);
		else if (child instanceof TFolder) walkMarkdownFiles(child, out);
	}
}

export function indexedMarkdownFiles(app: App): TFile[] {
	const out: TFile[] = [];
	walkMarkdownFiles(app.vault.getRoot(), out);
	return out;
}

export function markdownFilesInFolder(app: App, folderPath: string): TFile[] {
	const folder = app.vault.getFolderByPath(folderPath);
	if (!folder) return [];
	const out: TFile[] = [];
	walkMarkdownFiles(folder, out);
	return out;
}

export function allFolders(app: App): TFolder[] {
	const out: TFolder[] = [];
	const walk = (folder: TFolder): void => {
		out.push(folder);
		for (const child of folder.children) {
			if (child instanceof TFolder) walk(child);
		}
	};
	walk(app.vault.getRoot());
	return out;
}
