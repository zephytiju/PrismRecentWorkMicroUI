// Demo screenshot driver: boots the vite dev server on a unique port, drives
// the multi-theme demo in headless Chrome, and captures the language switcher,
// BOTH recent-work instances (GeoVision v9 dark + Lattice Light) and the
// channel monitors at 2x, with the LEFT instance set to en and the RIGHT
// instance set to zh-CN (locale is a per-instance prop, so the shot shows two
// hosts rendering differing locales). It then OPENS a row in the LEFT
// instance: the FileRow owns the "recent-work.opened-file" publication (the
// navigation/open intent), so the monitor shows the published bounded
// IFileEntry payload and — because the opened highlight derives from that same
// shared channel — the matching row highlights in BOTH hosts (one
// dark-highlighted + one light). The demo seeds the recent-work channel with
// the six per-prototype recent files on mount (see sampleRecentFiles in
// src/demo.tsx). Demo-only tooling; not part of the published package.
import { spawn } from "node:child_process";
import { stat, mkdir } from "node:fs/promises";
import path from "node:path";
import puppeteer from "puppeteer-core";

const PORT = 4175;
// vite binds to localhost (IPv6 loopback first on macOS) — poll and navigate
// via localhost, not 127.0.0.1.
const BASE_URL = `http://localhost:${PORT}/`;
const OUT_DIR = "/tmp/guanlan-review";
const OUT_PATH = path.join(OUT_DIR, "demo-recent-work-themes.png");
const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const MIN_BYTES = 20_000;

function startDevServer() {
  const child = spawn("npx", ["vite", "--port", String(PORT), "--strictPort"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  let stderr = "";
  child.stderr.on("data", (chunk) => {
    stderr += String(chunk);
  });
  child.on("exit", (code) => {
    // 143 = SIGTERM from this script's cleanup; anything else is real.
    if (code !== null && code !== 0 && code !== 143) {
      process.stderr.write(`vite exited ${code}:\n${stderr}\n`);
    }
  });
  return child;
}

async function waitForServer(url, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok) {
        return;
      }
    } catch {
      // not up yet
    }
    if (Date.now() > deadline) {
      throw new Error(`dev server at ${url} did not become ready in ${timeoutMs}ms`);
    }
    await new Promise((resolve) => {
      setTimeout(resolve, 250);
    });
  }
}

/** Clicks the option ("EN" / "中文") of a Mantine SegmentedControl by testid. */
async function clickSegmentedOption(page, rootSelector, optionText) {
  const clicked = await page.evaluate(
    ({ rootSelector, optionText }) => {
      const root = document.querySelector(rootSelector);
      if (root === null) {
        return false;
      }
      const label = Array.from(root.querySelectorAll("label")).find(
        (candidate) => candidate.textContent?.trim() === optionText,
      );
      if (label === undefined) {
        return false;
      }
      label.click();
      return true;
    },
    { rootSelector, optionText },
  );
  if (!clicked) {
    throw new Error(`segmented option "${optionText}" not found in ${rootSelector}`);
  }
}

const server = startDevServer();
let browser;
try {
  await waitForServer(BASE_URL, 30_000);
  browser = await puppeteer.launch({ executablePath: CHROME, headless: "new" });
  const page = await browser.newPage();
  await page.setViewport({ width: 1480, height: 1080, deviceScaleFactor: 2 });
  await page.goto(BASE_URL, { waitUntil: "networkidle0" });

  // Locale is a per-instance prop: LEFT (GeoVision) stays en, RIGHT (Lattice
  // Light) switches to zh-CN — both set through the per-instance controls so
  // the shot shows the two hosts rendering differing locales while the GLOBAL
  // switcher stays visible above.
  await page.waitForSelector('[data-testid="demo-locale-switcher"]');
  await clickSegmentedOption(page, '[data-testid="demo-instance-locale-a"]', "EN");
  await clickSegmentedOption(page, '[data-testid="demo-instance-locale-b"]', "中文");

  // The demo seeds the six per-prototype recent files on mount; wait for BOTH
  // instances to render the section header + every row, and for the RIGHT
  // (zh-CN) instance to show its localized section header.
  await page.waitForSelector('[data-testid="demo-locale-stage"]');
  await page.waitForFunction(() => {
    return document.querySelectorAll('[data-testid="recent-work-section-title"]').length === 2;
  });
  await page.waitForFunction(() => {
    return document.querySelectorAll('[data-testid="recent-work-row-f-001"]').length === 2;
  });
  await page.waitForFunction(() => {
    return document.querySelectorAll('[data-testid="recent-work-row-f-006"]').length === 2;
  });
  await page.waitForFunction(() => {
    const headers = document.querySelectorAll('[data-testid="recent-work-section-title"]');
    return (
      headers.length === 2 &&
      Array.from(headers).some((node) => (node.textContent ?? "") === "最近工作")
    );
  });

  // Open the first recent row ("Redwater Corridor Brief", a dossier) in the
  // LEFT (GeoVision dark) instance. The FileRow owns the
  // "recent-work.opened-file" binding, so this one click publishes the open
  // intent (monitor readout) and highlights the matching row in BOTH
  // instances — dark-highlighted left, light-highlighted right — via the
  // shared channel.
  await page.click('[data-testid="demo-recent-panel-a"] [data-testid="recent-work-row-f-001"]');
  await page.waitForFunction(() => {
    const monitor = document.querySelector('[data-testid="demo-opened-file"]');
    return (
      monitor !== null &&
      (monitor.textContent ?? "").includes("Redwater Corridor Brief") &&
      (monitor.textContent ?? "").includes("IFileEntry")
    );
  });
  await page.waitForFunction(() => {
    const rows = document.querySelectorAll('[data-testid="recent-work-row-f-001"]');
    return (
      rows.length === 2 &&
      Array.from(rows).every((node) => (node.getAttribute("style") ?? "").includes("box-shadow"))
    );
  });
  await new Promise((resolve) => {
    setTimeout(resolve, 400);
  });

  // Capture the full demo page: both instances with the opened row and the
  // channel monitors showing the published open-intent payload.
  await mkdir(OUT_DIR, { recursive: true });
  const pageRoot = await page.waitForSelector('[data-testid="demo-page"]');
  await pageRoot.screenshot({ path: OUT_PATH });
  const { size } = await stat(OUT_PATH);
  if (size < MIN_BYTES) {
    throw new Error(`screenshot ${OUT_PATH} is suspiciously small (${size} bytes)`);
  }
  console.log(`saved ${OUT_PATH} (${size} bytes)`);
} finally {
  if (browser !== undefined) {
    await browser.close().catch(() => undefined);
  }
  server.kill("SIGTERM");
}
