export const CATALOG_TYPE = "writing-asset-catalog";

export type AssetKind =
	| "image"
	| "document"
	| "audio"
	| "video"
	| "spreadsheet"
	| "other";

export type AssetCategory = "photo" | "figure" | "table" | "document" | "other";

export interface CategoryOption {
	id: AssetCategory;
	label: string;
}

export const CATEGORIES: CategoryOption[] = [
	{ id: "photo", label: "Photo" },
	{ id: "figure", label: "Figure" },
	{ id: "table", label: "Table" },
	{ id: "document", label: "Document" },
	{ id: "other", label: "Other" },
];

export const KIND_LABELS: Record<AssetKind, string> = {
	image: "Image",
	document: "Document",
	audio: "Audio",
	video: "Video",
	spreadsheet: "Spreadsheet",
	other: "Other",
};

export interface AssetItem {
	id: string;
	path: string;
	filename: string;
	kind: AssetKind;
	category: AssetCategory;
	title: string;
	description: string;
}

export interface CatalogPayload {
	items: AssetItem[];
}

export type PdfExportMode = "all" | "images";

export type CardPreset = "normal" | "simple" | "very-simple";

export interface CardFields {
	title: boolean;
	filename: boolean;
	description: boolean;
	kind: boolean;
}

export const CARD_PRESET_LABELS: Record<CardPreset, string> = {
	normal: "Normal",
	simple: "Simple",
	"very-simple": "Very simple",
};

export function fieldsForPreset(preset: CardPreset): CardFields {
	if (preset === "normal") {
		return { title: true, filename: true, description: true, kind: true };
	}
	if (preset === "simple") {
		return { title: true, filename: false, description: true, kind: false };
	}
	return { title: true, filename: false, description: false, kind: false };
}

export function isCardPreset(value: string): value is CardPreset {
	return value === "normal" || value === "simple" || value === "very-simple";
}

export interface WritingAssetSettings {
	catalogFolder: string;
	assetRoot: string;
	propertyName: string;
	pdfExportMode: PdfExportMode;
	cardPreset: CardPreset;
	cardFields: CardFields;
}

export const DEFAULT_SETTINGS: WritingAssetSettings = {
	catalogFolder: "",
	assetRoot: "",
	propertyName: "asset-group",
	pdfExportMode: "images",
	cardPreset: "simple",
	cardFields: fieldsForPreset("simple"),
};

export function categoryLabel(id: string): string {
	return CATEGORIES.find((c) => c.id === id)?.label ?? id;
}

export function isAssetCategory(value: string): value is AssetCategory {
	return CATEGORIES.some((c) => c.id === value);
}
