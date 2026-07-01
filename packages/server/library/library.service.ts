import fs from "node:fs/promises";
import path from "node:path";
import {
  strFromU8,
  strToU8,
  type UnzipFileInfo,
  unzipSync,
  zipSync,
} from "fflate";
import type { EntryMediaType } from "../db/schema/libraryEntries";
import { logger } from "../logger";
import { sourceIntegrationModel } from "../source-integrations/source-integration.model";
import type { SourceIntegrationType } from "../source-integrations/source-integration.schema";
import {
  InvalidImageError,
  processAndSaveImage,
} from "../storage/image.service";
import { MEDIA_BASE_URL, MEDIA_ROOT } from "../storage/path.util";
import { deleteLibraryEntryDir } from "../storage/storage.service";
import { err, ok, type Result } from "../utils/result";
import type {
  LibraryEntry,
  LibraryTag,
  LibraryTagWeight,
} from "./library.model";
import { libraryModel } from "./library.model";
import type {
  CreateLibraryEntryInput,
  ExportLibraryEntriesInput,
  UpdateLibraryEntryInput,
} from "./library.schema";
import { createLibraryEntrySchema } from "./library.schema";

type CreateEntryInput = {
  userId: string;
  body: CreateLibraryEntryInput;
  imageBuffer?: Buffer;
};

type EntryInput = {
  userId: string;
  id: string;
};

type UpdateEntryInput = EntryInput & {
  body: UpdateLibraryEntryInput;
  imageBuffer?: Buffer;
};

type CsvLibraryRow = {
  title: string | null;
  media_id: string | null;
  source_id: string | null;
  media_type: string | null;
  status: string | null;
  adult: boolean | number | null;
  image_src: string | null;
  released_at: string | null;
  public_rating: number | null;
  personal_rating: number | null;
  major_tags: string | null;
  minor_tags: string | null;
};

type ImportWarning = {
  row?: number;
  entryId?: string;
  entryTitle?: string;
  field: string;
  message: string;
};

type CsvExportResult = {
  csv: string;
};

type CsvImportResult = {
  importedCount: number;
  skippedCount: number;
  entries: LibraryEntry[];
  warnings: ImportWarning[];
};

type BundleExportResult = {
  buffer: Buffer;
};

const REQUIRED_CSV_HEADERS: (keyof CsvLibraryRow)[] = ["title"];
const SOURCE_TYPE_BY_MEDIA_TYPE: Partial<
  Record<EntryMediaType, SourceIntegrationType>
> = {
  anime: "anilist",
  manga: "anilist",
  movie: "tmdb",
  tv_show: "tmdb",
  game: "igdb",
  book: "openlibrary",
};

const CSV_HEADERS: (keyof CsvLibraryRow)[] = [
  "title",
  "media_id",
  "source_id",
  "media_type",
  "status",
  "adult",
  "image_src",
  "released_at",
  "public_rating",
  "personal_rating",
  "major_tags",
  "minor_tags",
];

const BUNDLE_CSV_FILE = "library.csv";
const BUNDLE_WARNINGS_FILE = "warnings.json";
const MAX_BUNDLE_FILE_COUNT = 256;
const MAX_BUNDLE_UNCOMPRESSED_BYTES = 150 * 1024 * 1024;

function escapeCsvCell(value: string): string {
  const normalizedValue = value.replace(/\r?\n/g, " ");

  if (normalizedValue.includes(",") || normalizedValue.includes('"')) {
    return `"${normalizedValue.replaceAll('"', '""')}"`;
  }

  return normalizedValue;
}

function toCsvValue(value: string | number | boolean | null): string {
  if (value === null || value === undefined) {
    return "";
  }

  return escapeCsvCell(String(value));
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      cells.push(current);
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current);
  return cells;
}

function hasBalancedCsvQuotes(line: string): boolean {
  let inQuotes = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    const next = line[i + 1];

    if (char !== '"') {
      continue;
    }

    if (inQuotes && next === '"') {
      i += 1;
      continue;
    }

    inQuotes = !inQuotes;
  }

  return !inQuotes;
}

function normalizeIds(ids: ExportLibraryEntriesInput["ids"]): string[] {
  if (!ids) {
    return [];
  }

  return Array.from(new Set(Array.isArray(ids) ? ids : [ids]));
}

function escapeTagValue(value: string): string {
  return value.replaceAll("\\", "\\\\").replaceAll(",", "\\,");
}

