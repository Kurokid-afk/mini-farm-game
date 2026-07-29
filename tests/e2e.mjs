import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "output", "e2e");
fs.mkdirSync(output, { recursive: true });

let devServer = null;
try {
  const response = await fetch("http://127.0.0.1:4173");
  if (!response.ok) throw new Error("Preview server unavailable");
} catch {
  devServer = spawn(
    process.execPath,
    [path.join(root, "node_modules", "vite", "bin", "vite.js"), "--host", "127.0.0.1", "--port", "4173"],
    { cwd: root, windowsHide: true, stdio: "ignore" }
  );
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    try {
      const response = await fetch("http://127.0.0.1:4173");
      if (response.ok) break;
    } catch {
      if (attempt === 39) throw new Error("Vite preview server did not start");
    }
  }
}
process.on("exit", () => devServer?.kill());

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe"
});
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const errors = [];
page.on("console", (message) => {
  if (message.type() === "error") errors.push(message.text());
});
page.on("pageerror", (error) => errors.push(String(error)));

await page.goto("http://127.0.0.1:4173");
await page.waitForFunction(() => Boolean(window.__uuHarvest));
await page.evaluate(() => window.__uuHarvest.reset());

async function clickLogical(x, y) {
  const box = await page.locator("canvas").boundingBox();
  await page.mouse.click(box.x + x / 960 * box.width, box.y + y / 640 * box.height);
  await page.waitForTimeout(80);
}

async function screenshot(name) {
  await page.screenshot({ path: path.join(output, name) });
}

await screenshot("01-farm-start.png");
await clickLogical(88, 279);
let state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.plots[0].crop.cropId, "radish");
await clickLogical(194, 562);
await clickLogical(88, 279);
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.plots[0].crop.watered, true);
await page.evaluate(() => window.__uuHarvest.forceMature());
await clickLogical(88, 279);
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.produce.radish, 1);
assert.ok(state.sun > 3);

await page.evaluate(() => {
  window.__uuHarvest.getState().coins = 10_000;
});
await clickLogical(854, 105);
await clickLogical(350, 419);
await clickLogical(270, 419);
await clickLogical(242, 279);
await clickLogical(854, 105);
await clickLogical(555, 419);
await clickLogical(475, 419);
await clickLogical(242, 279);
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.deepEqual(state.automationSlots.sprinkler, [1]);
assert.deepEqual(state.automationSlots.harvester, [1]);

await clickLogical(734, 183);
await clickLogical(242, 279);
await page.waitForTimeout(550);
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.plots[1].crop.watered, true);
assert.ok(await page.evaluate(() => window.__uuHarvest.app.robotJobs.some((job) => job.type === "sprinkler")));
await screenshot("02-water-robot-working.png");

await page.evaluate(() => {
  window.__uuHarvest.forceMature();
  window.__uuHarvest.app.scanAutomation(true);
  window.advanceTime(1700);
});
await screenshot("03-harvest-robot-working.png");
await page.evaluate(() => window.advanceTime(1200));
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.plots[1].crop, null);
assert.ok(state.produce.radish >= 2);

await clickLogical(88, 279);
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.plots[0].crop.watered, false);
await clickLogical(854, 105);
await clickLogical(270, 419);
await clickLogical(242, 279);
await clickLogical(88, 279);
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.equal(state.plots[0].crop.watered, true);
assert.ok(await page.evaluate(() => window.__uuHarvest.app.robotJobs.some((job) => job.type === "sprinkler" && job.plotIndex === 0)));
await clickLogical(88, 279);
assert.equal(await page.evaluate(() => window.__uuHarvest.app.robotJobs.some((job) => job.type === "sprinkler" && job.plotIndex === 0)), false);
await clickLogical(88, 279);

await page.evaluate(() => window.__uuHarvest.setView("link"));
await screenshot("04-link.png");
const linkSecondsBeforePause = JSON.parse(await page.evaluate(() => window.render_game_to_text())).link.seconds;
await page.evaluate(() => {
  window.__uuHarvest.setView("farm");
  window.advanceTime(5000);
  window.__uuHarvest.setView("link");
});
const linkSecondsAfterPause = JSON.parse(await page.evaluate(() => window.render_game_to_text())).link.seconds;
assert.ok(Math.abs(linkSecondsAfterPause - linkSecondsBeforePause) <= 1);
const linkMove = await page.evaluate(() => window.__uuHarvest.app.findLinkMove());
assert.ok(linkMove);
for (const cell of linkMove) await clickLogical(185 + cell.col * 74 + 33, 224 + cell.row * 66 + 28);
let textState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(textState.link.remaining, 38);
assert.ok(textState.link.score > 0);
assert.equal(textState.link.animating, true);
await screenshot("04b-link-clear-animation.png");
await page.evaluate(() => window.advanceTime(180));
await screenshot("04c-link-particles-animation.png");
await page.evaluate(() => window.advanceTime(260));

await page.evaluate(() => window.__uuHarvest.setView("zuma"));
await clickLogical(480, 300);
await page.waitForTimeout(100);
const zumaActivity = await page.evaluate(() => {
  const zuma = window.__uuHarvest.app.zuma;
  return { projectiles: zuma.projectiles.length, score: zuma.score, balls: zuma.balls.length };
});
assert.ok(zumaActivity.projectiles > 0 || zumaActivity.score > 0 || zumaActivity.balls !== 18);
await screenshot("05-zuma.png");

