import Phaser from "phaser";
import cropSheetUrl from "./assets/crops.png?url";
import "./game-core.js";

const Core = window.UUHarvestCore;
const WIDTH = 960;
const HEIGHT = 640;
const SAVE_KEY = "uu-harvest-collection-v1";

const C = {
  ink: "#34464a",
  inkSoft: "#61706f",
  paper: "#fff8d8",
  paper2: "#f3e9bd",
  cream: "#fffdf0",
  green: "#74bf70",
  greenDark: "#3e8456",
  greenSoft: "#b9dda0",
  mint: "#9bd7cf",
  coral: "#ee796b",
  coralDark: "#bd4f4a",
  yellow: "#f3c955",
  yellowSoft: "#f8e7a2",
  sky: "#7dc6d8",
  blue: "#4d93ad",
  soil: "#a86549",
  soilDark: "#75463c",
  white: "#ffffff",
  lock: "#91a391",
  purple: "#9c78b5",
  shadow: "rgba(52,70,74,0.18)"
};

const GAME_NAMES = {
  farm: "农场",
  link: "连连看",
  zuma: "祖玛",
  match3: "消消乐",
  market: "集市"
};

function loadState() {
  try {
    return Core.normalizeState(JSON.parse(localStorage.getItem(SAVE_KEY)));
  } catch {
    return Core.createDefaultState();
  }
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function easeInOut(value) {
  const t = clamp01(value);
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function easeOut(value) {
  return 1 - Math.pow(1 - clamp01(value), 3);
}

class HarvestCollection {
  constructor(scene) {
    this.scene = scene;
    this.state = loadState();
    this.timeOffset = 0;
    this.lastSaveAt = 0;
    this.hits = [];
    this.hover = null;
    this.toast = null;
    this.link = null;
    this.zuma = null;
    this.match3 = null;
    this.robotJobs = [];
    this.lastRobotScan = 0;
    this.frameNow = this.now();
    this.cropSheet = new Image();
    this.cropSheet.src = cropSheetUrl;
    this.cropSheet.onload = () => this.render();

    this.surface = scene.textures.createCanvas("uu-surface", WIDTH, HEIGHT);
    this.ctx = this.surface.context;
    this.image = scene.add.image(WIDTH / 2, HEIGHT / 2, "uu-surface");
    this.image.setDisplaySize(WIDTH, HEIGHT);

    scene.input.on("pointermove", (pointer) => {
      this.hover = { x: pointer.x, y: pointer.y };
    });
    scene.input.on("pointerdown", (pointer) => {
      this.handlePointer(pointer.x, pointer.y, pointer.rightButtonDown());
    });
    scene.input.mouse?.disableContextMenu();

    scene.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
    scene.input.keyboard.on("keydown-ESC", () => {
      if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    });
    scene.input.keyboard.on("keydown-SPACE", () => {
      if (this.state.view === "zuma") this.swapZumaColor();
    });

    window.addEventListener("beforeunload", () => this.save(true));
    window.desktop?.onClosing(() => this.save(true));
    if (window.desktop && this.state.alwaysOnTop) window.desktop.setAlwaysOnTop(true);
    if (this.state.view !== "farm" && this.state.view !== "market") this.ensureMiniGame(this.state.view);
    this.scanAutomation(true);
    this.render();
  }

  now() {
    return Date.now() + this.timeOffset;
  }

  save(force = false) {
    const now = Date.now();
    if (!force && now - this.lastSaveAt < 1500) return;
    this.state.lastSeen = this.now();
    localStorage.setItem(SAVE_KEY, JSON.stringify(this.state));
    this.lastSaveAt = now;
  }

  update(dt, shouldRender = true) {
    this.frameNow = this.now();
    if (this.state.view === "zuma" && this.zuma) this.updateZuma(Math.min(dt, 0.05));
    if (this.link?.pendingFinish && this.frameNow >= this.link.lockedUntil) {
      this.finishLink(true);
    } else if (this.link?.pendingShuffle && this.frameNow >= this.link.lockedUntil) {
      this.link.pendingShuffle = false;
      this.shuffleLink(false);
      this.showToast("没有可消除组合，棋盘已自动重排");
    }
    if (this.state.view === "link" && this.link && this.frameNow >= this.link.endAt && !this.link.over) {
      this.finishLink(false);
    }
    if (this.match3?.pendingFinish != null && this.frameNow >= this.match3.lockedUntil) {
      const success = this.match3.pendingFinish;
      this.match3.pendingFinish = null;
      this.finishMatch3(success);
    } else if (this.match3?.pendingShuffle && this.frameNow >= this.match3.lockedUntil) {
      const before = this.cloneMatchBoard(this.match3.board);
      this.match3.pendingShuffle = false;
      do this.match3.board = this.createMatchBoard();
      while (!this.findValidMatchSwap(this.match3.board));
      this.startMatchShuffleAnimation(before);
      this.showToast("没有可走步骤，棋盘已自动重排");
    }
    if (this.match3?.animation && this.frameNow > this.match3.animation.until + 30) {
      this.match3.animation = null;
    }
    this.updateAutomationRobots();
    if (this.toast && this.frameNow > this.toast.until) this.toast = null;
    this.save();
    if (shouldRender) this.render();
  }

  showToast(text, tone = "normal", duration = 1800) {
    this.toast = { text, tone, until: this.now() + duration };
  }

  switchView(view) {
    const previousView = this.state.view;
    if (previousView === "link" && view !== "link" && this.link && !this.link.pausedAt) {
      this.link.pausedAt = this.now();
    }
    if (view === "link" && this.link?.pausedAt) {
      this.link.endAt += this.now() - this.link.pausedAt;
      this.link.pausedAt = null;
    }
    this.state.view = view;
    this.state.selected = view === "farm" ? this.state.selected : this.state.selected;
    this.ensureMiniGame(view);
    this.save(true);
    this.render();
  }

  ensureMiniGame(view) {
    if (view === "link" && !this.link) this.startLinkRound();
    if (view === "zuma" && !this.zuma) this.startZumaRound();
    if (view === "match3" && !this.match3) this.startMatch3Round();
  }

  toggleFullscreen() {
    if (this.scene.scale.isFullscreen) this.scene.scale.stopFullscreen();
    else this.scene.scale.startFullscreen();
  }

  rounded(x, y, w, h, r, fill, stroke = null, line = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    if (fill) {
      ctx.fillStyle = fill;
      ctx.fill();
    }
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.stroke();
    }
  }

  rect(x, y, w, h, fill, stroke = null, line = 1) {
    const ctx = this.ctx;
    ctx.fillStyle = fill;
    ctx.fillRect(x, y, w, h);
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.strokeRect(x, y, w, h);
    }
  }

  line(x1, y1, x2, y2, color, width = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  circle(x, y, r, fill, stroke = null, line = 1) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = line;
      ctx.stroke();
    }
  }

  text(value, x, y, size = 14, color = C.ink, align = "left", weight = 700, baseline = "middle") {
    const ctx = this.ctx;
    const readableSize = Math.max(12, size);
    ctx.fillStyle = color;
    ctx.font = `${weight} ${readableSize}px "Microsoft YaHei", "PingFang SC", sans-serif`;
    ctx.textAlign = align;
    ctx.textBaseline = baseline;
    ctx.fillText(String(value), x, y);
  }

  addHit(type, x, y, w, h, data = {}) {
    const hit = { type, x, y, w, h, ...data };
    this.hits.push(hit);
    return hit;
  }

  isHover(hit) {
    return this.hover
      && this.hover.x >= hit.x
      && this.hover.x <= hit.x + hit.w
      && this.hover.y >= hit.y
      && this.hover.y <= hit.y + hit.h;
  }

  button(label, x, y, w, h, type, data = {}, options = {}) {
    const hit = this.addHit(type, x, y, w, h, data);
    const disabled = Boolean(options.disabled);
    const fill = disabled ? C.paper2 : options.fill || (this.isHover(hit) ? C.yellowSoft : C.cream);
    this.rounded(x, y, w, h, options.radius ?? 6, fill, options.stroke || C.ink, options.line || 2);
    this.text(label, x + w / 2, y + h / 2 + 1, options.size || 13, disabled ? C.lock : options.color || C.ink, "center", 800);
    hit.disabled = disabled;
    return hit;
  }

  drawCropIcon(cropId, x, y, scale = 1) {
    const crop = Core.cropById(cropId);
    const cropIndex = Core.CROPS.findIndex((entry) => entry.id === cropId);
    const ctx = this.ctx;
    const s = scale;
    if (this.cropSheet.complete && this.cropSheet.naturalWidth) {
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(this.cropSheet, cropIndex * 32, 0, 32, 32, x - 16 * s, y - 16 * s, 32 * s, 32 * s);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = "#4c9d59";
    ctx.fillRect(-2 * s, -12 * s, 4 * s, 9 * s);
    ctx.fillRect(-8 * s, -10 * s, 7 * s, 4 * s);
    ctx.fillRect(2 * s, -10 * s, 7 * s, 4 * s);
    ctx.fillStyle = crop.color;
    if (cropId === "corn") {
      ctx.fillRect(-6 * s, -4 * s, 12 * s, 20 * s);
      ctx.fillStyle = "#fff19a";
      for (let iy = 0; iy < 4; iy += 1) {
        for (let ix = 0; ix < 2; ix += 1) ctx.fillRect((-4 + ix * 5) * s, iy * 5 * s, 3 * s, 3 * s);
      }
    } else if (cropId === "cabbage") {
      ctx.fillRect(-11 * s, -4 * s, 22 * s, 18 * s);
      ctx.fillStyle = "#b7e4a6";
      ctx.fillRect(-5 * s, -2 * s, 10 * s, 16 * s);
    } else if (cropId === "strawberry") {
      ctx.beginPath();
      ctx.moveTo(-10 * s, -2 * s);
      ctx.lineTo(10 * s, -2 * s);
      ctx.lineTo(0, 17 * s);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#fff0b0";
      ctx.fillRect(-5 * s, 3 * s, 2 * s, 2 * s);
      ctx.fillRect(4 * s, 5 * s, 2 * s, 2 * s);
    } else {
      ctx.fillRect(-9 * s, -3 * s, 18 * s, 18 * s);
      ctx.fillStyle = "rgba(255,255,255,0.35)";
      ctx.fillRect(-6 * s, 0, 4 * s, 8 * s);
    }
    ctx.restore();
  }

  drawResourceIcon(kind, x, y) {
    if (kind === "coins") {
      this.circle(x, y, 8, C.yellow, C.ink, 2);
      this.text("¥", x, y + 1, 9, C.ink, "center", 900);
    } else if (kind === "tickets") {
      this.rect(x - 8, y - 6, 16, 12, C.coral, C.ink, 2);
      this.rect(x - 2, y - 4, 4, 8, C.paper);
    } else if (kind === "compost") {
      this.rect(x - 7, y - 6, 14, 13, C.greenSoft, C.ink, 2);
      this.rect(x - 3, y - 10, 6, 4, C.greenDark);
    } else if (kind === "seal") {
      this.circle(x, y, 8, C.purple, C.ink, 2);
      this.circle(x, y, 3, C.paper);
    } else if (kind === "sun") {
      this.circle(x, y, 7, C.yellow, C.ink, 2);
      for (let i = 0; i < 8; i += 1) {
        const a = i * Math.PI / 4;
        this.line(x + Math.cos(a) * 10, y + Math.sin(a) * 10, x + Math.cos(a) * 13, y + Math.sin(a) * 13, C.ink, 2);
      }
    } else if (kind === "stars") {
      this.text("★", x, y + 1, 19, C.yellow, "center", 900);
    }
  }

  drawBackground() {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, WIDTH, HEIGHT);
    this.rect(0, 0, WIDTH, HEIGHT, C.mint);
    for (let y = 0; y < HEIGHT; y += 24) {
      for (let x = (y / 24) % 2 ? 12 : 0; x < WIDTH; x += 24) {
        this.rect(x, y, 2, 2, "rgba(255,255,255,0.22)");
      }
    }
  }

  drawHeader() {
    this.rounded(10, 8, 940, 68, 7, C.paper, C.ink, 3);
    this.rect(22, 19, 42, 44, C.white, C.ink, 2);
    this.drawCropIcon("radish", 43, 39, 0.85);
    this.text("UU小园", 74, 27, 19, C.ink, "left", 900);
    this.text(`农场 Lv.${this.state.level}`, 74, 52, 12, C.coral, "left", 800);
    this.rect(159, 46, 105, 8, C.paper2);
    this.rect(159, 46, 105 * Math.min(1, this.state.xp / Core.xpNeeded(this.state.level)), 8, C.coral);

    const resources = [
      ["coins", this.state.coins, "金币"],
      ["tickets", this.state.seedTickets, "种子券"],
      ["compost", this.state.compost, "堆肥"],
      ["seal", this.state.orderSeals, "印章"],
      ["sun", this.state.sun, "阳光"],
      ["stars", this.state.stars, "丰收星"]
    ];
    resources.forEach(([kind, value, label], index) => {
      const x = 305 + index * 92;
      this.drawResourceIcon(kind, x, 35);
      this.text(label, x + 14, 23, 9, C.greenDark, "left", 700);
      this.text(value, x + 14, 43, 14, C.ink, "left", 900);
    });

    const pin = this.addHit("pin", 897, 18, 40, 40);
    this.rounded(pin.x, pin.y, pin.w, pin.h, 6, this.state.alwaysOnTop ? C.yellow : this.isHover(pin) ? C.yellowSoft : C.cream, C.ink, 2);
    this.line(912, 28, 923, 39, C.ink, 3);
    this.line(918, 25, 928, 35, C.ink, 3);
    this.line(918, 40, 910, 48, C.ink, 3);
  }

  drawNav() {
    const views = ["farm", "link", "zuma", "match3", "market"];
    views.forEach((view, index) => {
      const x = 12 + index * 188;
      const hit = this.addHit("nav", x, 83, 180, 45, { view });
      const active = this.state.view === view;
      this.rounded(x, 83, 180, 45, 6, active ? C.coral : this.isHover(hit) ? C.yellowSoft : C.paper, C.ink, 2);
      this.drawNavIcon(view, x + 29, 106, active);
      this.text(GAME_NAMES[view], x + 95, 106, 15, active ? C.white : C.ink, "center", 900);
      if (["link", "zuma", "match3"].includes(view)) {
        const done = this.state.festival[view];
        this.circle(x + 163, 96, 6, done ? C.yellow : C.paper2, C.ink, 1);
      }
    });
  }

  drawNavIcon(view, x, y, active) {
    const primary = active ? C.white : C.greenDark;
    const secondary = active ? C.yellowSoft : C.coral;
    if (view === "farm") {
      for (let row = 0; row < 2; row += 1) {
        for (let col = 0; col < 2; col += 1) this.rect(x - 10 + col * 11, y - 10 + row * 11, 8, 8, primary, C.ink, 1);
      }
      this.rect(x - 2, y - 16, 4, 6, secondary);
    } else if (view === "link") {
      this.rounded(x - 13, y - 7, 12, 12, 2, primary, C.ink, 1);
      this.rounded(x + 2, y - 7, 12, 12, 2, primary, C.ink, 1);
      this.line(x - 1, y - 1, x + 2, y - 1, secondary, 3);
    } else if (view === "zuma") {
      this.circle(x - 10, y, 7, secondary, C.ink, 1);
      this.circle(x + 1, y - 5, 7, primary, C.ink, 1);
      this.circle(x + 11, y + 2, 7, C.yellow, C.ink, 1);
    } else if (view === "match3") {
      [[-8, -7], [6, -7], [-1, 6]].forEach(([dx, dy], index) => {
        const color = [primary, secondary, C.yellow][index];
        this.ctx.save();
        this.ctx.translate(x + dx, y + dy);
        this.ctx.rotate(Math.PI / 4);
        this.rect(-5, -5, 10, 10, color, C.ink, 1);
        this.ctx.restore();
      });
    } else {
      this.rect(x - 13, y - 5, 26, 15, C.paper, C.ink, 2);
      this.rect(x - 16, y - 12, 32, 8, secondary, C.ink, 1);
      this.rect(x - 7, y, 7, 10, primary);
      this.rect(x + 4, y - 1, 6, 5, C.sky);
    }
  }

  drawFestivalStrip() {
    const progress = ["link", "zuma", "match3"].filter((key) => this.state.festival[key]).length;
    this.rounded(646, 550, 302, 78, 7, C.paper, C.ink, 2);
    this.text("丰收庆典", 662, 567, 15, C.ink, "left", 900);
    this.text(`三种玩法各通关一次 · ${progress}/3`, 662, 588, 11, C.greenDark, "left", 700);
    ["link", "zuma", "match3"].forEach((key, index) => {
      const x = 814 + index * 38;
      this.circle(x, 573, 13, this.state.festival[key] ? C.yellow : C.paper2, C.ink, 2);
      this.text(["连", "祖", "消"][index], x, 574, 10, C.ink, "center", 900);
    });
    this.text("集齐奖励：金币 + 永久研究星", 662, 611, 10, C.inkSoft, "left", 700);
  }

  render() {
    this.hits = [];
    this.drawBackground();
    this.drawHeader();
    this.drawNav();
    if (this.state.view === "farm") this.drawFarm();
    else if (this.state.view === "market") this.drawMarket();
    else if (this.state.view === "link") this.drawLink();
    else if (this.state.view === "zuma") this.drawZuma();
    else if (this.state.view === "match3") this.drawMatch3();
    if (this.toast) this.drawToast();
    this.surface.refresh();
  }

  drawToast() {
    const width = Math.min(520, Math.max(210, 50 + this.toast.text.length * 14));
    const x = (WIDTH - width) / 2;
    const fill = this.toast.tone === "good" ? C.greenSoft : this.toast.tone === "bad" ? "#f2b1aa" : C.yellowSoft;
    this.rounded(x, 91, width, 34, 7, fill, C.ink, 2);
    this.text(this.toast.text, WIDTH / 2, 109, 13, C.ink, "center", 800);
  }

  drawFarm() {
    this.drawOrders();
    this.drawPlots();
    this.drawFarmTools();
    this.drawSeedShelf();
    this.drawWarehouse();
  }

  drawOrders() {
    this.text("顾客订单", 18, 148, 15, C.ink, "left", 900);
    this.text("订单会持续刷新，印章自动用于下一次交付", 100, 148, 10, C.greenDark, "left", 700);
    this.state.orders.forEach((order, index) => {
      const crop = Core.cropById(order.cropId);
      const x = 18 + index * 205;
      this.rounded(x, 161, 195, 65, 6, index % 2 ? C.cream : C.paper, C.ink, 2);
      this.drawCropIcon(crop.id, x + 25, 192, 0.6);
      this.text(`${crop.name} ×${order.amount}`, x + 48, 177, 12, C.ink, "left", 900);
      this.text(`约￥${order.estimatedCost}`, x + 48, 199, 9, C.inkSoft, "left", 700);
      this.text(`￥${order.coins}`, x + 181, 177, 11, C.coralDark, "right", 900);
      const ready = this.state.produce[crop.id] >= order.amount;
      this.button(ready ? "交付" : `${this.state.produce[crop.id]}/${order.amount}`, x + 146, 180, 42, 28, "deliver", { orderId: order.id }, {
        fill: ready ? C.greenSoft : C.paper2,
        disabled: !ready,
        size: 10
      });
    });
  }

  drawPlots() {
    const startX = 18;
    const startY = 238;
    const w = 143;
    const h = 82;
    const gap = 10;
    for (let index = 0; index < Core.PLOT_COUNT; index += 1) {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = startX + col * (w + gap);
      const y = startY + row * (h + gap);
      const unlocked = index < this.state.unlockedPlots;
      const plot = this.state.plots[index];
      const hit = this.addHit("plot", x, y, w, h, { index });
      const fill = unlocked ? C.soil : index === this.state.unlockedPlots ? C.greenSoft : "#90aa8b";
      this.rounded(x, y, w, h, 5, fill, C.ink, 2);

      if (!unlocked) {
        this.text("🔒", x + w / 2, y + 32, 20, C.ink, "center", 800);
        if (index === this.state.unlockedPlots) {
          this.text(`解锁 ￥${Core.nextLandCost(this.state)}`, x + w / 2, y + 61, 10, C.ink, "center", 800);
        } else {
          this.text("先解锁前一块", x + w / 2, y + 61, 9, C.paper, "center", 700);
        }
        continue;
      }

      this.line(x + 12, y + 26, x + w - 12, y + 26, C.soilDark, 3);
      this.line(x + 12, y + 53, x + w - 12, y + 53, C.soilDark, 3);
      for (let soil = 0; soil < plot.soil; soil += 1) this.circle(x + 12 + soil * 10, y + 11, 3, C.yellow, C.ink, 1);
      if (plot.crop) {
        const crop = Core.cropById(plot.crop.cropId);
        const progress = Core.cropProgress(plot, this.frameNow);
        this.drawCropIcon(crop.id, x + w / 2, y + 40, 0.85 + progress * 0.35);
        this.rect(x + 27, y + h - 12, w - 54, 6, C.paper2);
        this.rect(x + 27, y + h - 12, (w - 54) * progress, 6, progress >= 1 ? C.yellow : C.green);
        this.text(progress >= 1 ? "成熟" : Core.formatDuration(plot.crop.finishAt - this.frameNow), x + w / 2, y + h - 21, 9, C.paper, "center", 800);
      } else {
        this.text("空土地", x + w / 2, y + 42, 10, "rgba(255,248,216,0.72)", "center", 700);
      }
    }
    this.drawAutomationRobots();
  }

  plotBounds(index) {
    const w = 143;
    const h = 82;
    const gap = 10;
    return {
      x: 18 + (index % 4) * (w + gap),
      y: 238 + Math.floor(index / 4) * (h + gap),
      w,
      h
    };
  }

  queueRobotJob(type, plotIndex, duration = 2200) {
    if (this.robotJobs.some((job) => job.type === type && job.plotIndex === plotIndex)) return;
    this.robotJobs.push({
      type,
      plotIndex,
      start: this.now(),
      duration,
      harvested: false
    });
  }

  scanAutomation(force = false) {
    const now = this.now();
    if (!force && now - this.lastRobotScan < 10_000) return;
    this.lastRobotScan = now;
    for (const plotIndex of this.state.automationSlots.harvester) {
      const plot = this.state.plots[plotIndex];
      if (plot?.crop && Core.cropProgress(plot, now) >= 1) this.queueRobotJob("harvester", plotIndex, 2600);
    }
  }

  updateAutomationRobots() {
    this.scanAutomation(false);
    const now = this.now();
    for (const job of this.robotJobs) {
      const progress = (now - job.start) / job.duration;
      if (job.type === "harvester" && progress >= 0.58 && !job.harvested) {
        job.harvested = true;
        const result = Core.harvest(this.state, job.plotIndex, now);
        if (result.ok && this.state.view === "farm") {
          this.showToast(`收菜机器人装箱 ${result.crop.name} ×${result.amount}`, "good", 1500);
        }
      }
    }
    this.robotJobs = this.robotJobs.filter((job) => now - job.start <= job.duration);
  }

  drawRobot(type, x, y, phase, working = false) {
    const bob = Math.sin(phase * Math.PI * 2) * 2;
    const wheelTurn = Math.floor(phase * 8) % 2;
    const body = type === "sprinkler" ? C.sky : C.yellow;
    const accent = type === "sprinkler" ? C.blue : C.coralDark;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y + bob));
    this.circle(-8, 11, 5, C.ink);
    this.circle(8, 11, 5, C.ink);
    this.circle(-8, 11, wheelTurn ? 2 : 1, C.paper);
    this.circle(8, 11, wheelTurn ? 1 : 2, C.paper);
    this.rounded(-15, -10, 30, 23, 4, body, C.ink, 2);
    this.rect(-8, -5, 16, 9, C.cream, C.ink, 1);
    this.circle(-4, -1, 2, C.ink);
    this.circle(4, -1, 2, C.ink);
    this.line(0, -10, 0, -18, C.ink, 2);
    this.circle(0, -20, 3, working ? C.coral : C.green, C.ink, 1);
    const armSwing = working ? Math.sin(phase * Math.PI * 8) * 7 : Math.sin(phase * Math.PI * 2) * 2;
    this.line(-15, -2, -22, 5 + armSwing, accent, 4);
    this.line(15, -2, 22, 5 - armSwing, accent, 4);
    if (type === "sprinkler") {
      this.rect(-6, -16, 12, 6, C.blue, C.ink, 1);
      this.line(-10, -15, 10, -15, C.blue, 3);
    } else {
      this.rect(-11, 5, 22, 4, C.coral, C.ink, 1);
      this.line(18, 5 - armSwing, 23, 0 - armSwing, C.ink, 2);
    }
    ctx.restore();
  }

  drawAutomationRobots() {
    const now = this.frameNow;
    const drawAssigned = (type, plotIndex, order) => {
      const bounds = this.plotBounds(plotIndex);
      const job = this.robotJobs.find((entry) => entry.type === type && entry.plotIndex === plotIndex);
      let phase = ((now / 1600) + plotIndex * 0.17 + order * 0.11) % 1;
      let x;
      let y;
      if (job) {
        const progress = Math.max(0, Math.min(1, (now - job.start) / job.duration));
        const travel = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
        phase = progress;
        const homeX = type === "sprinkler" ? bounds.x + 22 : bounds.x + bounds.w - 22;
        const workX = bounds.x + bounds.w / 2 + (type === "sprinkler" ? -24 : 24);
        x = homeX + (workX - homeX) * travel;
        y = type === "sprinkler"
          ? bounds.y + 20 + Math.sin(progress * Math.PI) * 4
          : bounds.y + 61 - Math.sin(progress * Math.PI) * 5;
        if (type === "sprinkler" && progress > 0.25 && progress < 0.82) {
          for (let drop = 0; drop < 5; drop += 1) {
            const a = progress * 10 + drop;
            const dx = Math.cos(a) * (13 + drop * 3);
            const dy = 8 + (drop * 9 + progress * 60) % 29;
            this.circle(x + dx, y + dy, 2, C.sky, C.blue, 1);
          }
        }
        if (type === "harvester" && progress > 0.35 && progress < 0.72) {
          for (let spark = 0; spark < 4; spark += 1) {
            const angle = spark * Math.PI / 2 + progress * 4;
            this.line(
              bounds.x + bounds.w / 2 + Math.cos(angle) * 12,
              bounds.y + 42 + Math.sin(angle) * 12,
              bounds.x + bounds.w / 2 + Math.cos(angle) * 18,
              bounds.y + 42 + Math.sin(angle) * 18,
              C.yellow,
              2
            );
          }
        }
      } else {
        const patrol = (Math.sin(now / 1400 + plotIndex + order) + 1) / 2;
        x = bounds.x + 24 + patrol * (bounds.w - 48);
        y = bounds.y + (type === "sprinkler" ? 19 : 63);
      }
      this.drawRobot(type, x, y, phase, Boolean(job));
    };

    this.state.automationSlots.sprinkler.forEach((plotIndex, order) => drawAssigned("sprinkler", plotIndex, order));
    this.state.automationSlots.harvester.forEach((plotIndex, order) => drawAssigned("harvester", plotIndex, order));
  }

  drawFarmTools() {
    this.text("农具", 18, 526, 13, C.ink, "left", 900);
    const tools = [
      ["seed", this.state.selected.type === "seed" ? Core.cropById(this.state.selected.id)?.name || "种子" : "种子"],
      ["water", "浇水"],
      ["fertilizer", `施肥 ${this.state.compost}`],
      ["hand", "收获"],
      ["soil", `沃土 ${this.state.inventory.soilKit}`]
    ];
    tools.forEach(([type, name], index) => {
      const x = 18 + index * 121;
      const active = this.state.selected.type === type;
      this.button(name, x, 543, 111, 38, "tool", { tool: type }, {
        fill: active ? C.yellow : C.cream,
        size: 11
      });
    });
    const selected = this.state.selected;
    let helper = "选择农具后点击土地";
    if (selected.type === "automation") helper = `正在布置${selected.id === "sprinkler" ? "洒水器" : "收菜助手"}：点击土地安装或收回`;
    if (selected.type === "soil") helper = "沃土改良：选择要永久提升品质的土地";
    this.text(helper, 18, 601, 10, C.greenDark, "left", 700);
    if (selected.type === "automation") {
      this.button("退出布置", 512, 588, 112, 30, "tool", { tool: "hand" }, { size: 11, fill: C.paper2 });
    }
  }

  drawSeedShelf() {
    this.text("种子架", 650, 148, 15, C.ink, "left", 900);
    this.text("连连看可赚种子券", 934, 148, 9, C.greenDark, "right", 700);
    Core.CROPS.forEach((crop, index) => {
      const y = 163 + index * 47;
      const locked = crop.level > this.state.level;
      const selected = this.state.selected.type === "seed" && this.state.selected.id === crop.id;
      const hit = this.addHit("seed-select", 648, y, 181, 40, { cropId: crop.id });
      this.rounded(648, y, 181, 40, 5, selected ? C.yellowSoft : index % 2 ? C.cream : C.paper, C.ink, selected ? 3 : 1);
      this.drawCropIcon(crop.id, 669, y + 20, 0.55);
      this.text(crop.name, 691, y + 12, 11, locked ? C.lock : C.ink, "left", 900);
      const mastery = this.state.mastery[crop.id].level;
      this.text(locked ? `Lv.${crop.level} 解锁` : `种子×${this.state.seeds[crop.id]} · 熟练${mastery}`, 691, y + 29, 9, locked ? C.lock : C.greenDark, "left", 700);
      this.button(locked ? "锁" : `+3 ￥${crop.seedPrice * 3}`, 835, y + 5, 99, 30, "seed-buy", { cropId: crop.id }, {
        disabled: locked,
        size: 10,
        fill: C.paper2
      });
    });
  }

  drawWarehouse() {
    this.rounded(646, 455, 302, 86, 7, C.paper, C.ink, 2);
    const count = Core.CROPS.reduce((sum, crop) => sum + this.state.produce[crop.id], 0);
    const value = Math.floor(Core.produceValue(this.state));
    this.text("仓库", 662, 472, 14, C.ink, "left", 900);
    this.text(`蔬菜 ${count} 份 · 估价 ￥${value}`, 662, 494, 11, C.greenDark, "left", 700);
    this.button("全部出售", 805, 468, 125, 33, "sell", {}, { fill: value ? C.greenSoft : C.paper2, disabled: !value });
    this.text(`熟练度会提高品质和售价 · 阳光 ${this.state.sun}`, 662, 521, 9, C.inkSoft, "left", 700);
    this.drawFestivalStrip();
  }

  usePlot(index) {
    if (index >= this.state.unlockedPlots) {
      if (index === this.state.unlockedPlots) {
        const result = Core.unlockNextPlot(this.state);
        this.showToast(result.ok ? `解锁第 ${this.state.unlockedPlots} 块土地` : result.reason, result.ok ? "good" : "bad");
      }
      return;
    }
    const plot = this.state.plots[index];
    if (plot.crop && Core.cropProgress(plot, this.now()) >= 1 && this.state.selected.type !== "automation") {
      const result = Core.harvest(this.state, index, this.now());
      if (result.ok) this.robotJobs = this.robotJobs.filter((job) => job.plotIndex !== index);
      this.showToast(result.ok ? `收获 ${result.crop.name} ×${result.amount}，获得阳光` : result.reason, result.ok ? "good" : "bad");
      return;
    }
    let result;
    const selected = this.state.selected;
    if (selected.type === "seed") result = Core.plant(this.state, index, selected.id, this.now());
    else if (selected.type === "water") result = Core.water(this.state, index, this.now());
    else if (selected.type === "fertilizer") result = Core.fertilize(this.state, index, this.now());
    else if (selected.type === "hand") result = Core.harvest(this.state, index, this.now());
    else if (selected.type === "soil") result = Core.applySoilKit(this.state, index);
    else if (selected.type === "automation") result = Core.toggleAutomation(this.state, selected.id, index);
    if (result) {
      let message = result.reason || "操作完成";
      if (result.ok && selected.type === "seed") {
        message = `${result.crop.name}种下了`;
        if (this.state.automationSlots.sprinkler.includes(index)) {
          this.queueRobotJob("sprinkler", index, 1900);
          message += "，洒水机器人出发";
        }
      }
      if (result.ok && selected.type === "soil") message = `土地品质提升到 ${result.soil} 级`;
      if (result.ok && selected.type === "automation") message = result.action === "placed" ? "设备已安装" : "设备已收回";
      if (result.ok && selected.type === "automation" && result.action === "removed") {
        this.robotJobs = this.robotJobs.filter((job) => !(job.type === selected.id && job.plotIndex === index));
      }
      if (result.ok && selected.type === "automation" && result.action === "placed") {
        if (selected.id === "sprinkler" && plot.crop && !plot.crop.watered) {
          const watered = Core.water(this.state, index, this.now());
          if (watered.ok) {
            this.queueRobotJob("sprinkler", index, 1900);
            message = "洒水机器人已安装并开始浇水";
          }
        }
        if (selected.id === "harvester" && plot.crop && Core.cropProgress(plot, this.now()) >= 1) {
          this.queueRobotJob("harvester", index, 2600);
          message = "收菜机器人已安装并开始工作";
        }
      }
      this.showToast(message, result.ok ? "good" : "bad");
    }
  }

  drawMarket() {
    this.text("经营商店", 18, 151, 17, C.ink, "left", 900);
    this.text("金币投入会永久改变农场效率", 118, 151, 10, C.greenDark, "left", 700);
    Core.SHOP_ITEMS.forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 18 + col * 205;
      const y = 169 + row * 145;
      const level = Core.itemLevel(this.state, item);
      const maxed = level >= item.max;
      const cost = Core.itemCost(this.state, item);
      this.rounded(x, y, 194, 132, 7, index % 2 ? C.cream : C.paper, C.ink, 2);
      this.text(item.name, x + 14, y + 20, 14, C.ink, "left", 900);
      const status = item.kind === "consumable"
        ? `持有 ${level}`
        : item.kind === "automation"
          ? `已购 ${level}/${item.max} · 空闲 ${Core.unplacedAutomation(this.state, item.id)}`
          : `Lv.${level}/${item.max}`;
      this.text(status, x + 14, y + 43, 10, C.greenDark, "left", 800);
      this.text(item.description, x + 14, y + 67, 10, C.inkSoft, "left", 700);
      if (item.kind === "automation" && level > 0) {
        this.button("布置", x + 12, y + 91, 70, 28, "place-auto", { itemId: item.id }, { fill: C.mint, size: 10 });
        this.button(maxed ? "已满" : `再买 ￥${cost}`, x + 88, y + 91, 94, 28, "buy-shop", { itemId: item.id }, {
          disabled: maxed,
          fill: C.yellowSoft,
          size: 10
        });
      } else {
        this.button(maxed ? "已拥有" : `购买 ￥${cost}`, x + 72, y + 91, 110, 28, "buy-shop", { itemId: item.id }, {
          disabled: maxed,
          fill: C.yellowSoft,
          size: 10
        });
      }
    });

    this.text("资源与长期研究", 649, 151, 17, C.ink, "left", 900);
    this.rounded(649, 169, 293, 84, 7, C.paper, C.ink, 2);
    this.text("种子券兑换", 663, 189, 13, C.ink, "left", 900);
    this.text("1 张券换当前等级随机种子", 663, 211, 10, C.inkSoft, "left", 700);
    this.button("兑换", 843, 183, 84, 36, "exchange", {}, {
      disabled: this.state.seedTickets < 1,
      fill: C.coral,
      color: C.white
    });

    this.rounded(649, 264, 293, 85, 7, C.cream, C.ink, 2);
    const landCost = Core.nextLandCost(this.state);
    this.text("农田扩建", 663, 284, 13, C.ink, "left", 900);
    this.text(`${this.state.unlockedPlots}/${Core.PLOT_COUNT} 块土地`, 663, 308, 10, C.greenDark, "left", 800);
    this.button(landCost == null ? "已全部解锁" : `解锁 ￥${landCost}`, 805, 280, 122, 38, "unlock-land", {}, {
      disabled: landCost == null,
      fill: C.greenSoft,
      size: 11
    });

    this.text(`丰收研究 · 可用 ★${this.state.stars}`, 649, 374, 15, C.ink, "left", 900);
    Core.RESEARCH.forEach((entry, index) => {
      const y = 394 + index * 73;
      const level = this.state.research[entry.id];
      const cost = Core.researchCost(this.state, entry.id);
      this.rounded(649, y, 293, 63, 6, index % 2 ? C.cream : C.paper, C.ink, 2);
      this.text(entry.name, 663, y + 18, 12, C.ink, "left", 900);
      this.text(`${entry.description} · Lv.${level}/5`, 663, y + 41, 9, C.greenDark, "left", 700);
      this.button(cost == null ? "完成" : `★${cost}`, 865, y + 14, 62, 34, "research", { researchId: entry.id }, {
        disabled: cost == null,
        fill: C.yellowSoft,
        size: 11
      });
    });
  }

  startLinkRound() {
    const rows = 5;
    const cols = 8;
    const symbols = [];
    for (let pair = 0; pair < rows * cols / 2; pair += 1) {
      symbols.push(pair % 10, pair % 10);
    }
    for (let i = symbols.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [symbols[i], symbols[j]] = [symbols[j], symbols[i]];
    }
    this.link = {
      rows,
      cols,
      board: Array.from({ length: rows }, (_, row) => symbols.slice(row * cols, (row + 1) * cols)),
      selected: null,
      score: 0,
      combo: 0,
      endAt: this.now() + 90_000,
      over: false,
      lastPath: null,
      lastMatch: null,
      invalidMatch: null,
      hint: null,
      pausedAt: null,
      rounds: 0,
      selectedAt: 0,
      lockedUntil: 0,
      pendingFinish: false,
      pendingShuffle: false
    };
    if (!this.findLinkMove()) this.shuffleLink(false);
  }

  linkCellCenter(row, col) {
    return { x: 185 + col * 74 + 33, y: 224 + row * 66 + 28 };
  }

  findLinkPath(a, b) {
    if (!this.link) return null;
    const { rows, cols, board } = this.link;
    if (!a || !b || (a.row === b.row && a.col === b.col)) return null;
    if (board[a.row][a.col] == null || board[a.row][a.col] !== board[b.row][b.col]) return null;
    const grid = Array.from({ length: rows + 2 }, () => Array(cols + 2).fill(null));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) grid[row + 1][col + 1] = board[row][col];
    }
    const start = { row: a.row + 1, col: a.col + 1 };
    const target = { row: b.row + 1, col: b.col + 1 };
    const dirs = [[-1, 0], [0, 1], [1, 0], [0, -1]];
    const queue = [];
    const visited = new Map();
    for (let direction = 0; direction < 4; direction += 1) {
      queue.push({ ...start, direction, turns: 0, path: [start] });
    }
    while (queue.length) {
      const current = queue.shift();
      const [dr, dc] = dirs[current.direction];
      const row = current.row + dr;
      const col = current.col + dc;
      if (row < 0 || row >= rows + 2 || col < 0 || col >= cols + 2) continue;
      const isTarget = row === target.row && col === target.col;
      if (!isTarget && grid[row][col] != null) continue;
      const key = `${row},${col},${current.direction}`;
      if ((visited.get(key) ?? 99) <= current.turns) continue;
      visited.set(key, current.turns);
      const path = [...current.path, { row, col }];
      if (isTarget) return path;
      for (let direction = 0; direction < 4; direction += 1) {
        const turns = current.turns + (direction === current.direction ? 0 : 1);
        if (turns <= 2) queue.push({ row, col, direction, turns, path });
      }
    }
    return null;
  }

  findLinkMove() {
    if (!this.link) return null;
    const cells = [];
    for (let row = 0; row < this.link.rows; row += 1) {
      for (let col = 0; col < this.link.cols; col += 1) {
        if (this.link.board[row][col] != null) cells.push({ row, col, value: this.link.board[row][col] });
      }
    }
    for (let i = 0; i < cells.length; i += 1) {
      for (let j = i + 1; j < cells.length; j += 1) {
        if (cells[i].value === cells[j].value && this.findLinkPath(cells[i], cells[j])) return [cells[i], cells[j]];
      }
    }
    return null;
  }

  clickLinkCell(row, col) {
    if (!this.link || this.link.over || this.now() < this.link.lockedUntil || this.link.board[row][col] == null) return;
    const cell = { row, col };
    if (!this.link.selected) {
      this.link.selected = cell;
      this.link.selectedAt = this.now();
      return;
    }
    const first = this.link.selected;
    this.link.selected = null;
    const path = this.findLinkPath(first, cell);
    if (!path) {
      this.link.combo = 0;
      this.link.selected = cell;
      this.link.selectedAt = this.now();
      this.link.invalidMatch = {
        cells: [first, cell],
        startedAt: this.now(),
        until: this.now() + 360
      };
      this.showToast("这两个图块连不起来", "bad", 900);
      return;
    }
    const firstValue = this.link.board[first.row][first.col];
    const secondValue = this.link.board[row][col];
    this.link.board[first.row][first.col] = null;
    this.link.board[row][col] = null;
    this.link.combo += 1;
    this.link.score += 90 + this.link.combo * 15;
    const startedAt = this.now();
    this.link.lastPath = { path, startedAt, until: startedAt + 560 };
    this.link.lastMatch = {
      cells: [{ ...first, value: firstValue }, { ...cell, value: secondValue }],
      startedAt,
      until: startedAt + 430,
      combo: this.link.combo
    };
    this.link.lockedUntil = startedAt + 390;
    this.link.hint = null;
    const remaining = this.link.board.flat().filter((value) => value != null).length;
    if (!remaining) {
      this.link.pendingFinish = true;
    } else if (!this.findLinkMove()) {
      this.link.pendingShuffle = true;
    }
  }

  shuffleLink(costsSun = true) {
    if (!this.link) return;
    if (costsSun) {
      const spent = Core.spendSun(this.state, 1);
      if (!spent.ok) {
        this.showToast(spent.reason, "bad");
        return;
      }
    }
    const values = this.link.board.flat().filter((value) => value != null);
    let attempts = 0;
    do {
      for (let i = values.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [values[i], values[j]] = [values[j], values[i]];
      }
      let cursor = 0;
      for (let row = 0; row < this.link.rows; row += 1) {
        for (let col = 0; col < this.link.cols; col += 1) {
          if (this.link.board[row][col] != null) this.link.board[row][col] = values[cursor++];
        }
      }
      attempts += 1;
    } while (!this.findLinkMove() && attempts < 30);
    this.link.selected = null;
    this.link.hint = null;
  }

  hintLink() {
    const spent = Core.spendSun(this.state, 1);
    if (!spent.ok) return this.showToast(spent.reason, "bad");
    this.link.hint = this.findLinkMove();
    if (!this.link.hint) this.shuffleLink(false);
  }

  finishLink(success) {
    if (!this.link || this.link.over) return;
    this.link.over = true;
    const result = Core.completeMiniGame(this.state, "link", this.link.score, success);
    const reward = result.reward.amount;
    this.showToast(`${success ? "连连看通关" : "时间到"}：种子券 +${reward}${result.festival ? "，丰收庆典完成！" : ""}`, success ? "good" : "normal", 3000);
    const previous = this.link.score;
    this.startLinkRound();
    this.link.score = Math.floor(previous * 0.1);
  }

  drawLinkTile(symbol, x, y, w, h, selected, hinted, options = {}) {
    const crop = Core.CROPS[symbol % Core.CROPS.length];
    const scale = options.scale ?? 1;
    const alpha = options.alpha ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2 + offsetX, y + h / 2 + offsetY);
    ctx.scale(scale, scale);
    if (options.glow) {
      ctx.shadowColor = options.glow;
      ctx.shadowBlur = 12;
    }
    this.rounded(-w / 2, -h / 2, w, h, 6, selected ? C.yellow : hinted ? C.greenSoft : C.cream, C.ink, selected ? 3 : 2);
    this.drawCropIcon(crop.id, 0, 2, 0.75);
    const marks = ["●", "◆", "▲", "■"];
    this.text(marks[Math.floor(symbol / Core.CROPS.length) % marks.length], w / 2 - 10, -h / 2 + 10, 8, C.coral, "center", 900);
    ctx.restore();
  }

  drawLink() {
    if (!this.link) this.startLinkRound();
    const remainingSeconds = Math.max(0, Math.ceil((this.link.endAt - this.frameNow) / 1000));
    this.text("田园连连看", 22, 151, 18, C.ink, "left", 900);
    this.text("连接同类图块，最多转两个弯", 142, 151, 10, C.greenDark, "left", 700);
    this.rounded(20, 169, 920, 43, 6, C.paper, C.ink, 2);
    this.text(`得分 ${this.link.score}`, 42, 191, 13, C.ink, "left", 900);
    this.text(`连击 ×${this.link.combo}`, 178, 191, 12, C.coralDark, "left", 800);
    this.text(`剩余 ${remainingSeconds} 秒`, 333, 191, 13, remainingSeconds < 15 ? C.coralDark : C.ink, "left", 900);
    this.text("奖励：种子券", 508, 191, 11, C.greenDark, "left", 800);
    this.button("提示 ☀1", 708, 175, 98, 30, "link-hint", {}, { fill: C.greenSoft, size: 11 });
    this.button("重排 ☀1", 818, 175, 104, 30, "link-shuffle", {}, { fill: C.yellowSoft, size: 11 });

    for (let row = 0; row < this.link.rows; row += 1) {
      for (let col = 0; col < this.link.cols; col += 1) {
        const value = this.link.board[row][col];
        if (value == null) continue;
        const x = 185 + col * 74;
        const y = 224 + row * 66;
        const selected = this.link.selected?.row === row && this.link.selected?.col === col;
        const hinted = this.link.hint?.some((cell) => cell.row === row && cell.col === col);
        const invalid = this.link.invalidMatch?.until > this.frameNow
          && this.link.invalidMatch.cells.some((entry) => entry.row === row && entry.col === col);
        const shakeProgress = invalid
          ? clamp01((this.frameNow - this.link.invalidMatch.startedAt) / 360)
          : 0;
        const offsetX = invalid ? Math.sin(shakeProgress * Math.PI * 7) * 7 * (1 - shakeProgress) : 0;
        const selectedPulse = selected ? 1 + Math.sin((this.frameNow - this.link.selectedAt) / 115) * 0.035 : 1;
        this.addHit("link-cell", x, y, 66, 56, { row, col });
        this.drawLinkTile(value, x, y, 66, 56, selected, hinted, {
          scale: selectedPulse,
          offsetX,
          glow: selected ? "rgba(243,201,85,0.7)" : null
        });
      }
    }

    if (this.link.lastPath && this.link.lastPath.until > this.frameNow) {
      const progress = clamp01((this.frameNow - this.link.lastPath.startedAt) / (this.link.lastPath.until - this.link.lastPath.startedAt));
      const points = this.link.lastPath.path.map((point) => {
        const row = point.row - 1;
        const col = point.col - 1;
        if (row >= 0 && row < this.link.rows && col >= 0 && col < this.link.cols) return this.linkCellCenter(row, col);
        return {
          x: col < 0 ? 178 : col >= this.link.cols ? 778 : 185 + col * 74 + 33,
          y: row < 0 ? 218 : row >= this.link.rows ? 560 : 224 + row * 66 + 28
        };
      });
      this.ctx.beginPath();
      this.ctx.moveTo(points[0].x, points[0].y);
      points.slice(1).forEach((point) => this.ctx.lineTo(point.x, point.y));
      this.ctx.strokeStyle = C.coral;
      this.ctx.lineWidth = 3 + Math.sin(progress * Math.PI) * 3;
      this.ctx.lineCap = "round";
      this.ctx.setLineDash([10, 7]);
      this.ctx.lineDashOffset = -progress * 55;
      this.ctx.shadowColor = C.yellow;
      this.ctx.shadowBlur = 10;
      this.ctx.stroke();
      this.ctx.setLineDash([]);
      this.ctx.shadowBlur = 0;
    }
    if (this.link.lastMatch && this.link.lastMatch.until > this.frameNow) {
      const progress = clamp01((this.frameNow - this.link.lastMatch.startedAt) / (this.link.lastMatch.until - this.link.lastMatch.startedAt));
      const burst = Math.sin(progress * Math.PI);
      this.link.lastMatch.cells.forEach((entry, index) => {
        const x = 185 + entry.col * 74;
        const y = 224 + entry.row * 66;
        this.drawLinkTile(entry.value, x, y, 66, 56, false, false, {
          scale: 1 + burst * 0.22,
          alpha: 1 - easeInOut(progress),
          offsetY: -progress * 12,
          glow: C.yellow
        });
        const center = this.linkCellCenter(entry.row, entry.col);
        for (let particle = 0; particle < 7; particle += 1) {
          const angle = (particle / 7) * Math.PI * 2 + index * 0.45;
          const distance = easeOut(progress) * (22 + particle * 2);
          const size = Math.max(1, 5 * (1 - progress));
          this.rect(
            center.x + Math.cos(angle) * distance - size / 2,
            center.y + Math.sin(angle) * distance - size / 2 - progress * 8,
            size,
            size,
            particle % 2 ? C.coral : C.yellow
          );
        }
      });
      const first = this.link.lastMatch.cells[0];
      const center = this.linkCellCenter(first.row, first.col);
      this.ctx.save();
      this.ctx.globalAlpha = 1 - progress;
      this.text(`连击 ×${this.link.lastMatch.combo}`, center.x + 48, center.y - 34 - progress * 18, 13 + burst * 3, C.coralDark, "center", 900);
      this.ctx.restore();
    }
    this.text("完成一整盘可点亮庆典印记；没有可走组合时会自动重排", WIDTH / 2, 595, 10, C.inkSoft, "center", 700);
  }

  zumaPathPoint(progress) {
    const p = Math.max(0, Math.min(1, progress));
    return {
      x: 75 + 810 * p,
      y: 345 + Math.sin(p * Math.PI * 3) * 95
    };
  }

  startZumaRound(level = 1) {
    const colors = [0, 1, 2, 3, 4];
    const balls = [];
    for (let i = 0; i < 18; i += 1) {
      balls.push({ color: colors[Math.floor(Math.random() * colors.length)], p: 0.42 - i * 0.034 });
    }
    this.zuma = {
      level,
      balls,
      projectiles: [],
      currentColor: Math.floor(Math.random() * 5),
      nextColor: Math.floor(Math.random() * 5),
      score: 0,
      combo: 0,
      spawned: 18,
      target: 34 + level * 4,
      spawnTimer: 0,
      slowUntil: 0,
      gap: null,
      over: false
    };
    this.zuma.currentColor = this.randomZumaColor();
    this.zuma.nextColor = this.randomZumaColor();
  }

  randomZumaColor() {
    const available = [...new Set((this.zuma?.balls || []).map((ball) => ball.color))];
    const choices = available.length ? available : [0, 1, 2, 3, 4];
    return choices[Math.floor(Math.random() * choices.length)];
  }

  shootZuma(x, y) {
    if (!this.zuma || this.zuma.over) return;
    const origin = { x: 480, y: 535 };
    const angle = Phaser.Math.Angle.Between(origin.x, origin.y, x, y);
    this.zuma.projectiles.push({
      x: origin.x,
      y: origin.y,
      vx: Math.cos(angle) * 560,
      vy: Math.sin(angle) * 560,
      color: this.zuma.currentColor
    });
    this.zuma.currentColor = this.zuma.nextColor;
    this.zuma.nextColor = this.randomZumaColor();
  }

  insertZumaBall(projectile, hitIndex) {
    if (this.zuma.gap) {
      for (let index = 1; index < this.zuma.balls.length; index += 1) {
        this.zuma.balls[index].p = this.zuma.balls[index - 1].p - 0.034;
      }
      this.zuma.gap = null;
    }
    const hit = this.zuma.balls[hitIndex];
    const point = this.zumaPathPoint(hit.p);
    const beforePoint = this.zumaPathPoint(hit.p - 0.004);
    const afterPoint = this.zumaPathPoint(hit.p + 0.004);
    const tangentX = afterPoint.x - beforePoint.x;
    const tangentY = afterPoint.y - beforePoint.y;
    const projectileOffsetX = projectile.x - point.x;
    const projectileOffsetY = projectile.y - point.y;
    const insertBefore = projectileOffsetX * tangentX + projectileOffsetY * tangentY > 0;
    const insertIndex = insertBefore ? hitIndex : hitIndex + 1;
    const newBall = { color: projectile.color, p: hit.p + (insertBefore ? 0.017 : -0.017) };
    this.zuma.balls.splice(insertIndex, 0, newBall);
    for (let i = 1; i < this.zuma.balls.length; i += 1) {
      this.zuma.balls[i].p = Math.min(this.zuma.balls[i].p, this.zuma.balls[i - 1].p - 0.034);
    }
    this.resolveZumaMatches(insertIndex);
  }

  resolveZumaMatches(index) {
    const balls = this.zuma.balls;
    if (!balls[index]) return;
    const color = balls[index].color;
    let left = index;
    let right = index;
    while (left > 0 && balls[left - 1].color === color) left -= 1;
    while (right < balls.length - 1 && balls[right + 1].color === color) right += 1;
    const count = right - left + 1;
    if (count < 3) {
      this.zuma.combo = 0;
      return;
    }
    balls.splice(left, count);
    this.zuma.combo += 1;
    this.zuma.score += count * 110 * this.zuma.combo;
    this.zuma.gap = left > 0 && left < balls.length
      ? { frontEnd: left - 1, tailStart: left }
      : null;
    const available = new Set(balls.map((ball) => ball.color));
    if (balls.length && !available.has(this.zuma.currentColor)) this.zuma.currentColor = this.randomZumaColor();
    if (balls.length && !available.has(this.zuma.nextColor)) this.zuma.nextColor = this.randomZumaColor();
  }

  updateZuma(dt) {
    if (!this.zuma || this.zuma.over) return;
    const slow = this.now() < this.zuma.slowUntil;
    const speed = (0.017 + this.zuma.level * 0.0025) * (slow ? 0.45 : 1);
    this.zuma.spawnTimer += dt;
    if (this.zuma.spawned < this.zuma.target && this.zuma.spawnTimer >= 1.15) {
      this.zuma.spawnTimer = 0;
      const tailP = this.zuma.balls.length ? this.zuma.balls[this.zuma.balls.length - 1].p : -0.03;
      this.zuma.balls.push({ color: this.randomZumaColor(), p: Math.min(-0.03, tailP - 0.034) });
      this.zuma.spawned += 1;
    }
    if (this.zuma.balls.length) {
      this.zuma.balls[0].p += speed * dt;
      for (let i = 1; i < this.zuma.balls.length; i += 1) {
        const desired = this.zuma.balls[i - 1].p - 0.034;
        this.zuma.balls[i].p = Math.min(desired, this.zuma.balls[i].p + speed * dt);
      }
      if (this.zuma.gap) {
        const gap = this.zuma.gap;
        const front = this.zuma.balls[gap.frontEnd];
        const tail = this.zuma.balls[gap.tailStart];
        if (!front || !tail) {
          this.zuma.gap = null;
        } else {
          const distance = Math.max(0, front.p - tail.p - 0.034);
          const rollback = Math.min(distance, 0.13 * dt);
          for (let index = 0; index <= gap.frontEnd; index += 1) this.zuma.balls[index].p -= rollback;
          if (distance <= 0.001 || rollback >= distance) {
            this.zuma.gap = null;
            if (this.zuma.balls[gap.frontEnd]?.color === this.zuma.balls[gap.tailStart]?.color) {
              this.resolveZumaMatches(gap.tailStart);
            }
          }
        }
      }
      if (this.zuma.balls[0].p >= 0.995) {
        this.finishZuma(false);
        return;
      }
    }
    for (let i = this.zuma.projectiles.length - 1; i >= 0; i -= 1) {
      const projectile = this.zuma.projectiles[i];
      projectile.x += projectile.vx * dt;
      projectile.y += projectile.vy * dt;
      let hitIndex = -1;
      for (let ballIndex = 0; ballIndex < this.zuma.balls.length; ballIndex += 1) {
        const ball = this.zuma.balls[ballIndex];
        if (ball.p < 0) continue;
        const point = this.zumaPathPoint(ball.p);
        if (Phaser.Math.Distance.Between(projectile.x, projectile.y, point.x, point.y) < 24) {
          hitIndex = ballIndex;
          break;
        }
      }
      if (hitIndex >= 0) {
        this.insertZumaBall(projectile, hitIndex);
        this.zuma.projectiles.splice(i, 1);
      } else if (projectile.x < -30 || projectile.x > WIDTH + 30 || projectile.y < 130 || projectile.y > HEIGHT + 30) {
        this.zuma.projectiles.splice(i, 1);
      }
    }
    if (this.zuma.spawned >= this.zuma.target && this.zuma.balls.length === 0) this.finishZuma(true);
  }

  finishZuma(success) {
    if (!this.zuma || this.zuma.over) return;
    this.zuma.over = true;
    const score = this.zuma.score;
    const level = this.zuma.level;
    const result = Core.completeMiniGame(this.state, "zuma", score, success);
    this.showToast(`${success ? "虫害清理完成" : "队伍进仓了"}：堆肥 +${result.reward.amount}${result.festival ? "，丰收庆典完成！" : ""}`, success ? "good" : "normal", 3000);
    this.startZumaRound(success ? level + 1 : Math.max(1, level));
    this.zuma.score = Math.floor(score * 0.12);
  }

  useZumaSlow() {
    const result = Core.spendSun(this.state, 2);
    if (!result.ok) return this.showToast(result.reason, "bad");
    this.zuma.slowUntil = this.now() + 9000;
    this.showToast("时间露水生效：队伍减速 9 秒", "good");
  }

  useZumaBomb() {
    const result = Core.spendSun(this.state, 3);
    if (!result.ok) return this.showToast(result.reason, "bad");
    const removed = Math.min(4, this.zuma.balls.length);
    this.zuma.balls.splice(0, removed);
    this.zuma.score += removed * 70;
    this.showToast(`清理最前方 ${removed} 颗`, "good");
  }

  swapZumaColor() {
    if (!this.zuma) return;
    [this.zuma.currentColor, this.zuma.nextColor] = [this.zuma.nextColor, this.zuma.currentColor];
  }

  drawZumaBall(colorIndex, x, y, radius = 15) {
    const crop = Core.CROPS[colorIndex % 5];
    this.circle(x, y, radius, crop.color, C.ink, 2);
    this.circle(x - radius * 0.3, y - radius * 0.3, radius * 0.22, "rgba(255,255,255,0.6)");
    this.rect(x - 2, y - radius - 4, 4, 5, C.greenDark);
  }

  drawZuma() {
    if (!this.zuma) this.startZumaRound();
    this.text("田园祖玛", 22, 151, 18, C.ink, "left", 900);
    this.text("发射同色果实，三个以上相连即可清除", 123, 151, 10, C.greenDark, "left", 700);
    this.rounded(20, 169, 920, 43, 6, C.paper, C.ink, 2);
    this.text(`第 ${this.zuma.level} 轮`, 42, 191, 13, C.ink, "left", 900);
    this.text(`得分 ${this.zuma.score}`, 148, 191, 13, C.ink, "left", 900);
    this.text(`已放出 ${this.zuma.spawned}/${this.zuma.target}`, 285, 191, 12, C.greenDark, "left", 800);
    this.text("奖励：堆肥 + 品质祝福", 435, 191, 11, C.greenDark, "left", 800);
    this.button("减速 ☀2", 704, 175, 100, 30, "zuma-slow", {}, { fill: C.mint, size: 11 });
    this.button("清障 ☀3", 814, 175, 108, 30, "zuma-bomb", {}, { fill: C.yellowSoft, size: 11 });

    this.ctx.beginPath();
    for (let i = 0; i <= 100; i += 1) {
      const point = this.zumaPathPoint(i / 100);
      if (i === 0) this.ctx.moveTo(point.x, point.y);
      else this.ctx.lineTo(point.x, point.y);
    }
    this.ctx.strokeStyle = C.paper2;
    this.ctx.lineWidth = 34;
    this.ctx.stroke();
    this.ctx.strokeStyle = C.inkSoft;
    this.ctx.lineWidth = 3;
    this.ctx.stroke();
    this.rounded(866, 316, 70, 59, 6, C.soilDark, C.ink, 3);
    this.text("仓库", 901, 346, 12, C.paper, "center", 900);

    for (let i = this.zuma.balls.length - 1; i >= 0; i -= 1) {
      const ball = this.zuma.balls[i];
      if (ball.p < 0) continue;
      const point = this.zumaPathPoint(ball.p);
      this.drawZumaBall(ball.color, point.x, point.y, 15);
    }
    this.zuma.projectiles.forEach((projectile) => this.drawZumaBall(projectile.color, projectile.x, projectile.y, 11));

    this.circle(480, 535, 42, C.paper, C.ink, 3);
    this.drawZumaBall(this.zuma.currentColor, 480, 525, 18);
    this.text("发射", 480, 562, 10, C.ink, "center", 900);
    this.text("下一颗", 557, 514, 9, C.greenDark, "center", 800);
    this.drawZumaBall(this.zuma.nextColor, 557, 538, 12);
    this.button("换色", 609, 521, 70, 31, "zuma-swap", {}, { fill: C.cream, size: 11 });
    this.text("点击轨道附近发射 · 空格键换色 · 清空全部队列通关", WIDTH / 2, 605, 10, C.inkSoft, "center", 700);
  }

  createMatchBoard() {
    const rows = 7;
    const cols = 7;
    const board = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        let value;
        do {
          value = Math.floor(Math.random() * 6);
        } while (
          (col >= 2 && board[row][col - 1] === value && board[row][col - 2] === value)
          || (row >= 2 && board[row - 1][col] === value && board[row - 2][col] === value)
        );
        board[row][col] = value;
      }
    }
    return board;
  }

  findValidMatchSwap(board) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        for (const [dr, dc] of [[0, 1], [1, 0]]) {
          const otherRow = row + dr;
          const otherCol = col + dc;
          if (otherRow >= 7 || otherCol >= 7) continue;
          [board[row][col], board[otherRow][otherCol]] = [board[otherRow][otherCol], board[row][col]];
          const valid = this.findMatches(board).size > 0;
          [board[row][col], board[otherRow][otherCol]] = [board[otherRow][otherCol], board[row][col]];
          if (valid) return [{ row, col }, { row: otherRow, col: otherCol }];
        }
      }
    }
    return null;
  }

  startMatch3Round(level = 1) {
    let board;
    do board = this.createMatchBoard();
    while (!this.findValidMatchSwap(board));
    this.match3 = {
      level,
      board,
      selected: null,
      score: 0,
      moves: 20,
      targetColor: (level + 1) % 6,
      target: 16 + level * 2,
      collected: 0,
      combo: 0,
      selectedAt: 0,
      animation: null,
      lockedUntil: 0,
      pendingFinish: null,
      pendingShuffle: false
    };
  }

  findMatches(board = this.match3.board) {
    const matches = new Set();
    for (let row = 0; row < 7; row += 1) {
      let run = 1;
      for (let col = 1; col <= 7; col += 1) {
        if (col < 7 && board[row][col] === board[row][col - 1]) run += 1;
        else {
          if (run >= 3) for (let offset = 1; offset <= run; offset += 1) matches.add(`${row},${col - offset}`);
          run = 1;
        }
      }
    }
    for (let col = 0; col < 7; col += 1) {
      let run = 1;
      for (let row = 1; row <= 7; row += 1) {
        if (row < 7 && board[row][col] === board[row - 1][col]) run += 1;
        else {
          if (run >= 3) for (let offset = 1; offset <= run; offset += 1) matches.add(`${row - offset},${col}`);
          run = 1;
        }
      }
    }
    return matches;
  }

  cloneMatchBoard(board) {
    return board.map((row) => [...row]);
  }

  collapseMatchBoard() {
    const nextBoard = Array.from({ length: 7 }, () => Array(7).fill(null));
    const moves = [];
    for (let col = 0; col < 7; col += 1) {
      const survivors = [];
      for (let row = 6; row >= 0; row -= 1) {
        const color = this.match3.board[row][col];
        if (color != null) survivors.push({ color, fromRow: row });
      }
      let targetRow = 6;
      survivors.forEach((entry) => {
        nextBoard[targetRow][col] = entry.color;
        moves.push({ ...entry, col, toRow: targetRow, isNew: false });
        targetRow -= 1;
      });
      let spawnIndex = 0;
      while (targetRow >= 0) {
        const color = Math.floor(Math.random() * 6);
        nextBoard[targetRow][col] = color;
        moves.push({ color, col, fromRow: -1 - spawnIndex, toRow: targetRow, isNew: true });
        targetRow -= 1;
        spawnIndex += 1;
      }
    }
    this.match3.board = nextBoard;
    return moves;
  }

  startMatchResolutionAnimation(beforeSwap, first, second, swappedBoard, steps) {
    const segments = [];
    let cursor = this.now();
    segments.push({
      type: "swap",
      board: beforeSwap,
      first,
      second,
      startedAt: cursor,
      duration: 190
    });
    cursor += 190;
    steps.forEach((step) => {
      segments.push({ type: "pop", ...step, startedAt: cursor, duration: 220 });
      cursor += 220;
      segments.push({ type: "fall", ...step, startedAt: cursor, duration: 270 });
      cursor += 270;
    });
    this.match3.animation = {
      type: "resolution",
      swappedBoard,
      segments,
      startedAt: this.now(),
      until: cursor
    };
    this.match3.lockedUntil = cursor;
  }

  startInvalidMatchAnimation(board, first, second) {
    const startedAt = this.now();
    this.match3.animation = {
      type: "invalid",
      segments: [{ type: "invalid", board, first, second, startedAt, duration: 360 }],
      startedAt,
      until: startedAt + 360
    };
    this.match3.lockedUntil = startedAt + 360;
  }

  startMatchShuffleAnimation(before) {
    const startedAt = this.now();
    this.match3.animation = {
      type: "shuffle",
      segments: [{
        type: "shuffle",
        before,
        after: this.cloneMatchBoard(this.match3.board),
        startedAt,
        duration: 440
      }],
      startedAt,
      until: startedAt + 440
    };
    this.match3.lockedUntil = startedAt + 440;
  }

  resolveMatchBoard(animation = null) {
    let chain = 0;
    const steps = [];
    while (chain < 10) {
      const matches = this.findMatches();
      if (!matches.size) break;
      chain += 1;
      const before = this.cloneMatchBoard(this.match3.board);
      const removed = [];
      for (const key of matches) {
        const [row, col] = key.split(",").map(Number);
        const color = this.match3.board[row][col];
        removed.push({ row, col, color });
        this.match3.board[row][col] = null;
      }
      const targetRemoved = removed.filter((entry) => entry.color === this.match3.targetColor).length;
      this.match3.collected += targetRemoved;
      this.match3.score += removed.length * 60 * chain;
      const moves = this.collapseMatchBoard();
      steps.push({
        chain,
        before,
        after: this.cloneMatchBoard(this.match3.board),
        removed,
        moves,
        points: removed.length * 60 * chain
      });
    }
    this.match3.combo = chain;
    if (animation && steps.length) {
      this.startMatchResolutionAnimation(animation.beforeSwap, animation.first, animation.second, animation.swappedBoard, steps);
    }
    return chain;
  }

  clickMatchCell(row, col) {
    if (!this.match3 || this.now() < this.match3.lockedUntil) return;
    if (!this.match3.selected) {
      this.match3.selected = { row, col };
      this.match3.selectedAt = this.now();
      return;
    }
    const first = this.match3.selected;
    this.match3.selected = null;
    const adjacent = Math.abs(first.row - row) + Math.abs(first.col - col) === 1;
    if (!adjacent) {
      this.match3.selected = { row, col };
      this.match3.selectedAt = this.now();
      return;
    }
    const board = this.match3.board;
    const beforeSwap = this.cloneMatchBoard(board);
    [board[first.row][first.col], board[row][col]] = [board[row][col], board[first.row][first.col]];
    const matches = this.findMatches();
    if (!matches.size) {
      [board[first.row][first.col], board[row][col]] = [board[row][col], board[first.row][first.col]];
      this.startInvalidMatchAnimation(beforeSwap, first, { row, col });
      this.showToast("这一步不能形成消除", "bad", 900);
      return;
    }
    const swappedBoard = this.cloneMatchBoard(board);
    this.match3.moves -= 1;
    this.resolveMatchBoard({ beforeSwap, first, second: { row, col }, swappedBoard });
    if (this.match3.collected >= this.match3.target) this.match3.pendingFinish = true;
    else if (this.match3.moves <= 0) this.match3.pendingFinish = false;
    else if (!this.findValidMatchSwap(this.match3.board)) {
      this.match3.pendingShuffle = true;
    }
  }

  shuffleMatch3() {
    if (this.now() < this.match3.lockedUntil) return;
    const result = Core.spendSun(this.state, 2);
    if (!result.ok) return this.showToast(result.reason, "bad");
    const before = this.cloneMatchBoard(this.match3.board);
    do this.match3.board = this.createMatchBoard();
    while (!this.findValidMatchSwap(this.match3.board));
    this.match3.selected = null;
    this.startMatchShuffleAnimation(before);
    this.showToast("棋盘已重新排列");
  }

  finishMatch3(success) {
    const score = this.match3.score;
    const level = this.match3.level;
    const result = Core.completeMiniGame(this.state, "match3", score, success);
    this.showToast(`${success ? "订单装箱完成" : "步数用完"}：订单印章 +${result.reward.amount}${result.festival ? "，丰收庆典完成！" : ""}`, success ? "good" : "normal", 3000);
    this.startMatch3Round(success ? level + 1 : Math.max(1, level));
    this.match3.score = Math.floor(score * 0.1);
  }

  drawGem(value, x, y, size, selected = false, options = {}) {
    if (value == null) return;
    const crop = Core.CROPS[value];
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.translate(x, y);
    const scale = options.scale ?? 1;
    ctx.scale(scale, scale);
    ctx.rotate(options.rotation ?? 0);
    if (options.glow) {
      ctx.shadowColor = options.glow;
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.moveTo(0, -size * 0.46);
    ctx.lineTo(size * 0.43, -size * 0.16);
    ctx.lineTo(size * 0.31, size * 0.43);
    ctx.lineTo(-size * 0.31, size * 0.43);
    ctx.lineTo(-size * 0.43, -size * 0.16);
    ctx.closePath();
    ctx.fillStyle = selected ? C.yellow : crop.color;
    ctx.fill();
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = selected ? 4 : 2;
    ctx.stroke();
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    ctx.fillRect(-size * 0.18, -size * 0.24, size * 0.14, size * 0.14);
    ctx.restore();
  }

  activeMatchSegment() {
    if (!this.match3.animation) return null;
    return this.match3.animation.segments.find((segment) => (
      this.frameNow >= segment.startedAt && this.frameNow <= segment.startedAt + segment.duration
    )) || null;
  }

  drawMatchBoardCells(startX, startY, cell) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        const x = startX + col * cell;
        const y = startY + row * cell;
        this.rect(x + 2, y + 2, cell - 4, cell - 4, (row + col) % 2 ? "#f8efca" : "#fff9df");
        this.addHit("match-cell", x, y, cell, cell, { row, col });
      }
    }
  }

  drawStaticMatchBoard(board, startX, startY, cell, excluded = [], selected = null) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        if (excluded.some((entry) => entry.row === row && entry.col === col)) continue;
        const isSelected = selected?.row === row && selected?.col === col;
        const pulse = isSelected ? 1 + Math.sin((this.frameNow - this.match3.selectedAt) / 110) * 0.055 : 1;
        this.drawGem(board[row][col], startX + col * cell + cell / 2, startY + row * cell + cell / 2, 38, isSelected, {
          scale: pulse,
          glow: isSelected ? C.yellow : null
        });
      }
    }
  }

  drawMatchAnimation(startX, startY, cell) {
    const segment = this.activeMatchSegment();
    if (!segment) {
      this.drawStaticMatchBoard(this.match3.board, startX, startY, cell, [], this.match3.selected);
      return;
    }
    const progress = clamp01((this.frameNow - segment.startedAt) / segment.duration);
    if (segment.type === "swap" || segment.type === "invalid") {
      const { first, second, board } = segment;
      this.drawStaticMatchBoard(board, startX, startY, cell, [first, second]);
      let travel;
      if (segment.type === "invalid") {
        travel = progress < 0.5 ? easeInOut(progress * 2) : 1 - easeInOut((progress - 0.5) * 2);
      } else {
        travel = easeInOut(progress);
      }
      const firstX = startX + (first.col + (second.col - first.col) * travel) * cell + cell / 2;
      const firstY = startY + (first.row + (second.row - first.row) * travel) * cell + cell / 2;
      const secondX = startX + (second.col + (first.col - second.col) * travel) * cell + cell / 2;
      const secondY = startY + (second.row + (first.row - second.row) * travel) * cell + cell / 2;
      const bump = 1 + Math.sin(progress * Math.PI) * 0.08;
      this.drawGem(board[first.row][first.col], firstX, firstY, 38, false, { scale: bump, glow: C.yellow });
      this.drawGem(board[second.row][second.col], secondX, secondY, 38, false, { scale: bump, glow: C.yellow });
      return;
    }
    if (segment.type === "pop") {
      const removedKeys = new Set(segment.removed.map((entry) => `${entry.row},${entry.col}`));
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 7; col += 1) {
          const removed = removedKeys.has(`${row},${col}`);
          const burst = Math.sin(progress * Math.PI);
          this.drawGem(segment.before[row][col], startX + col * cell + cell / 2, startY + row * cell + cell / 2, 38, false, {
            scale: removed ? 1 + burst * 0.3 : 1,
            alpha: removed ? 1 - easeInOut(progress) : 1,
            rotation: removed ? burst * 0.18 : 0,
            glow: removed ? C.yellow : null
          });
        }
      }
      segment.removed.forEach((entry, index) => {
        const centerX = startX + entry.col * cell + cell / 2;
        const centerY = startY + entry.row * cell + cell / 2;
        for (let particle = 0; particle < 6; particle += 1) {
          const angle = particle * Math.PI / 3 + index * 0.31;
          const distance = easeOut(progress) * (18 + particle * 2);
          const size = Math.max(1, 5 * (1 - progress));
          this.rect(
            centerX + Math.cos(angle) * distance - size / 2,
            centerY + Math.sin(angle) * distance - size / 2,
            size,
            size,
            particle % 2 ? C.coral : C.yellow
          );
        }
      });
      this.ctx.save();
      this.ctx.globalAlpha = 1 - progress;
      this.text(
        `${segment.chain > 1 ? `连锁 ×${segment.chain}  ` : ""}+${segment.points}`,
        startX + cell * 7 + 88,
        startY + 120 - progress * 22,
        15 + Math.sin(progress * Math.PI) * 3,
        C.coralDark,
        "center",
        900
      );
      this.ctx.restore();
      return;
    }
    if (segment.type === "fall") {
      const fall = easeInOut(progress);
      segment.moves.forEach((entry) => {
        const row = entry.fromRow + (entry.toRow - entry.fromRow) * fall;
        const bounce = entry.isNew ? Math.sin(progress * Math.PI) * 0.04 : 0;
        if (entry.fromRow !== entry.toRow && progress < 0.88) {
          const trailRow = row - Math.sign(entry.toRow - entry.fromRow) * 0.2;
          this.drawGem(entry.color, startX + entry.col * cell + cell / 2, startY + trailRow * cell + cell / 2, 38, false, {
            alpha: 0.16 * (1 - progress),
            scale: 0.92
          });
        }
        this.drawGem(entry.color, startX + entry.col * cell + cell / 2, startY + row * cell + cell / 2, 38, false, {
          scale: 1 + bounce
        });
      });
      return;
    }
    if (segment.type === "shuffle") {
      if (progress < 0.5) {
        const fade = progress * 2;
        for (let row = 0; row < 7; row += 1) {
          for (let col = 0; col < 7; col += 1) {
            const direction = (row + col) % 2 ? 1 : -1;
            this.drawGem(segment.before[row][col], startX + col * cell + cell / 2 + direction * fade * 18, startY + row * cell + cell / 2, 38, false, {
              alpha: 1 - fade,
              scale: 1 - fade * 0.3
            });
          }
        }
      } else {
        const appear = easeOut((progress - 0.5) * 2);
        for (let row = 0; row < 7; row += 1) {
          for (let col = 0; col < 7; col += 1) {
            this.drawGem(segment.after[row][col], startX + col * cell + cell / 2, startY + row * cell + cell / 2, 38, false, {
              alpha: appear,
              scale: 0.65 + appear * 0.35
            });
          }
        }
      }
    }
  }

  drawMatch3() {
    if (!this.match3) this.startMatch3Round();
    const targetCrop = Core.CROPS[this.match3.targetColor];
    this.text("订单消消乐", 22, 151, 18, C.ink, "left", 900);
    this.text("交换相邻蔬菜，三枚以上连成一线", 142, 151, 10, C.greenDark, "left", 700);
    this.rounded(20, 169, 920, 43, 6, C.paper, C.ink, 2);
    this.text(`第 ${this.match3.level} 单`, 42, 191, 13, C.ink, "left", 900);
    this.text(`得分 ${this.match3.score}`, 148, 191, 13, C.ink, "left", 900);
    this.text(`剩余 ${this.match3.moves} 步`, 285, 191, 12, C.coralDark, "left", 900);
    this.drawCropIcon(targetCrop.id, 440, 191, 0.5);
    this.text(`${targetCrop.name} ${this.match3.collected}/${this.match3.target}`, 459, 191, 11, C.greenDark, "left", 900);
    this.text("奖励：订单印章", 615, 191, 11, C.greenDark, "left", 800);
    this.button("重排 ☀2", 818, 175, 104, 30, "match-shuffle", {}, { fill: C.yellowSoft, size: 11 });

    const startX = 250;
    const startY = 223;
    const cell = 54;
    this.rounded(startX - 12, startY - 12, cell * 7 + 24, cell * 7 + 24, 7, C.paper2, C.ink, 3);
    this.drawMatchBoardCells(startX, startY, cell);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(startX, startY, cell * 7, cell * 7);
    this.ctx.clip();
    this.drawMatchAnimation(startX, startY, cell);
    this.ctx.restore();
    this.rounded(675, 246, 226, 172, 7, C.cream, C.ink, 2);
    this.text("本单装箱进度", 694, 268, 14, C.ink, "left", 900);
    this.drawCropIcon(targetCrop.id, 716, 315, 0.9);
    this.rect(751, 298, 125, 14, C.paper2, C.ink, 1);
    this.rect(751, 298, 125 * Math.min(1, this.match3.collected / this.match3.target), 14, C.green);
    this.text(`${this.match3.collected} / ${this.match3.target}`, 813, 333, 12, C.ink, "center", 900);
    this.text(`连锁 ×${this.match3.combo}`, 694, 372, 12, C.coralDark, "left", 800);
    this.text("完成后获得印章", 694, 396, 10, C.greenDark, "left", 700);
    this.text("订单印章会自动让农场下一张交付订单增加 25% 金币", WIDTH / 2, 620, 10, C.inkSoft, "center", 700);
  }

  async togglePin() {
    this.state.alwaysOnTop = !this.state.alwaysOnTop;
    if (window.desktop) this.state.alwaysOnTop = await window.desktop.setAlwaysOnTop(this.state.alwaysOnTop);
    this.showToast(this.state.alwaysOnTop ? "窗口已置顶" : "已取消置顶", this.state.alwaysOnTop ? "good" : "normal");
  }

  handlePointer(x, y, rightButton = false) {
    const hit = [...this.hits].reverse().find((entry) => x >= entry.x && x <= entry.x + entry.w && y >= entry.y && y <= entry.y + entry.h);
    if (hit && !hit.disabled) {
      if (hit.type === "nav") this.switchView(hit.view);
      else if (hit.type === "pin") this.togglePin();
      else if (hit.type === "plot") this.usePlot(hit.index);
      else if (hit.type === "deliver") {
        const result = Core.deliverOrder(this.state, hit.orderId);
        this.showToast(result.ok ? `订单完成，获得 ￥${result.coins}${result.sealUsed ? "（印章加成）" : ""}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "seed-select") {
        const crop = Core.cropById(hit.cropId);
        if (crop.level <= this.state.level) this.state.selected = { type: "seed", id: crop.id };
        else this.showToast(`农场 ${crop.level} 级解锁`, "bad");
      } else if (hit.type === "seed-buy") {
        const result = Core.buySeeds(this.state, hit.cropId, 3);
        this.showToast(result.ok ? `补充 ${Core.cropById(hit.cropId).name}种子 ×3` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "tool") {
        if (hit.tool === "seed") {
          this.state.selected = { type: "seed", id: Core.cropById(this.state.selected.id)?.id || "radish" };
        }
        else this.state.selected = { type: hit.tool };
      } else if (hit.type === "sell") {
        const result = Core.sellAll(this.state);
        this.showToast(result.ok ? `全部出售，收入 ￥${result.value}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "buy-shop") {
        const result = Core.buyShopItem(this.state, hit.itemId);
        this.showToast(result.ok ? `${result.item.name}购买成功` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "place-auto") {
        if (Core.unplacedAutomation(this.state, hit.itemId) > 0 || this.state.automationSlots[hit.itemId].length > 0) {
          this.state.selected = { type: "automation", id: hit.itemId };
          this.switchView("farm");
        } else this.showToast("请先购买一台设备", "bad");
      } else if (hit.type === "exchange") {
        const result = Core.exchangeSeedTicket(this.state);
        this.showToast(result.ok ? `兑换到 ${result.crop.name}种子 ×${result.amount}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "unlock-land") {
        const result = Core.unlockNextPlot(this.state);
        this.showToast(result.ok ? "新土地已解锁" : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "research") {
        const result = Core.buyResearch(this.state, hit.researchId);
        this.showToast(result.ok ? `${result.entry.name}升级完成` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "link-cell") this.clickLinkCell(hit.row, hit.col);
      else if (hit.type === "link-hint") this.hintLink();
      else if (hit.type === "link-shuffle") this.shuffleLink(true);
      else if (hit.type === "zuma-slow") this.useZumaSlow();
      else if (hit.type === "zuma-bomb") this.useZumaBomb();
      else if (hit.type === "zuma-swap") this.swapZumaColor();
      else if (hit.type === "match-cell") this.clickMatchCell(hit.row, hit.col);
      else if (hit.type === "match-shuffle") this.shuffleMatch3();
      this.save(true);
      this.render();
      return;
    }
    if (this.state.view === "zuma" && !rightButton && y > 205) this.shootZuma(x, y);
    if (this.state.view === "zuma" && rightButton) this.swapZumaColor();
  }

  textState() {
    const visiblePlots = this.state.plots.map((plot, index) => ({
      index,
      unlocked: index < this.state.unlockedPlots,
      soil: plot.soil,
      sprinkler: this.state.automationSlots.sprinkler.includes(index),
      harvester: this.state.automationSlots.harvester.includes(index),
      crop: plot.crop ? {
        id: plot.crop.cropId,
        progress: Number(Core.cropProgress(plot, this.now()).toFixed(2)),
        watered: plot.crop.watered,
        fertilized: plot.crop.fertilized
      } : null
    }));
    const payload = {
      coordinateSystem: "960x640，原点左上，x向右，y向下",
      view: this.state.view,
      resources: {
        coins: this.state.coins,
        seedTickets: this.state.seedTickets,
        compost: this.state.compost,
        orderSeals: this.state.orderSeals,
        sun: this.state.sun,
        stars: this.state.stars
      },
      farm: {
        level: this.state.level,
        xp: `${this.state.xp}/${Core.xpNeeded(this.state.level)}`,
        unlockedPlots: this.state.unlockedPlots,
        plots: visiblePlots,
        seeds: Object.fromEntries(Core.CROPS.map((crop) => [crop.id, this.state.seeds[crop.id]])),
        produce: Object.fromEntries(Core.CROPS.map((crop) => [crop.id, this.state.produce[crop.id]])),
        orders: this.state.orders.map((order) => ({ ...order, stocked: this.state.produce[order.cropId] }))
      },
      festival: this.state.festival,
      selected: this.state.selected
    };
    if (this.state.view === "link" && this.link) {
      payload.link = {
        score: this.link.score,
        seconds: Math.max(0, Math.ceil((this.link.endAt - this.now()) / 1000)),
        remaining: this.link.board.flat().filter((value) => value != null).length,
        selected: this.link.selected,
        animating: this.now() < this.link.lockedUntil
      };
    }
    if (this.state.view === "zuma" && this.zuma) {
      payload.zuma = {
        level: this.zuma.level,
        score: this.zuma.score,
        chainLength: this.zuma.balls.length,
        spawned: `${this.zuma.spawned}/${this.zuma.target}`,
        currentColor: this.zuma.currentColor,
        nextColor: this.zuma.nextColor
      };
    }
    if (this.state.view === "match3" && this.match3) {
      payload.match3 = {
        level: this.match3.level,
        score: this.match3.score,
        moves: this.match3.moves,
        objective: `${this.match3.collected}/${this.match3.target}`,
        selected: this.match3.selected,
        animation: this.activeMatchSegment()?.type || null
      };
    }
    return JSON.stringify(payload);
  }
}

let appInstance;

class MainScene extends Phaser.Scene {
  constructor() {
    super("main");
  }

  create() {
    appInstance = new HarvestCollection(this);
    window.render_game_to_text = () => appInstance.textState();
    window.advanceTime = (milliseconds) => {
      const steps = Math.max(1, Math.ceil(milliseconds / 16.67));
      const dt = milliseconds / 1000 / steps;
      const timeStep = milliseconds / steps;
      for (let index = 0; index < steps; index += 1) {
        appInstance.timeOffset += timeStep;
        appInstance.update(dt, false);
      }
      appInstance.render();
    };
    window.__uuHarvest = {
      getState: () => appInstance.state,
      reset: () => {
        appInstance.state = Core.createDefaultState();
        appInstance.link = null;
        appInstance.zuma = null;
        appInstance.match3 = null;
        appInstance.switchView("farm");
        appInstance.save(true);
      },
      setView: (view) => appInstance.switchView(view),
      completeMini: (type, score = 1000) => Core.completeMiniGame(appInstance.state, type, score, true),
      forceMature: () => {
        appInstance.state.plots.forEach((plot) => {
          if (plot.crop) plot.crop.finishAt = appInstance.now() - 1;
        });
        appInstance.render();
      },
      app: appInstance
    };
  }

  update(_time, delta) {
    if (appInstance) appInstance.update(delta / 1000);
  }
}

new Phaser.Game({
  type: Phaser.CANVAS,
  parent: "game-root",
  width: WIDTH,
  height: HEIGHT,
  backgroundColor: C.mint,
  pixelArt: false,
  antialias: true,
  render: {
    pixelArt: false,
    antialias: true,
    roundPixels: true
  },
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: WIDTH,
    height: HEIGHT
  },
  input: {
    mouse: {
      preventDefaultWheel: true
    }
  },
  scene: [MainScene]
});