function unescapeTagCell(value: string): string[] {
  const tags: string[] = [];
  let current = "";
  let escaping = false;

  for (const char of value) {
    if (escaping) {
      current += char;
      escaping = false;
      continue;
    }

    if (char === "\\") {
      escaping = true;
      continue;
    }

    if (char === ",") {
      if (current.trim()) {
        tags.push(current.trim());
      }
      current = "";
      continue;
    }

    current += char;
  }

  if (escaping) {
    current += "\\";
  }

  if (current.trim()) {
    tags.push(current.trim());
  }

  return tags;
}

function tagsToCsvValue(tags: LibraryTag[], weight: LibraryTagWeight): string {
  return tags
    .filter((tag) => tag.weight === weight)
    .map((tag) => escapeTagValue(tag.value))
    .join(",");
}

function isRemoteImageSrc(imageSrc: string): boolean {
  return imageSrc.startsWith("http://") || imageSrc.startsWith("https://");
}

function isLocalImageSrc(imageSrc: string): boolean {
  return imageSrc.startsWith(`${MEDIA_BASE_URL}/`);
}

function imageSrcToLocalPath(imageSrc: string): string | null {
  if (!isLocalImageSrc(imageSrc)) {
    return null;
  }

  const relativePath = imageSrc.slice(MEDIA_BASE_URL.length + 1);
  const resolvedPath = path.resolve(MEDIA_ROOT, relativePath);
  const mediaRootWithSeparator = `${MEDIA_ROOT}${path.sep}`;

  if (
    resolvedPath === MEDIA_ROOT ||
    !resolvedPath.startsWith(mediaRootWithSeparator)
  ) {
    return null;
  }

  return resolvedPath;
}

function imageSrcToBundlePath(imageSrc: string): string | null {
  const match = imageSrc.match(
    /^\/media\/users\/[^/]+\/library\/([^/]+)\/[^/]+$/
  );
  return match?.[1] ? `images/${match[1]}/original.webp` : null;
}

function isUnsafeZipPath(filePath: string): boolean {
  return (
    filePath.startsWith("/") ||
    filePath.includes("\\") ||
    filePath.split("/").includes("..")
  );
}

function validateBundleFiles(files: Record<string, Uint8Array>) {
  const entries = Object.entries(files);
  if (entries.length > MAX_BUNDLE_FILE_COUNT) {
    return "Bundle file contains too many files";
  }

  let totalBytes = 0;
  for (const [filePath, bytes] of entries) {
    if (isUnsafeZipPath(filePath)) {
      return "Bundle file contains unsafe paths";
    }

    totalBytes += bytes.byteLength;
    if (totalBytes > MAX_BUNDLE_UNCOMPRESSED_BYTES) {
      return "Bundle file is too large after extraction";
    }
  }

  return null;
}

function readBundleFiles(
  bundleBuffer: Buffer
): Result<Record<string, Uint8Array>> {
  let validationError: string | null = null;
  let fileCount = 0;
  let totalBytes = 0;

  const validateFileInfo = (file: UnzipFileInfo) => {
    if (validationError) {
      return false;
    }

    fileCount += 1;
    if (fileCount > MAX_BUNDLE_FILE_COUNT) {
      validationError = "Bundle file contains too many files";
      return false;
    }

    if (isUnsafeZipPath(file.name)) {
      validationError = "Bundle file contains unsafe paths";
      return false;
    }

    totalBytes += file.originalSize;
    if (totalBytes > MAX_BUNDLE_UNCOMPRESSED_BYTES) {
      validationError = "Bundle file is too large after extraction";
      return false;
    }

    return true;
  };

  try {
    const files = unzipSync(bundleBuffer, { filter: validateFileInfo });
    if (validationError) {
      return err(400, validationError);
    }

    const bundleValidationError = validateBundleFiles(files);
    if (bundleValidationError) {
      return err(400, bundleValidationError);
    }

    return ok(files);
  } catch (error) {
    logger.warn({ error }, "Invalid library bundle upload");
    return err(400, "Bundle file is malformed");
  }
}

function toCsvRow(entry: LibraryEntry, tags: LibraryTag[] = []): CsvLibraryRow {
  return {
    title: entry.title,
    media_id: entry.media_id,
    source_id: entry.source_id,
    media_type: entry.media_type,
    status: entry.status,
    adult: entry.adult,
    image_src: entry.image_src,
    released_at: entry.released_at,
    public_rating: entry.public_rating,
    personal_rating: entry.personal_rating,
    major_tags: tagsToCsvValue(tags, "major"),
    minor_tags: tagsToCsvValue(tags, "minor"),
  };
}

