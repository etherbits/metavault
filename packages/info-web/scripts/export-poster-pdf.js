import { mkdir, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const outputPath = path.resolve(process.argv[2] ?? "poster.pdf");
const posterPath = path.resolve("src/poster/index.html");
const debugPort = 9223;
const browserPaths =
  process.platform === "win32"
    ? [
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
        "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe",
      ]
    : ["google-chrome", "chromium", "chromium-browser"];
const browserPath =
  process.env.CHROME_PATH ??
  browserPaths.find((candidate) => existsSync(candidate));

if (!browserPath) {
  throw new Error(
    "Chrome or Edge was not found. Set CHROME_PATH to your browser executable."
  );
}

await mkdir(path.dirname(outputPath), { recursive: true });

const browser = spawn(
  browserPath,
  [
    "--headless=new",
    "--disable-gpu",
    "--disable-background-networking",
    "--no-first-run",
    `--remote-debugging-port=${debugPort}`,
    `--user-data-dir=${path.join(os.tmpdir(), `metavault-poster-${process.pid}`)}`,
    "about:blank",
  ],
  { stdio: "ignore" }
);

try {
  const target = await openPage(pathToFileURL(posterPath).href);
  const client = connect(target.webSocketDebuggerUrl);

  await client.send("Page.enable");
  await client.send("Emulation.setEmulatedMedia", { media: "print" });
  const loaded = client.waitFor("Page.loadEventFired");
  await client.send("Page.navigate", { url: pathToFileURL(posterPath).href });
  await loaded;
  await client.send("Runtime.evaluate", {
    expression: "document.fonts.ready",
    awaitPromise: true,
  });

  const pdf = await client.send("Page.printToPDF", {
    printBackground: true,
    preferCSSPageSize: true,
    paperWidth: 11.6929,
    paperHeight: 16.5354,
    marginTop: 0,
    marginRight: 0,
    marginBottom: 0,
    marginLeft: 0,
  });

  await writeFile(outputPath, Buffer.from(pdf.data, "base64"));
  client.close();
} finally {
  browser.kill();
}

console.log(`Saved ${outputPath}`);

async function openPage(url) {
  for (let attempt = 0; attempt < 50; attempt++) {
    try {
      const response = await fetch(
        `http://127.0.0.1:${debugPort}/json/new?${encodeURIComponent(url)}`,
        {
          method: "PUT",
        }
      );

      if (response.ok) {
        return await response.json();
      }
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  throw new Error("Timed out waiting for the browser.");
}

function connect(url) {
  const socket = new WebSocket(url);
  let nextId = 1;
  const pending = new Map();
  const events = new Map();
  const opened = new Promise((resolve) =>
    socket.addEventListener("open", resolve, { once: true })
  );

  socket.addEventListener("message", ({ data }) => {
    const message = JSON.parse(data);

    if (message.id) {
      const request = pending.get(message.id);
      pending.delete(message.id);
      message.error
        ? request.reject(message.error)
        : request.resolve(message.result);
      return;
    }

    const waiters = events.get(message.method) ?? [];
    events.delete(message.method);
    for (const resolve of waiters) resolve(message.params);
  });

  return {
    close: () => socket.close(),
    async send(method, params = {}) {
      await opened;
      const id = nextId++;

      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        socket.send(JSON.stringify({ id, method, params }));
      });
    },
    waitFor(method) {
      return new Promise((resolve) => {
        events.set(method, [...(events.get(method) ?? []), resolve]);
      });
    },
  };
}
