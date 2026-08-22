export {
	PATH_SEP,
	basenamePath,
	dirnamePath,
	extnamePath,
	isAbsolutePath,
	joinPath,
	normalizePath,
	relativePath,
	resolvePath,
} from "./path-utils";
import { loadFsModule, readLocalFileBytes } from "./runtime";

export function pathExists(absPath: string): boolean {
	try {
		return loadFsModule().existsSync(absPath);
	} catch {
		return false;
	}
}

export function isExistingFile(absPath: string): boolean {
	try {
		const fs = loadFsModule();
		return fs.existsSync(absPath) && fs.statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function isFilePath(absPath: string): boolean {
	try {
		return loadFsModule().statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function isDirectoryPath(absPath: string): boolean {
	try {
		return loadFsModule().statSync(absPath).isDirectory();
	} catch {
		return false;
	}
}

export function fileSize(absPath: string): number | null {
	try {
		const stat = loadFsModule().statSync(absPath);
		if (!stat.isFile()) return null;
		return stat.size;
	} catch {
		return null;
	}
}

export function readFileBytes(absPath: string): Uint8Array | null {
	try {
		return readLocalFileBytes(absPath);
	} catch {
		return null;
	}
}

export function listDirectoryNames(absPath: string): string[] {
	try {
		return loadFsModule().readdirSync(absPath, { encoding: "utf8" });
	} catch {
		return [];
	}
}

export function ensureDirectory(absPath: string): void {
	loadFsModule().mkdirSync(absPath, { recursive: true });
}

export function copyFile(fromPath: string, toPath: string): void {
	loadFsModule().copyFileSync(fromPath, toPath);
}

export function writeTextFile(absPath: string, text: string): void {
	loadFsModule().writeFileSync(absPath, text, "utf8");
}
