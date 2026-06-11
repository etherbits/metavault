export async function saveJsonFile(filename: string, data: unknown) {
  const payload = JSON.stringify(data, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  await saveBlobFile(filename, blob, {
    description: "JSON",
    accept: {
      "application/json": [".json"],
    },
  });
}

export async function saveBlobFile(
  filename: string,
  blob: Blob,
  type?: {
    description?: string;
    accept: Record<string, string[]>;
  }
) {
  const picker = (
    window as Window & {
      showSaveFilePicker?: (options: {
        suggestedName?: string;
        types?: Array<{
          description?: string;
          accept: Record<string, string[]>;
        }>;
      }) => Promise<{
        createWritable: () => Promise<{
          write: (data: Blob) => Promise<void>;
          close: () => Promise<void>;
        }>;
      }>;
    }
  ).showSaveFilePicker;

  if (picker) {
    const handle = await picker({
      suggestedName: filename,
      types: type ? [type] : undefined,
    });
    const writable = await handle.createWritable();
    await writable.write(blob);
    await writable.close();
    return;
  }

  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function pickJsonFile(onLoad: (raw: unknown) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".json,application/json";
  input.onchange = async () => {
    const file = input.files?.[0];
    if (!file) return;

    const text = await file.text();
    onLoad(JSON.parse(text));
  };
  input.click();
}

export function pickZipFile(onLoad: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = ".zip,application/zip";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    onLoad(file);
  };
  input.click();
}

export function pickImageFile(onLoad: (file: File) => void) {
  const input = document.createElement("input");
  input.type = "file";
  input.accept = "image/png,image/jpeg,image/webp,image/gif";
  input.onchange = () => {
    const file = input.files?.[0];
    if (!file) return;

    onLoad(file);
  };
  input.click();
}