class LibraryService {
  async createEntry({
    userId,
    body,
    imageBuffer,
  }: CreateEntryInput): Promise<Result<LibraryEntry>> {
    const entryId = crypto.randomUUID();

    let imagePaths = null;

    if (imageBuffer) {
      try {
        imagePaths = await processAndSaveImage(imageBuffer, userId, entryId);
      } catch (error) {
        if (error instanceof InvalidImageError) {
          return err(400, "Unsupported image file");
        }

        throw error;
      }
    }

    const sourceId = await this.resolveSourceIdForUser({
      userId,
      requestedSourceId: body.source_id,
      mediaType: body.media_type,
    });

    const entry = await libraryModel.create({
      id: entryId,
      user_id: userId,
      title: body.title,
      media_id: body.media_id,
      source_id: sourceId,
      media_type: body.media_type,
      status: body.status,
      adult: body.adult,
      released_at: body.released_at,
      public_rating: body.public_rating,
      personal_rating: body.personal_rating,
      image_src: imagePaths?.original,
    });

    logger.info(`Library entry created: ${entry.id}`);
    return ok(entry);
  }

  async getUserLibrary(userId: string): Promise<Result<LibraryEntry[]>> {
    const entries = await libraryModel.getByUser(userId);
    return ok(entries);
  }

  async getEntryById({
    userId,
    id,
  }: EntryInput): Promise<Result<LibraryEntry>> {
    const entry = await libraryModel.getById(id);

    if (!entry || entry.user_id !== userId) {
      return err(404, "Entry not found");
    }

    return ok(entry);
  }

  async updateEntry({
    userId,
    id,
    body,
    imageBuffer,
  }: UpdateEntryInput): Promise<Result<LibraryEntry>> {
    let imageSrc: string | undefined;

    if (imageBuffer) {
      let imagePaths: Awaited<ReturnType<typeof processAndSaveImage>>;
      try {
        imagePaths = await processAndSaveImage(imageBuffer, userId, id);
      } catch (error) {
        if (error instanceof InvalidImageError) {
          return err(400, "Unsupported image file");
        }

        throw error;
      }

      imageSrc = imagePaths.original;
    }

    const sourceId = Object.hasOwn(body, "source_id")
      ? await this.resolveSourceIdForUser({
          userId,
          requestedSourceId: body.source_id,
          mediaType: body.media_type,
        })
      : undefined;

    const bodyWithoutSourceId = { ...body };
    delete bodyWithoutSourceId.source_id;
    const updated = await libraryModel.update(id, userId, {
      ...bodyWithoutSourceId,
      ...(sourceId !== undefined ? { source_id: sourceId } : {}),
      ...(imageSrc ? { image_src: imageSrc } : {}),
    });

    if (!updated) {
      return err(404, "Entry not found");
    }

    return ok(updated);
  }

  async deleteEntry({
    userId,
    id,
  }: EntryInput): Promise<Result<{ message: string }>> {
    const deleted = await libraryModel.delete(id, userId);

    if (!deleted) {
      return err(404, "Entry not found");
    }

    logger.info(`Deleting library entry dir for user ${userId}, entry ${id}`);
    await deleteLibraryEntryDir(userId, id);

    return ok({ message: "Entry deleted successfully" });
  }

  async exportEntriesToCsv({
    userId,
    ids,
  }: {
    userId: string;
    ids: ExportLibraryEntriesInput["ids"];
  }): Promise<Result<CsvExportResult>> {
    const normalizedIds = normalizeIds(ids);
    const requestedIds = new Set(normalizedIds);
    const userEntries = await libraryModel.getByUser(userId);
    const entries =
      normalizedIds.length === 0
        ? userEntries
        : userEntries.filter((entry) => requestedIds.has(entry.id));

    if (entries.length === 0) {
      return err(404, "Unable to export any entry");
    }

    const tagsByEntryId = await libraryModel.getTagsByEntryIds(
      userId,
      entries.map((entry) => entry.id)
    );
    const headerRow = CSV_HEADERS.join(",");
    const dataRows = entries.map((entry) => {
      const row = toCsvRow(entry, tagsByEntryId.get(entry.id));
      return CSV_HEADERS.map((header) => toCsvValue(row[header])).join(",");
    });

    return ok({
      csv: [headerRow, ...dataRows].join("\n"),
    });
  }

  async importEntriesFromCsv({
    userId,
    csvBuffer,
  }: {
    userId: string;
    csvBuffer?: Buffer;
  }): Promise<Result<CsvImportResult>> {
    if (!csvBuffer) {
      return err(400, "CSV file is required");
    }

    return this.importEntriesFromCsvContent({
      userId,
      raw: csvBuffer.toString("utf-8"),
    });
  }

