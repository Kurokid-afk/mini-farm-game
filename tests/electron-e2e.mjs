import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { _electron as electron } from "playwright";

const root = fileURLToPath(new URL("../", import.meta.url));
const output = path.join(root, "output", "electron");
fs.mkdirSync(output, { recursive: true });
const profile = path.resolve(output, "profile");
assert.equal(path.dirname(profile), path.resolve(output));
fs.rmSync(profile, { recursive: true, force: true });
fs.mkdirSync(profile, { recursive: true });

const app = await electron.launch({
  executablePath: path.join(root, "node_modules", "electron", "dist", "electron.exe"),
  args: ["."],
  cwd: root,
  env: {
    ...process.env,
    UU_TEST_USER_DATA_DIR: profile
  }
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

await page.evaluate(() => {
  const state = window.__uuHarvest.getState();
  state.view = "match3";
  state.session = {
    version: 1,
    puzzleMode: "merge",
    merge: {
      board: [
        [11, 4, null, null],
        [3, 2, null, null],
        [null, null, null, null],
        [null, null, null, null]
      ],
      score: 8192,
      maxValue: 11
    }
  };
  localStorage.setItem("uu-harvest-collection-v1", JSON.stringify(state));
});
await page.reload();
await page.waitForFunction(() => Boolean(window.__uuHarvest));
const migratedMerge = await page.evaluate(() => window.__uuHarvest.app.merge);
assert.equal(migratedMerge.score, 0);
assert.equal(migratedMerge.board.flat().filter((value) => value != null).length, 2);
assert.ok(migratedMerge.board.flat().filter((value) => value != null).every((value) => value === 1 || value === 2));

const sessionSetup = await page.evaluate(() => {
  const game = window.__uuHarvest.app;
  game.switchView("match3");
  game.puzzleMode = "merge";
  game.ensureMiniGame("link");
  game.ensureMiniGame("match3");
  game.merge.board = [
    [6, 4, null, null],
    [3, 2, null, null],
    [null, null, null, null],
    [null, null, null, null]
  ];
  game.merge.score = 2048;
  game.merge.maxValue = 6;
  game.merge.gameOver = false;
  game.merge.rewardClaimed = false;
  const removedLinkValue = game.link.board[0][0];
  game.link.board[0][0] = null;
  game.link.score = 2340;
  game.match3.score = 4560;
  game.state.plots[0].crop = {
    cropId: "radish",
    plantedAt: game.now() - 1_000,
    finishAt: game.now() + 60_000,
    watered: true,
    fertilized: true,
    rotationBonus: false
  };
  game.save(true);
  return { removedLinkValue };
});
const persistedSession = await page.evaluate(() => JSON.parse(localStorage.getItem("uu-harvest-collection-v1")).session);
assert.equal(persistedSession.version, 2);
assert.equal(persistedSession.merge.ruleVersion, 2);
assert.equal(persistedSession.merge.board[0][0], 6);
assert.equal(persistedSession.link.board.flat().filter((value) => value != null).length, 39);
await page.reload();
await page.waitForFunction(() => Boolean(window.__uuHarvest));
const restored = await page.evaluate(() => {
  const game = window.__uuHarvest.app;
  return {
    hasLink: Boolean(game.link),
    hasMatch: Boolean(game.match3),
    hasMerge: Boolean(game.merge),
    view: game.state.view,
    puzzleMode: game.puzzleMode,
    mergeBoard: game.merge?.board,
    mergeScore: game.merge?.score,
    linkCell: game.link?.board[0][0],
    linkRemaining: game.link?.board.flat().filter((value) => value != null).length,
    linkCounts: Array.from({ length: 10 }, (_, value) => game.link?.board.flat().filter((cell) => cell === value).length),
    linkScore: game.link?.score,
    matchScore: game.match3?.score,
    plot: game.state.plots[0]
  };
});
assert.equal(restored.hasLink, true);
assert.equal(restored.hasMatch, true);
assert.equal(restored.hasMerge, true);
assert.equal(restored.view, "match3");
assert.equal(restored.puzzleMode, "merge");
assert.equal(restored.mergeBoard[0][0], 6);
assert.equal(restored.mergeScore, 2048);
assert.equal(restored.linkCell, sessionSetup.removedLinkValue);
assert.equal(restored.linkRemaining, 40);
assert.ok(restored.linkCounts.every((count) => count % 2 === 0));
assert.equal(restored.linkScore, 2340);
assert.equal(restored.matchScore, 4560);
assert.equal(restored.plot.crop.cropId, "radish");
assert.equal(restored.plot.crop.watered, true);
assert.equal(restored.plot.crop.fertilized, true);

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
console.log("desktop topmost, resize, tray minimize, and full session restore passed");
