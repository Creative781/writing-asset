import * as fs from "fs";
import * as nodePath from "path";
import { extensionOf } from "./kinds";

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

export function mimeFor(filename: string): string {
	return MIME[extensionOf(filename)] ?? "application/octet-stream";
}

export function localMediaBlobUrl(absPath: string): string | null {
	try {
		const stat = fs.statSync(absPath);
		if (!stat.isFile() || stat.size === 0) return null;
		if (stat.size > MAX_PREVIEW_BYTES) return null;
		const buf = fs.readFileSync(absPath);
		const blob = new Blob([new Uint8Array(buf)], {
			type: mimeFor(nodePath.basename(absPath)),
		});
		return URL.createObjectURL(blob);
	} catch {
		return null;
	}
}

/** Data URLs survive Beautiful PDF HTML copy; blob: URLs do not. */
export function localMediaDataUrl(absPath: string): string | null {
	try {
		const stat = fs.statSync(absPath);
		if (!stat.isFile() || stat.size === 0) return null;
		if (stat.size > MAX_PREVIEW_BYTES) return null;
		const buf = fs.readFileSync(absPath);
		return `data:${mimeFor(nodePath.basename(absPath))};base64,${buf.toString("base64")}`;
	} catch {
		return null;
	}
}
