import {
	copyFileSync,
	existsSync,
	listDirectoryNames,
	path,
	statSync,
} from "./sys";

interface OpenDialogResult {
	canceled: boolean;
	filePaths: string[];
}

interface RemoteDialog {
	showOpenDialog: (options: {
		title?: string;
		properties: string[];
		filters?: { name: string; extensions: string[] }[];
	}) => Promise<OpenDialogResult>;
}

interface WindowWithRequire extends Window {
	require?: (moduleId: string) => unknown;
}

function runtimeRequire(id: string): unknown {
	const req = (window as WindowWithRequire).require;
	if (typeof req !== "function") {
		throw new Error("This plugin only works in Obsidian desktop.");
	}
	return req(id);
}

function loadRemoteDialog(): RemoteDialog {
	try {
		const remote = runtimeRequire("@electron/remote") as { dialog?: RemoteDialog };
		if (remote.dialog) return remote.dialog;
	} catch {
		// fall through to electron
	}
	const electron = runtimeRequire("electron") as {
		dialog?: RemoteDialog;
		remote?: { dialog: RemoteDialog };
	};
	const dialog = electron.remote?.dialog ?? electron.dialog;
	if (!dialog) throw new Error("Could not open the file dialog.");
	return dialog;
}

export async function pickLocalFiles(multiple = true): Promise<string[]> {
	const dialog = loadRemoteDialog();
	const result = await dialog.showOpenDialog({
		title: "Select files",
		properties: multiple ? ["openFile", "multiSelections"] : ["openFile"],
		filters: [{ name: "All Files", extensions: ["*"] }],
	});
	if (result.canceled || !result.filePaths?.length) return [];
	return result.filePaths;
}

export async function pickDirectory(title = "Select folder"): Promise<string | null> {
	try {
		const dialog = loadRemoteDialog();
		const result = await dialog.showOpenDialog({
			title,
			properties: ["openDirectory"],
		});
		if (result.canceled || !result.filePaths[0]) return null;
		return result.filePaths[0];
	} catch {
		return null;
	}
}

export function openInOs(absPath: string): void {
	try {
		const remote = runtimeRequire("@electron/remote") as {
			shell: { openPath: (p: string) => Promise<string> };
		};
		void remote.shell.openPath(absPath);
	} catch {
		const electron = runtimeRequire("electron") as {
			shell: { openPath: (p: string) => Promise<string> };
		};
		void electron.shell.openPath(absPath);
	}
}

function pathForDroppedFile(file: File): string | null {
	const legacy = (file as File & { path?: string }).path;
	if (legacy) return legacy;
	try {
		const electron = runtimeRequire("electron") as {
			webUtils?: { getPathForFile?: (dropped: File) => string };
		};
		const resolved = electron.webUtils?.getPathForFile?.(file);
		if (resolved) return resolved;
	} catch {
		// older Electron without webUtils
	}
	return null;
}

/** Absolute paths from a Finder/Explorer drop. Directories expand to immediate files only. */
export function pathsFromDrop(event: DragEvent, limit = 80): string[] {
	const files = event.dataTransfer?.files;
	if (!files?.length) return [];
	const raw: string[] = [];
	for (const file of Array.from(files)) {
		const abs = pathForDroppedFile(file);
		if (abs) raw.push(abs);
	}
	return expandDroppedPaths(raw, limit);
}

function expandDroppedPaths(paths: string[], limit: number): string[] {
	const out: string[] = [];
	for (const abs of paths) {
		if (out.length >= limit) break;
		try {
			const stat = statSync(abs);
			if (stat.isFile()) {
				out.push(abs);
				continue;
			}
			if (!stat.isDirectory()) continue;
			for (const name of listDirectoryNames(abs)) {
				if (out.length >= limit) break;
				const child = path.join(abs, name);
				try {
					if (statSync(child).isFile()) out.push(child);
				} catch {
					// skip unreadable entries
				}
			}
		} catch {
			// skip missing paths
		}
	}
	return out;
}
