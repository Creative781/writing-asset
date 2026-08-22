interface WindowWithRequire extends Window {
	require?: (moduleId: string) => unknown;
}

export interface FsStat {
	isFile(): boolean;
	isDirectory(): boolean;
	size: number;
}

export interface FsModule {
	existsSync(path: string): boolean;
	statSync(path: string): FsStat;
	readdirSync(path: string, options: { encoding: "utf8" }): string[];
	readFileSync(path: string): Uint8Array | ArrayBuffer;
	mkdirSync(path: string, options: { recursive: true }): void;
	copyFileSync(from: string, to: string): void;
	writeFileSync(path: string, data: string, encoding: "utf8"): void;
}

export function runtimeRequire(moduleId: string): unknown {
	const req = (window as WindowWithRequire).require;
	if (typeof req !== "function") {
		throw new Error("This plugin only works in Obsidian desktop.");
	}
	return req(moduleId);
}

function isFsModule(value: unknown): value is FsModule {
	if (typeof value !== "object" || value === null) return false;
	const existsDesc = Object.getOwnPropertyDescriptor(value, "existsSync");
	const statDesc = Object.getOwnPropertyDescriptor(value, "statSync");
	const existsSync: unknown = existsDesc ? (existsDesc.value as unknown) : undefined;
	const statSync: unknown = statDesc ? (statDesc.value as unknown) : undefined;
	return typeof existsSync === "function" && typeof statSync === "function";
}

let cachedFs: FsModule | null = null;

export function loadFsModule(): FsModule {
	if (cachedFs) return cachedFs;
	const loaded = runtimeRequire("fs");
	if (!isFsModule(loaded)) {
		throw new Error("Could not load the filesystem module.");
	}
	cachedFs = loaded;
	return cachedFs;
}

function toUint8Array(raw: Uint8Array | ArrayBuffer): Uint8Array {
	if (raw instanceof Uint8Array) return Uint8Array.from(raw);
	return new Uint8Array(raw);
}

export function readLocalFileBytes(absPath: string): Uint8Array {
	return toUint8Array(loadFsModule().readFileSync(absPath));
}
