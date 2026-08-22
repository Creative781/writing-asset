import {
	copyFileSync as fsCopyFileSync,
	existsSync as fsExistsSync,
	mkdirSync as fsMkdirSync,
	readdirSync as fsReaddirSync,
	readFileSync as fsReadFileSync,
	statSync as fsStatSync,
	writeFileSync as fsWriteFileSync,
} from "fs";
import * as nodePath from "path";

export const PATH_SEP = nodePath.sep;

export function resolvePath(...segments: string[]): string {
	return nodePath.resolve(...segments);
}

export function joinPath(...segments: string[]): string {
	return nodePath.join(...segments);
}

export function dirnamePath(filePath: string): string {
	return nodePath.dirname(filePath);
}

export function basenamePath(filePath: string, suffix?: string): string {
	return suffix === undefined
		? nodePath.basename(filePath)
		: nodePath.basename(filePath, suffix);
}

export function extnamePath(filePath: string): string {
	return nodePath.extname(filePath);
}

export function isAbsolutePath(filePath: string): boolean {
	return nodePath.isAbsolute(filePath);
}

export function relativePath(from: string, to: string): string {
	return nodePath.relative(from, to);
}

export function pathExists(absPath: string): boolean {
	try {
		return fsExistsSync(absPath);
	} catch {
		return false;
	}
}

export function isExistingFile(absPath: string): boolean {
	try {
		return fsExistsSync(absPath) && fsStatSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function isFilePath(absPath: string): boolean {
	try {
		return fsStatSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function isDirectoryPath(absPath: string): boolean {
	try {
		return fsStatSync(absPath).isDirectory();
	} catch {
		return false;
	}
}

export function fileSize(absPath: string): number | null {
	try {
		const stat = fsStatSync(absPath);
		if (!stat.isFile()) return null;
		return stat.size;
	} catch {
		return null;
	}
}

export function readFileBytes(absPath: string): Uint8Array | null {
	try {
		return new Uint8Array(fsReadFileSync(absPath));
	} catch {
		return null;
	}
}

export function listDirectoryNames(absPath: string): string[] {
	try {
		return fsReaddirSync(absPath, { encoding: "utf8" });
	} catch {
		return [];
	}
}

export function ensureDirectory(absPath: string): void {
	fsMkdirSync(absPath, { recursive: true });
}

export function copyFile(fromPath: string, toPath: string): void {
	fsCopyFileSync(fromPath, toPath);
}

export function writeTextFile(absPath: string, text: string): void {
	fsWriteFileSync(absPath, text, "utf8");
}
