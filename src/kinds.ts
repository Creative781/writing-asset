import type { AssetCategory, AssetKind } from "./types";

const IMAGE_EXT = new Set([
	"png",
	"jpg",
	"jpeg",
	"gif",
	"bmp",
	"svg",
	"webp",
	"avif",
	"heic",
	"tif",
	"tiff",
]);

const AUDIO_EXT = new Set([
	"mp3",
	"wav",
	"m4a",
	"ogg",
	"flac",
	"webm",
	"3gp",
	"aac",
]);

const VIDEO_EXT = new Set(["mp4", "webm", "ogv", "mov", "mkv", "m4v"]);

const SPREADSHEET_EXT = new Set([
	"xlsx",
	"xls",
	"csv",
	"tsv",
	"ods",
	"numbers",
]);

const DOCUMENT_EXT = new Set([
	"pdf",
	"doc",
	"docx",
	"rtf",
	"txt",
	"md",
	"pages",
	"ppt",
	"pptx",
	"key",
	"hwp",
	"hwpx",
]);

export function extensionOf(filename: string): string {
	const parts = filename.toLowerCase().split(".");
	return parts.length > 1 ? (parts[parts.length - 1] ?? "") : "";
}

export function kindFromFilename(filename: string): AssetKind {
	const ext = extensionOf(filename);
	if (IMAGE_EXT.has(ext)) return "image";
	if (AUDIO_EXT.has(ext)) return "audio";
	if (VIDEO_EXT.has(ext)) return "video";
	if (SPREADSHEET_EXT.has(ext)) return "spreadsheet";
	if (DOCUMENT_EXT.has(ext)) return "document";
	return "other";
}

export function suggestedCategory(kind: AssetKind): AssetCategory {
	if (kind === "image") return "photo";
	if (kind === "spreadsheet") return "table";
	if (kind === "document" || kind === "audio" || kind === "video") return "document";
	return "other";
}

export function canEmbed(filename: string, kind: AssetKind): boolean {
	if (kind === "image" || kind === "audio" || kind === "video") return true;
	return extensionOf(filename) === "pdf";
}
