import {
	copyFileSync,
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	statSync,
	writeFileSync,
} from "fs";
import path from "path";

export {
	copyFileSync,
	existsSync,
	mkdirSync,
	path,
	readFileSync,
	readdirSync,
	statSync,
	writeFileSync,
};

export function isExistingFile(absPath: string): boolean {
	try {
		return existsSync(absPath) && statSync(absPath).isFile();
	} catch {
		return false;
	}
}

export function fileSize(absPath: string): number | null {
	try {
		const stat = statSync(absPath);
		return stat.isFile() ? stat.size : null;
	} catch {
		return null;
	}
}

export function readFileBytes(absPath: string): Buffer | null {
	try {
		return readFileSync(absPath);
	} catch {
		return null;
	}
}

export function listDirectoryNames(absPath: string): string[] {
	try {
		return readdirSync(absPath);
	} catch {
		return [];
	}
}

export function ensureDirectory(absPath: string): void {
	mkdirSync(absPath, { recursive: true });
}