  async exportEntriesToBundle({
    userId,
    ids,
  }: {
    userId: string;
    ids: ExportLibraryEntriesInput["ids"];
  }): Promise<Result<BundleExportResult>> {
    const csvResult = await this.exportEntriesToCsv({ userId, ids });
    if (!csvResult.ok) {
      return csvResult;
    }

    const normalizedIds = normalizeIds(ids);
    const requestedIds = new Set(normalizedIds);
    const userEntries = await libraryModel.getByUser(userId);
    const entries =
      normalizedIds.length === 0
        ? userEntries
        : userEntries.filter((entry) => requestedIds.has(entry.id));
    const warnings: ImportWarning[] = [];
    const files: Record<string, Uint8Array> = {
      [BUNDLE_CSV_FILE]: strToU8(csvResult.data.csv),
    };

    for (const entry of entries) {
      if (!entry.image_src || isRemoteImageSrc(entry.image_src)) {
        continue;
      }

      const bundlePath = imageSrcToBundlePath(entry.image_src);
      const localPath = imageSrcToLocalPath(entry.image_src);
      if (!bundlePath || !localPath) {
        warnings.push({
          entryId: entry.id,
          entryTitle: entry.title ?? undefined,
          field: "image_src",
          message: `Referenced local image ${entry.image_src} could not be resolved and was not included.`,
        });
        continue;
      }

      try {
        files[bundlePath] = await fs.readFile(localPath);
      } catch (error) {
        warnings.push({
          entryId: entry.id,
          entryTitle: entry.title ?? undefined,
          field: "image_src",
          message: `Referenced local image ${entry.image_src} was missing and was not included.`,
        });
        logger.warn({ error }, "Skipping missing bundle export image");
      }
    }

    if (warnings.length > 0) {
      files[BUNDLE_WARNINGS_FILE] = strToU8(
        JSON.stringify({ warnings }, null, 2)
      );
    }

    return ok({
      buffer: Buffer.from(zipSync(files, { level: 6 })),
    });
  }

  async importEntriesFromBundle({
    userId,
    bundleBuffer,
  }: {
    userId: string;
    bundleBuffer?: Buffer;
  }): Promise<Result<CsvImportResult>> {
    if (!bundleBuffer) {
      return err(400, "Bundle file is required");
    }

    const filesResult = readBundleFiles(bundleBuffer);
    if (!filesResult.ok) return filesResult;

    const files = filesResult.data;
    const csvFile = files[BUNDLE_CSV_FILE];
    if (!csvFile) {
      return err(400, "Bundle file must include library.csv");
    }

    return this.importEntriesFromCsvContent({
      userId,
      raw: strFromU8(csvFile),
      bundleFiles: files,
    });
  }

  private async importEntriesFromCsvContent({
    userId,
    raw,
    bundleFiles,
  }: {
    userId: string;
    raw: string;
    bundleFiles?: Record<string, Uint8Array>;
  }): Promise<Result<CsvImportResult>> {
    const normalizedRaw = raw.replace(/^\uFEFF/, "").trim();

    if (!normalizedRaw) {
      return err(400, "CSV file is empty");
    }

    const lines = normalizedRaw
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return err(400, "CSV file must include header and at least one row");
    }

    const headerLine = lines[0];
    if (!headerLine) {
      return err(400, "CSV header row is missing");
    }
    if (!hasBalancedCsvQuotes(headerLine)) {
      return err(400, "CSV header row contains unclosed quotes");
    }

    const headers = parseCsvLine(headerLine);
    const missingHeaders = REQUIRED_CSV_HEADERS.filter(
      (header) => !headers.includes(header)
    );
    if (missingHeaders.length > 0) {
      return err(400, `Missing CSV headers: ${missingHeaders.join(", ")}`);
    }

    const createdEntries: LibraryEntry[] = [];
    const warnings: ImportWarning[] = [];
    let skippedCount = 0;

