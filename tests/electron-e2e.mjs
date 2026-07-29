import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "output", "electron");
fs.mkdirSync(output, { recursive: true });

const app = await electron.launch({
  executablePath: path.join(root, "node_modules", "electron", "dist", "electron.exe"),
  args: ["."],
  cwd: root
});

const page = await app.firstWindow();
await page.waitForLoadState("domcontentloaded");
await page.waitForFunction(() => Boolean(window.__uuHarvest));
await page.evaluate(() => window.__uuHarvest.reset());
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.screenshot({ path: path.join(output, "01-window.png") });
await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  app.state.alwaysOnTop = true;
  app.save(true);
});
await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setAlwaysOnTop(false, "normal"));
await page.reload();
await page.waitForFunction(() => Boolean(window.__uuHarvest));
await page.waitForTimeout(250);
const topmost = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isAlwaysOnTop());
assert.equal(topmost, true);

await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].setSize(760, 560));
await page.waitForTimeout(150);
await page.screenshot({ path: path.join(output, "02-small-window.png") });
const canvas = await page.locator("canvas").boundingBox();
assert.ok(canvas.width >= 700);
assert.ok(canvas.height >= 470);

await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].minimize());
await page.waitForTimeout(150);
const visible = await app.evaluate(({ BrowserWindow }) => BrowserWindow.getAllWindows()[0].isVisible());
assert.equal(visible, false);
assert.deepEqual(errors, []);
await app.evaluate(({ app }) => app.quit());
console.log("desktop topmost, resize, and tray minimize passed");
