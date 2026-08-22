import { extensionOf } from "./kinds";
import { basenamePath, fileSize, readFileBytes } from "./sys";

const MIME: Record<string, string> = {
	png: "image/png",
	jpg: "image/jpeg",
	jpeg: "image/jpeg",
	gif: "image/gif",
	webp: "image/webp",
	svg: "image/svg+xml",
	bmp: "image/bmp",
	avif: "image/avif",
	tif: "image/tiff",
	tiff: "image/tiff",
	pdf: "application/pdf",
	mp3: "audio/mpeg",
	wav: "audio/wav",
	m4a: "audio/mp4",
	ogg: "audio/ogg",
	flac: "audio/flac",
	aac: "audio/aac",
	mp4: "video/mp4",
	webm: "video/webm",
	ogv: "video/ogg",
	mov: "video/quicktime",
	mkv: "video/x-matroska",
	m4v: "video/mp4",
};

const MAX_PREVIEW_BYTES = 80 * 1024 * 1024;

function bytesToBase64(bytes: Uint8Array): string {
	const copy = Uint8Array.from(bytes);
	let binary = "";
	for (let i = 0; i < copy.length; i++) {
		binary += String.fromCharCode(copy[i]!);
	}
	return btoa(binary);
}

export function mimeFor(filename: string): string {
	return MIME[extensionOf(filename)] ?? "application/octet-stream";
}

export function localMediaBlobUrl(absPath: string): string | null {
	const size = fileSize(absPath);
	if (size === null || size === 0 || size > MAX_PREVIEW_BYTES) return null;
	const bytes = readFileBytes(absPath);
	if (!bytes) return null;
	const blob = new Blob([Uint8Array.from(bytes)], {
		type: mimeFor(basenamePath(absPath)),
	});
	return URL.createObjectURL(blob);
}

/** Data URLs survive Beautiful PDF HTML copy; blob: URLs do not. */
export function localMediaDataUrl(absPath: string): string | null {
	const size = fileSize(absPath);
	if (size === null || size === 0 || size > MAX_PREVIEW_BYTES) return null;
	const bytes = readFileBytes(absPath);
	if (!bytes) return null;
	const encoded = bytesToBase64(bytes);
	return `data:${mimeFor(basenamePath(absPath))};base64,${encoded}`;
}