const gapBefore = await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  app.zuma.balls = [
    { color: 0, p: 0.634 },
    { color: 0, p: 0.6 },
    { color: 1, p: 0.566 },
    { color: 1, p: 0.532 },
    { color: 1, p: 0.498 },
    { color: 0, p: 0.464 },
    { color: 2, p: 0.43 }
  ];
  app.zuma.projectiles = [];
  app.zuma.spawned = 7;
  app.zuma.target = 7;
  app.resolveZumaMatches(3);
  const gap = app.zuma.gap;
  return app.zuma.balls[gap.frontEnd].p - app.zuma.balls[gap.tailStart].p - 0.034;
});
assert.ok(gapBefore > 0.09);
await page.evaluate(() => window.advanceTime(450));
const gapAfter = await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  const gap = app.zuma.gap;
  return gap ? app.zuma.balls[gap.frontEnd].p - app.zuma.balls[gap.tailStart].p - 0.034 : 0;
});
assert.ok(gapAfter < gapBefore);
await page.evaluate(() => window.advanceTime(600));
const chainAfterRollback = await page.evaluate(() => ({
  colors: window.__uuHarvest.app.zuma.balls.map((ball) => ball.color),
  gap: window.__uuHarvest.app.zuma.gap
}));
assert.deepEqual(chainAfterRollback.colors, [2]);
assert.equal(chainAfterRollback.gap, null);
await screenshot("05b-zuma-rollback-chain.png");

await page.evaluate(() => window.__uuHarvest.setView("match3"));
const invalidSwap = await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  const board = app.match3.board;
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const otherRow = row + dr;
        const otherCol = col + dc;
        if (otherRow >= 7 || otherCol >= 7) continue;
        [board[row][col], board[otherRow][otherCol]] = [board[otherRow][otherCol], board[row][col]];
        const valid = app.findMatches(board).size > 0;
        [board[row][col], board[otherRow][otherCol]] = [board[otherRow][otherCol], board[row][col]];
        if (!valid) return [{ row, col }, { row: otherRow, col: otherCol }];
      }
    }
  }
  return null;
});
assert.ok(invalidSwap);
for (const cell of invalidSwap) await clickLogical(250 + cell.col * 54 + 27, 223 + cell.row * 54 + 27);
textState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(textState.match3.moves, 20);
assert.equal(textState.match3.animation, "invalid");
await page.evaluate(() => window.advanceTime(100));
await screenshot("06a-match3-invalid-bounce.png");
await page.evaluate(() => window.advanceTime(300));

const swap = await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  const board = app.match3.board;
  for (let row = 0; row < 7; row += 1) {
    for (let col = 0; col < 7; col += 1) {
      for (const [dr, dc] of [[0, 1], [1, 0]]) {
        const otherRow = row + dr;
        const otherCol = col + dc;
        if (otherRow >= 7 || otherCol >= 7) continue;
        [board[row][col], board[otherRow][otherCol]] = [board[otherRow][otherCol], board[row][col]];
        const valid = app.findMatches(board).size > 0;
        [board[row][col], board[otherRow][otherCol]] = [board[otherRow][otherCol], board[row][col]];
        if (valid) return [{ row, col }, { row: otherRow, col: otherCol }];
      }
    }
  }
  return null;
});
assert.ok(swap);
for (const cell of swap) await clickLogical(250 + cell.col * 54 + 27, 223 + cell.row * 54 + 27);
textState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(textState.match3.moves, 19);
assert.ok(textState.match3.score > 0);
assert.ok(await page.evaluate(() => Boolean(window.__uuHarvest.app.findValidMatchSwap(window.__uuHarvest.app.match3.board))));
assert.equal(textState.match3.animation, "swap");
await screenshot("06b-match3-swap-animation.png");
await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  const segment = app.match3.animation.segments.find((entry) => entry.type === "pop");
  window.advanceTime(Math.max(0, segment.startedAt + segment.duration / 2 - app.now()));
});
textState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(textState.match3.animation, "pop");
await screenshot("06c-match3-pop-animation.png");
await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  const segment = app.match3.animation.segments.find((entry) => entry.type === "fall");
  window.advanceTime(Math.max(0, segment.startedAt + segment.duration / 2 - app.now()));
});
textState = JSON.parse(await page.evaluate(() => window.render_game_to_text()));
assert.equal(textState.match3.animation, "fall");
await screenshot("06d-match3-fall-animation.png");
await page.evaluate(() => {
  const app = window.__uuHarvest.app;
  window.advanceTime(Math.max(0, app.match3.lockedUntil - app.now()) + 40);
});
await screenshot("06e-match3-settled.png");

await page.evaluate(() => {
  const state = window.__uuHarvest.getState();
  state.festival = { link: false, zuma: false, match3: false };
  window.__uuHarvest.completeMini("link", 1000);
  window.__uuHarvest.completeMini("zuma", 1000);
  window.__uuHarvest.completeMini("match3", 1300);
});
state = await page.evaluate(() => window.__uuHarvest.getState());
assert.ok(state.stars >= 1);
assert.deepEqual(state.festival, { link: false, zuma: false, match3: false });

await page.evaluate(() => window.__uuHarvest.setView("market"));
await screenshot("07-market.png");
await page.setViewportSize({ width: 760, height: 560 });
await page.evaluate(() => window.__uuHarvest.setView("farm"));
await page.waitForTimeout(120);
await screenshot("08-small-window.png");
const canvas = await page.locator("canvas").boundingBox();
assert.ok(canvas.width >= 750);
assert.ok(canvas.height >= 500);
assert.deepEqual(errors, []);

await browser.close();
devServer?.kill();
console.log("farm, animated robots, link, zuma, match3, festival, and responsive UI passed");
