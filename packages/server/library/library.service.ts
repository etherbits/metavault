import { logger } from "../logger";
import { processAndSaveImage } from "../storage/image.service";
import { deleteLibraryEntryDir } from "../storage/storage.service";
import { err, ok, type Result } from "../utils/result";
import type { LibraryEntry } from "./library.model";
import { libraryModel } from "./library.model";
import type {
  CreateLibraryEntryInput,
  ExportLibraryEntriesInput,
  UpdateLibraryEntryInput,
} from "./library.schema";

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
  image_src: null;
  public_rating: number | null;
  personal_rating: number | null;
};

const CSV_HEADERS: (keyof CsvLibraryRow)[] = [
  "title",
  "media_id",
  "source_id",
  "media_type",
  "status",
  "image_src",
  "public_rating",
  "personal_rating",
];

function escapeCsvCell(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

function toCsvValue(value: string | number | null): string {
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

function normalizeIds(ids: ExportLibraryEntriesInput["ids"]): string[] {
  return Array.from(new Set(Array.isArray(ids) ? ids : [ids]));
}

function toCsvRow(entry: LibraryEntry): CsvLibraryRow {
  return {
    title: entry.title,
    media_id: entry.media_id,
    source_id: entry.source_id,
    media_type: entry.media_type,
    status: entry.status,
    image_src: null,
    public_rating: entry.public_rating,
    personal_rating: entry.personal_rating,
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
      imagePaths = await processAndSaveImage(imageBuffer, userId, entryId);
    }

    const entry = await libraryModel.create({
      id: entryId,
      user_id: userId,
      title: body.title,
      media_id: body.media_id,
      source_id: body.source_id,
      media_type: body.media_type,
      status: body.status,
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
      const imagePaths = await processAndSaveImage(imageBuffer, userId, id);

      imageSrc = imagePaths.original;
    }

    const updated = await libraryModel.update(id, userId, {
      ...body,
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
  }): Promise<Result<string>> {
    const requestedIds = new Set(normalizeIds(ids));
    const userEntries = await libraryModel.getByUser(userId);
    const entries = userEntries.filter((entry) => requestedIds.has(entry.id));

    if (entries.length === 0) {
      return err(404, "No entries found for the provided ids");
    }

    const headerRow = CSV_HEADERS.join(",");
    const dataRows = entries.map((entry) => {
      const row = toCsvRow(entry);
      return CSV_HEADERS.map((header) => toCsvValue(row[header])).join(",");
    });

    return ok([headerRow, ...dataRows].join("\n"));
  }

  async importEntriesFromCsv({
    userId,
    csvBuffer,
  }: {
    userId: string;
    csvBuffer?: Buffer;
  }): Promise<Result<LibraryEntry[]>> {
    if (!csvBuffer) {
      return err(400, "CSV file is required");
    }

    const raw = csvBuffer
      .toString("utf-8")
      .replace(/^\uFEFF/, "")
      .trim();

    if (!raw) {
      return err(400, "CSV file is empty");
    }

    const lines = raw.split(/\r?\n/).filter((line) => line.trim().length > 0);
    if (lines.length < 2) {
      return err(400, "CSV file must include header and at least one row");
    }

    const headerLine = lines[0];
    if (!headerLine) {
      return err(400, "CSV header row is missing");
    }

    const headers = parseCsvLine(headerLine);
    const missingHeaders = CSV_HEADERS.filter(
      (header) => !headers.includes(header)
    );
    if (missingHeaders.length > 0) {
      return err(400, `Missing CSV headers: ${missingHeaders.join(", ")}`);
    }

    const createdEntries: LibraryEntry[] = [];

    for (let i = 1; i < lines.length; i += 1) {
      const currentLine = lines[i];
      if (!currentLine) {
        continue;
      }

      const values = parseCsvLine(currentLine);
      const row: Record<string, string> = {};

      headers.forEach((header, index) => {
        row[header] = values[index] ?? "";
      });

      const created = await libraryModel.create({
        id: crypto.randomUUID(),
        user_id: userId,
        title: row.title || undefined,
        media_id: row.media_id || undefined,
        source_id: row.source_id || undefined,
        media_type: row.media_type || undefined,
        status: row.status || undefined,
        image_src: undefined,
        public_rating: row.public_rating
          ? Number(row.public_rating)
          : undefined,
        personal_rating: row.personal_rating
          ? Number(row.personal_rating)
          : undefined,
      });

      createdEntries.push(created);
    }

    return ok(createdEntries);
  }
}

export const libraryService = new LibraryService();