    for (let i = 1; i < lines.length; i += 1) {
      const rowNumber = i + 1;
      const currentLine = lines[i];
      if (!currentLine) {
        continue;
      }
      if (!hasBalancedCsvQuotes(currentLine)) {
        skippedCount += 1;
        continue;
      }

      const values = parseCsvLine(currentLine);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      const parsed = createLibraryEntrySchema.safeParse({
        title: row.title,
        media_id: row.media_id || undefined,
        source_id: row.source_id || undefined,
        media_type: row.media_type || undefined,
        status: row.status || undefined,
        adult: row.adult ?? "",
        released_at: row.released_at || undefined,
        public_rating: row.public_rating ?? "",
        personal_rating: row.personal_rating ?? "",
      });
      if (!parsed.success) {
        skippedCount += 1;
        continue;
      }

      try {
        const entryId = crypto.randomUUID();
        const imageSrc = row.image_src || undefined;
        const shouldImportBundledImage = imageSrc && isLocalImageSrc(imageSrc);
        const initialImageSrc =
          imageSrc && !shouldImportBundledImage ? imageSrc : undefined;
        const sourceId = await this.resolveSourceIdForUser({
          userId,
          requestedSourceId: parsed.data.source_id,
          mediaType: parsed.data.media_type,
        });

        const created = await libraryModel.create({
          id: entryId,
          user_id: userId,
          title: parsed.data.title,
          media_id: parsed.data.media_id,
          source_id: sourceId,
          media_type: parsed.data.media_type,
          status: parsed.data.status,
          adult: parsed.data.adult,
          released_at: parsed.data.released_at,
          image_src: initialImageSrc,
          public_rating: parsed.data.public_rating,
          personal_rating: parsed.data.personal_rating,
        });

        let finalEntry = created;

        if (shouldImportBundledImage && imageSrc) {
          const bundlePath = imageSrcToBundlePath(imageSrc);
          const imageFile = bundlePath ? bundleFiles?.[bundlePath] : undefined;

          if (!bundleFiles) {
            warnings.push({
              row: rowNumber,
              entryId: created.id,
              entryTitle: created.title ?? undefined,
              field: "image_src",
              message: `Referenced local image ${imageSrc} requires missing files.`,
            });
          } else if (!bundlePath || !imageFile) {
            warnings.push({
              row: rowNumber,
              entryId: created.id,
              entryTitle: created.title ?? undefined,
              field: "image_src",
              message: `Referenced local image ${imageSrc} was missing from the bundle and was not imported.`,
            });
          } else {
            try {
              const imagePaths = await processAndSaveImage(
                Buffer.from(imageFile),
                userId,
                created.id
              );
              finalEntry =
                (await libraryModel.update(created.id, userId, {
                  image_src: imagePaths.original,
                })) ?? created;
            } catch (error) {
              warnings.push({
                row: rowNumber,
                entryId: created.id,
                entryTitle: created.title ?? undefined,
                field: "image_src",
                message: `Referenced local image ${imageSrc} could not be processed and was not imported.`,
              });
              logger.warn({ error }, "Skipping invalid bundle import image");
            }
          }
        }

        const tags: Array<{ value: string; weight: LibraryTagWeight }> = [
          ...unescapeTagCell(row.major_tags ?? "").map((value) => ({
            value,
            weight: "major" as const,
          })),
          ...unescapeTagCell(row.minor_tags ?? "").map((value) => ({
            value,
            weight: "minor" as const,
          })),
        ];

        for (const tag of tags) {
          try {
            const savedTag = await libraryModel.findOrCreateTag({
              userId,
              value: tag.value,
              weight: tag.weight,
            });
            await libraryModel.linkTag(created.id, savedTag.id);
          } catch (error) {
            warnings.push({
              row: rowNumber,
              entryId: created.id,
              entryTitle: created.title ?? undefined,
              field: "tags",
              message: `Entry was created, but tag "${tag.value}" could not be linked.`,
            });
            logger.warn({ error }, "Skipping library CSV tag link failure");
          }
        }

        createdEntries.push(finalEntry);
      } catch (error) {
        skippedCount += 1;
        logger.warn({ error }, "Skipping invalid library CSV row");
      }
    }

    return ok({
      importedCount: createdEntries.length,
      skippedCount,
      entries: createdEntries,
      warnings,
    });
  }

  private async resolveSourceIdForUser({
    userId,
    requestedSourceId,
    mediaType,
  }: {
    userId: string;
    requestedSourceId?: string;
    mediaType?: EntryMediaType;
  }) {
    if (requestedSourceId) {
      const sourceIntegration = await sourceIntegrationModel.getByIdForUser(
        requestedSourceId,
        userId
      );
      if (sourceIntegration) {
        return sourceIntegration.id;
      }
    }

    if (!mediaType) {
      return null;
    }

    const sourceType = SOURCE_TYPE_BY_MEDIA_TYPE[mediaType];
    if (!sourceType) {
      return null;
    }

    return (
      (await sourceIntegrationModel.getByUserAndType(userId, sourceType))?.id ??
      null
    );
  }
}

export const libraryService = new LibraryService();
