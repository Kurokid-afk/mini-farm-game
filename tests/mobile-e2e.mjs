import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "output", "mobile");
const url = "http://127.0.0.1:4175/?mobile=1";
fs.mkdirSync(output, { recursive: true });

let devServer = null;
try {
  const response = await fetch(url);
  if (!response.ok) throw new Error("server unavailable");
} catch {
  devServer = spawn(
    process.execPath,
    [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", "4175"],
    { cwd: root, windowsHide: true, stdio: "ignore" }
  );
  for (let attempt = 0; attempt < 50; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const response = await fetch(url);
      if (response.ok) break;
    } catch {
      if (attempt === 49) throw new Error("mobile preview server did not start");
    }
  }
}
process.on("exit", () => devServer?.kill());

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
});
const page = await browser.newPage({ viewport: { width: 400, height: 640 }, deviceScaleFactor: 1 });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));
await page.goto(url);
await page.waitForFunction(() => Boolean(window.__uuHarvest));
await page.evaluate(() => window.__uuHarvest.reset());

async function tap(x, y) {
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(box.x + x / 640 * box.width, box.y + y / 960 * box.height);
  await page.waitForTimeout(100);
}

async function shot(name) {
  await page.locator("canvas").screenshot({ path: path.join(output, name) });
}

let textState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(textState.layout, "mobile-portrait");
assert.equal(textState.coordinateSystem.startsWith("640x960"), true);
await shot("01-farm.png");

await tap(100, 280);
assert.equal(await page.evaluate(() => window.__uuHarvest.getState().plots[0].crop?.cropId), "radish");
await tap(190, 638);
await tap(100, 280);
assert.equal(await page.evaluate(() => window.__uuHarvest.getState().plots[0].crop?.watered), true);
await shot("02-farm-water.png");

await page.evaluate(() => {
  const state = window.__uuHarvest.getState();
  state.coins = 25_000;
  state.level = 5;
  state.produce.radish = 8;
  state.qualityStock.radish = 8;
  window.__uuHarvest.setView("market");
});
await shot("03-market-growth.png");
await tap(374, 527);
assert.equal(await page.evaluate(() => window.__uuHarvest.app.mobileMarketPage), 1);
await shot("04-market-growth-page2.png");
await tap(320, 171);
await shot("05-market-automation.png");
await tap(532, 591);
assert.equal(await page.evaluate(() => window.__uuHarvest.getState().petGarden.unlocked), true);
await tap(552, 591);
assert.equal(await page.evaluate(() => window.__uuHarvest.getState().view), "pets");
await shot("06-pet-shop-before-adoption.png");
assert.equal(
  await page.evaluate(() => [...window.__uuHarvest.app.hits].reverse().find((entry) => (
    564 >= entry.x && 564 <= entry.x + entry.w && 686 >= entry.y && 686 <= entry.y + entry.h
  ))?.type),
  "pet-buy"
);
await tap(564, 686);
assert.equal(await page.evaluate(() => window.__uuHarvest.getState().petGarden.pets.dog.owned), true);
await shot("06-pet-garden.png");

await page.evaluate(() => window.__uuHarvest.setView("link"));
await shot("07-link.png");
await tap(54, 280);

await page.evaluate(() => {
  window.__uuHarvest.app.puzzleMode = "match3";
  window.__uuHarvest.setView("match3");
});
await shot("09-match3.png");
await tap(47 + 39, 264 + 39);
await tap(47 + 78 + 39, 264 + 39);
await page.waitForTimeout(220);
await shot("10-match3-animation.png");

await tap(472, 171);
assert.equal(JSON.parse(await page.evaluate(() => window.render_game_to_text())).match3.mode, "merge");
await shot("11-merge.png");
await page.mouse.move(110, 330);
await page.mouse.down();
await page.mouse.move(285, 330, { steps: 6 });
await page.mouse.up();
await page.waitForTimeout(180);
await shot("12-merge-swipe.png");

assert.deepEqual(errors, []);
await browser.close();
devServer?.kill();
console.log("portrait farm, market, pets, minigames, touch targets, and swipe controls passed");
