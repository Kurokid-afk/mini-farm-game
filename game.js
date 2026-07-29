import Phaser from "phaser";
import cropSheetUrl from "./assets/crops.png?url";
import petPortraitsUrl from "./assets/pet-portraits.png?url";
import petSpritesUrl from "./assets/pet-sprites.png?url";
import petFacilitiesUrl from "./assets/pet-facilities-v2.png?url";
import petGardenBackgroundUrl from "./assets/pet-garden-bg.png?url";
import "./game-core.js";

const Core = window.UUHarvestCore;
const MOBILE_LAYOUT = new URLSearchParams(window.location.search).get("mobile") === "1";
const WIDTH = MOBILE_LAYOUT ? 640 : 960;
const HEIGHT = MOBILE_LAYOUT ? 960 : 640;
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
  match3: "益智屋",
  market: "集市",
  pets: "宠物园"
};

const LINK_SYMBOLS = [
  { name: "萝卜", background: "#fff0e7", accent: "#e7684f" },
  { name: "白菜", background: "#eef8df", accent: "#4f9b5e" },
  { name: "土豆", background: "#f4e7cc", accent: "#a96f3d" },
  { name: "番茄", background: "#ffe8e3", accent: "#d94b4b" },
  { name: "玉米", background: "#fff5c9", accent: "#d4a82d" },
  { name: "草莓", background: "#ffe6ed", accent: "#c93d63" },
  { name: "茄子", background: "#f2e8fa", accent: "#8054a6" },
  { name: "南瓜", background: "#fff0d8", accent: "#df8438" },
  { name: "蘑菇", background: "#f9e8e5", accent: "#b95c67" },
  { name: "豌豆", background: "#e4f5e7", accent: "#3d9160" }
];

const LINK_FLOW_MODES = [
  { id: "down", name: "雨落田", description: "配对后向下收拢" },
  { id: "left", name: "归仓田", description: "配对后向左归仓" },
  { id: "center", name: "聚拢田", description: "配对后向中间靠拢" },
  { id: "up", name: "向阳田", description: "配对后向上生长" }
];

const MATCH_TILES = [
  { name: "萝卜", label: "萝", color: "#f06f91", ink: "#782b45", shape: "round" },
  { name: "白菜", label: "菜", color: "#4da960", ink: "#1f5a35", shape: "square" },
  { name: "土豆", label: "薯", color: "#b97a3e", ink: "#5d351f", shape: "hex" },
  { name: "番茄", label: "番", color: "#df3f43", ink: "#742127", shape: "diamond" },
  { name: "玉米", label: "玉", color: "#f0c62d", ink: "#665119", shape: "capsule" },
  { name: "茄子", label: "茄", color: "#7650a8", ink: "#3e285d", shape: "flower" },
  { name: "南瓜", label: "南", color: "#eb842f", ink: "#783f1f", shape: "star" },
  { name: "蓝莓", label: "蓝", color: "#3f78c5", ink: "#203f73", shape: "drop" }
];

const MATCH_PALETTES = [
  [0, 1, 2, 3, 4, 5, 6],
  [1, 2, 3, 4, 5, 6, 7],
  [0, 1, 3, 4, 5, 6, 7],
  [0, 1, 2, 3, 5, 6, 7]
];

const MERGE_TILES = [
  { name: "种子", label: "种", color: "#f3e2a7", ink: "#6e5a2d" },
  { name: "嫩芽", label: "芽", color: "#b9dda0", ink: "#35673d" },
  { name: "菜苗", label: "苗", color: "#74bf70", ink: "#245b35" },
  { name: "鲜蔬", label: "菜", color: "#57a6b7", ink: "#244f66" },
  { name: "菜篮", label: "篮", color: "#f0a653", ink: "#6f3d20" },
  { name: "菜筐", label: "筐", color: "#ee796b", ink: "#743432" },
  { name: "货车", label: "车", color: "#9c78b5", ink: "#493064" },
  { name: "仓库", label: "仓", color: "#4d93ad", ink: "#203f55" }
];

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
    this.match3 = null;
    this.merge = null;
    this.puzzleMode = "match3";
    this.robotJobs = [];
    this.actionEffects = [];
    this.maturePlots = new Set();
    this.marketTab = "growth";
    this.mobileMarketPage = 0;
    this.petShopTab = "pets";
    this.mobilePetPage = 0;
    this.touchStart = null;
    this.lastRobotScan = 0;
    this.frameNow = this.now();
    this.cropSheet = new Image();
    this.cropSheet.src = cropSheetUrl;
    this.cropSheet.onload = () => this.render();
    this.petPortraits = new Image();
    this.petPortraits.src = petPortraitsUrl;
    this.petPortraits.onload = () => this.render();
    this.petSprites = new Image();
    this.petSprites.src = petSpritesUrl;
    this.petSprites.onload = () => {
      this.petSpriteCanvas = this.pixelateSpriteSheet(this.prepareChromaSprite(this.petSprites, 30), 6, 4, 60);
      this.render();
    };
    this.petFacilities = new Image();
    this.petFacilities.src = petFacilitiesUrl;
    this.petFacilities.onload = () => {
      this.petFacilityCanvas = this.pixelateSpriteSheet(this.prepareChromaSprite(this.petFacilities), 4, 3, 32);
      this.render();
    };
    this.petGardenBackground = new Image();
    this.petGardenBackground.src = petGardenBackgroundUrl;
    this.petGardenBackground.onload = () => {
      this.render();
    };
    this.surface = scene.textures.createCanvas("uu-surface", WIDTH, HEIGHT);
    this.ctx = this.surface.context;
    this.image = scene.add.image(WIDTH / 2, HEIGHT / 2, "uu-surface");
    this.image.setDisplaySize(WIDTH, HEIGHT);

    scene.input.on("pointermove", (pointer) => {
      this.hover = { x: pointer.x, y: pointer.y };
    });
    scene.input.on("pointerdown", (pointer) => {
      this.touchStart = { x: pointer.x, y: pointer.y, at: this.now() };
      this.handlePointer(pointer.x, pointer.y, pointer.rightButtonDown());
    });
    scene.input.on("pointerup", (pointer) => {
      if (!MOBILE_LAYOUT || this.state.view !== "match3" || this.puzzleMode !== "merge" || !this.touchStart) {
        this.touchStart = null;
        return;
      }
      const dx = pointer.x - this.touchStart.x;
      const dy = pointer.y - this.touchStart.y;
      this.touchStart = null;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 36) return;
      this.moveMerge(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up"));
    });
    scene.input.mouse?.disableContextMenu();

    scene.input.keyboard.on("keydown-F", () => this.toggleFullscreen());
    scene.input.keyboard.on("keydown-ESC", () => {
      if (scene.scale.isFullscreen) scene.scale.stopFullscreen();
    });
    scene.input.keyboard.on("keydown", (event) => {
      if (this.state.view !== "match3" || this.puzzleMode !== "merge") return;
      const directions = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
        w: "up",
        s: "down",
        a: "left",
        d: "right"
      };
      const direction = directions[event.key];
      if (direction) {
        event.preventDefault();
        this.moveMerge(direction);
      }
    });

    window.addEventListener("beforeunload", () => this.save(true));
    window.desktop?.onClosing(() => this.save(true));
    if (window.desktop && this.state.alwaysOnTop) window.desktop.setAlwaysOnTop(true);
    if (this.state.view !== "farm" && this.state.view !== "market") this.ensureMiniGame(this.state.view);
    this.state.plots.forEach((plot, index) => {
      if (plot.crop && Core.cropProgress(plot, this.now()) >= 1) this.maturePlots.add(index);
    });
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
    if (this.state.petGarden.unlocked) Core.syncPetGarden(this.state, this.frameNow);
    if (this.link?.pendingFinish && this.frameNow >= this.link.lockedUntil) {
      this.completeLinkBoard();
    } else if (this.link?.pendingShuffle && this.frameNow >= this.link.lockedUntil) {
      this.link.pendingShuffle = false;
      this.shuffleLink(false);
      this.showToast("没有可消除组合，棋盘已自动重排");
    }
    if (this.match3?.pendingMilestone && this.frameNow >= this.match3.lockedUntil) {
      this.match3.pendingMilestone = false;
      this.completeMatchMilestone();
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
    this.scanMaturityEffects();
    this.actionEffects = this.actionEffects.filter((effect) => this.frameNow <= effect.until);
    this.updateAutomationRobots();
    if (this.toast && this.frameNow > this.toast.until) this.toast = null;
    this.save();
    if (shouldRender) this.render();
  }

  showToast(text, tone = "normal", duration = 1800) {
    const startedAt = this.now();
    this.toast = { text, tone, startedAt, until: startedAt + duration };
  }

  advanceFestival(type, amount) {
    const result = Core.advanceFestival(this.state, type, amount);
    if (!result.ok) return result;
    if (result.festival) {
      this.addActionEffect("ui-success", {
        x: MOBILE_LAYOUT ? 500 : 800,
        y: MOBILE_LAYOUT ? 850 : 570,
        color: C.yellow,
        view: this.state.view
      }, 1100);
      this.showToast(
        `第 ${result.festival.count} 轮庆典完成：金币 +${result.festival.coins}、丰收星 +1`,
        "good",
        2800
      );
    } else if (result.completed) {
      this.showToast(`${GAME_NAMES[type]}庆典目标完成，换个玩法继续集章`, "good", 1800);
    }
    return result;
  }

  miniGiftLabel(bonus) {
    if (!bonus) return "";
    if (bonus.type === "coins") return `，游园礼袋：金币 +${bonus.amount}`;
    if (bonus.type === "sun") return `，游园礼袋：阳光 +${bonus.amount}`;
    return "，游园礼袋：三种物资各 +1";
  }

  addActionEffect(type, data = {}, duration = 700) {
    const startedAt = this.now();
    this.actionEffects.push({
      type,
      view: Object.prototype.hasOwnProperty.call(data, "view") ? data.view : this.state.view,
      ...data,
      startedAt,
      until: startedAt + duration,
      duration
    });
  }

  addResourceEffect(kind, delta, view = null) {
    if (!delta) return;
    this.addActionEffect("resource", { kind, delta, view }, 950);
  }

  effectProgress(effect) {
    return clamp01((this.frameNow - effect.startedAt) / effect.duration);
  }

  scanMaturityEffects() {
    this.state.plots.forEach((plot, index) => {
      const mature = plot.crop && Core.cropProgress(plot, this.frameNow) >= 1;
      if (mature && !this.maturePlots.has(index)) {
        this.maturePlots.add(index);
        this.addActionEffect("plot-mature", { plotIndex: index, view: "farm" }, 1100);
      }
      if (!mature) this.maturePlots.delete(index);
    });
  }

  switchView(view) {
    if (!["farm", "link", "match3", "market", "pets"].includes(view)) view = "farm";
    if (view === "pets" && !this.state.petGarden.unlocked) {
      if (this.state.view !== "market") this.state.view = "market";
      this.showToast("先在集市购买宠物园地契", "normal");
      this.addActionEffect("view-transition", { view: this.state.view }, 320);
      this.render();
      return;
    }
    const previousView = this.state.view;
    if (previousView !== view) this.toast = null;
    this.state.view = view;
    this.state.selected = view === "farm" ? this.state.selected : this.state.selected;
    this.ensureMiniGame(view);
    if (previousView !== view) this.addActionEffect("view-transition", { view }, 320);
    this.save(true);
    this.render();
  }

  ensureMiniGame(view) {
    if (view === "link" && !this.link) this.startLinkRound();
    if (view === "match3") {
      if (!this.match3) this.startMatch3Round();
      if (!this.merge) this.startMergeGame();
    }
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
    const views = ["farm", "link", "match3", "market", "pets"];
    views.forEach((view, index) => {
      const x = 10 + index * 190;
      const hit = this.addHit("nav", x, 83, 182, 45, { view });
      const active = this.state.view === view;
      const petLocked = view === "pets" && !this.state.petGarden.unlocked;
      this.rounded(x, 83, 182, 45, 6, active ? C.coral : this.isHover(hit) ? C.yellowSoft : petLocked ? C.paper2 : C.paper, C.ink, 2);
      this.drawNavIcon(view, x + 29, 106, active);
      this.text(petLocked ? "宠物园·锁" : GAME_NAMES[view], x + 102, 106, petLocked ? 11 : 13, active ? C.white : petLocked ? C.lock : C.ink, "center", 900);
      if (["link", "match3"].includes(view)) {
        const done = this.state.festival[view];
        this.circle(x + 167, 96, 6, done ? C.yellow : C.paper2, C.ink, 1);
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
    } else if (view === "match3") {
      [[-8, -7], [6, -7], [-1, 6]].forEach(([dx, dy], index) => {
        const color = [primary, secondary, C.yellow][index];
        this.ctx.save();
        this.ctx.translate(x + dx, y + dy);
        this.ctx.rotate(Math.PI / 4);
        this.rect(-5, -5, 10, 10, color, C.ink, 1);
        this.ctx.restore();
      });
    } else if (view === "market") {
      this.rect(x - 13, y - 5, 26, 15, C.paper, C.ink, 2);
      this.rect(x - 16, y - 12, 32, 8, secondary, C.ink, 1);
      this.rect(x - 7, y, 7, 10, primary);
      this.rect(x + 4, y - 1, 6, 5, C.sky);
    } else {
      this.circle(x, y + 1, 11, secondary, C.ink, 2);
      this.circle(x - 5, y - 10, 4, primary, C.ink, 1);
      this.circle(x + 5, y - 10, 4, primary, C.ink, 1);
      this.circle(x - 4, y, 2, C.ink);
      this.circle(x + 4, y, 2, C.ink);
      this.line(x - 3, y + 6, x, y + 8, C.ink, 2);
      this.line(x, y + 8, x + 3, y + 6, C.ink, 2);
    }
  }

  drawMobileHeader() {
    this.rounded(8, 8, 624, 104, 7, C.paper, C.ink, 3);
    this.rect(18, 21, 42, 42, C.white, C.ink, 2);
    this.drawCropIcon("radish", 39, 42, 0.82);
    this.text("UU小园", 70, 29, 19, C.ink, "left", 900);
    this.text(`农场 Lv.${this.state.level}`, 70, 55, 12, C.coral, "left", 800);
    this.rect(70, 72, 128, 8, C.paper2);
    this.rect(70, 72, 128 * Math.min(1, this.state.xp / Core.xpNeeded(this.state.level)), 8, C.coral);

    const resources = [
      ["coins", this.state.coins, "金币"],
      ["tickets", this.state.seedTickets, "种券"],
      ["compost", this.state.compost, "堆肥"],
      ["seal", this.state.orderSeals, "印章"],
      ["sun", this.state.sun, "阳光"],
      ["stars", this.state.stars, "丰收星"]
    ];
    resources.forEach(([kind, value, label], index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 252 + col * 123;
      const y = 34 + row * 43;
      this.drawResourceIcon(kind, x, y);
      this.text(label, x + 14, y - 8, 9, C.greenDark, "left", 700);
      this.text(value, x + 14, y + 10, 13, C.ink, "left", 900);
    });
  }

  drawMobileNav() {
    const views = ["farm", "link", "match3", "market", "pets"];
    this.rect(0, 888, WIDTH, 72, C.paper, C.ink, 2);
    views.forEach((view, index) => {
      const x = 4 + index * 127;
      const active = this.state.view === view;
      const petLocked = view === "pets" && !this.state.petGarden.unlocked;
      const hit = this.addHit("nav", x, 892, 123, 64, { view });
      if (active) this.rounded(x + 4, 896, 115, 56, 6, C.coral);
      else if (this.isHover(hit)) this.rounded(x + 4, 896, 115, 56, 6, C.yellowSoft);
      this.drawNavIcon(view, x + 61, 914, active);
      this.text(
        petLocked ? "宠物·锁" : GAME_NAMES[view],
        x + 61,
        942,
        10,
        active ? C.white : petLocked ? C.lock : C.ink,
        "center",
        900
      );
      if (["link", "match3"].includes(view)) {
        this.circle(x + 108, 903, 5, this.state.festival[view] ? C.yellow : C.paper2, C.ink, 1);
      }
    });
  }

  drawMobileTitle(title, subtitle = "") {
    this.text(title, 18, 134, 18, C.ink, "left", 900);
    if (subtitle) this.text(subtitle, 622, 134, 10, C.greenDark, "right", 700);
  }

  renderMobile() {
    this.drawMobileHeader();
    if (this.state.view === "farm") this.drawMobileFarm();
    else if (this.state.view === "market") this.drawMobileMarket();
    else if (this.state.view === "pets") this.drawMobilePetGarden();
    else if (this.state.view === "link") this.drawMobileLink();
    else if (this.state.view === "match3") {
      if (this.puzzleMode === "merge") this.drawMobileMerge();
      else this.drawMobileMatch3();
    }
    this.drawMobileNav();
  }

  drawMobileOrders() {
    this.state.orders.forEach((order, index) => {
      const crop = Core.cropById(order.cropId);
      const x = 18 + index * 207;
      const y = 154;
      const ready = this.state.produce[crop.id] >= order.amount;
      this.rounded(x, y, 197, 74, 6, index % 2 ? C.cream : C.paper, C.ink, 2);
      this.drawCropIcon(crop.id, x + 26, y + 38, 0.62);
      this.text(`${crop.name} ×${order.amount}`, x + 50, y + 20, 11, C.ink, "left", 900);
      this.text(`￥${order.coins}`, x + 50, y + 46, 12, C.coralDark, "left", 900);
      this.button(
        ready ? "交付" : `${this.state.produce[crop.id]}/${order.amount}`,
        x + 139,
        y + 34,
        50,
        32,
        "deliver",
        { orderId: order.id },
        { fill: ready ? C.greenSoft : C.paper2, disabled: !ready, size: 10 }
      );
    });
  }

  drawMobilePlots() {
    for (let index = 0; index < Core.PLOT_COUNT; index += 1) {
      const bounds = this.plotBounds(index);
      const { x, y, w, h } = bounds;
      const unlocked = index < this.state.unlockedPlots;
      const plot = this.state.plots[index];
      this.addHit("plot", x, y, w, h, { index });
      this.rounded(
        x,
        y,
        w,
        h,
        5,
        unlocked ? C.soil : index === this.state.unlockedPlots ? C.greenSoft : "#90aa8b",
        C.ink,
        2
      );
      if (!unlocked) {
        this.text(index === this.state.unlockedPlots ? `解锁 ￥${Core.nextLandCost(this.state)}` : "未解锁", x + w / 2, y + h / 2, 10, C.ink, "center", 800);
        continue;
      }
      this.line(x + 10, y + 29, x + w - 10, y + 29, C.soilDark, 3);
      this.line(x + 10, y + 57, x + w - 10, y + 57, C.soilDark, 3);
      for (let soil = 0; soil < plot.soil; soil += 1) this.circle(x + 11 + soil * 10, y + 11, 3, C.yellow, C.ink, 1);
      if (!plot.crop) {
        this.text("空土地", x + w / 2, y + 45, 10, "rgba(255,248,216,0.75)", "center", 700);
        continue;
      }
      const crop = Core.cropById(plot.crop.cropId);
      const progress = Core.cropProgress(plot, this.frameNow);
      const pulse = progress >= 1 ? 1 + Math.sin(this.frameNow / 180 + index) * 0.05 : 1;
      this.ctx.save();
      this.ctx.translate(x + w / 2, y + 43);
      this.ctx.rotate(Math.sin(this.frameNow / 560 + index) * 0.025);
      this.ctx.scale(pulse, pulse);
      this.drawCropIcon(crop.id, 0, 0, 0.95 + progress * 0.2);
      this.ctx.restore();
      if (plot.crop.watered) this.drawWaterDrop(x + w - 13, y + 14, 4, 0.9);
      if (plot.crop.fertilized) this.drawSpark(x + 15, y + 17, 3, C.yellow, 0.85);
      this.rect(x + 24, y + h - 11, w - 48, 6, C.paper2);
      this.rect(x + 24, y + h - 11, (w - 48) * progress, 6, progress >= 1 ? C.yellow : C.green);
      this.text(progress >= 1 ? "成熟" : Core.formatDuration(plot.crop.finishAt - this.frameNow), x + w / 2, y + h - 22, 9, C.paper, "center", 800);
    }
    this.drawAutomationRobots();
  }

  drawMobileFarmTools() {
    const tools = [
      ["seed", "种植"],
      ["water", "浇水"],
      ["fertilizer", `施肥 ${this.state.compost}`],
      ["hand", "收获"],
      ["soil", `沃土 ${this.state.inventory.soilKit}`]
    ];
    tools.forEach(([type, label], index) => {
      this.button(label, 18 + index * 121, 617, 111, 44, "tool", { tool: type }, {
        fill: this.state.selected.type === type ? C.yellow : C.cream,
        size: 10
      });
    });
  }

  drawMobileSeedShelf() {
    Core.CROPS.forEach((crop, index) => {
      const x = 18 + index * 101;
      const locked = crop.level > this.state.level;
      const selected = this.state.selected.type === "seed" && this.state.selected.id === crop.id;
      const hit = this.addHit("seed-select", x, 670, 93, 67, { cropId: crop.id });
      this.rounded(x, 670, 93, 67, 5, selected ? C.yellowSoft : index % 2 ? C.cream : C.paper, C.ink, selected ? 3 : 1);
      this.drawCropIcon(crop.id, x + 24, 693, 0.58);
      this.text(crop.name, x + 49, 687, 10, locked ? C.lock : C.ink, "left", 900);
      this.text(locked ? `Lv.${crop.level}` : `种 ${this.state.seeds[crop.id]}`, x + 49, 710, 9, locked ? C.lock : C.greenDark, "left", 800);
      if (locked) hit.disabled = true;
    });
    const selectedCrop = Core.cropById(this.state.selected.id) || Core.CROPS[0];
    this.button(`补种 ${selectedCrop.name} ×3 · ￥${selectedCrop.seedPrice * 3}`, 18, 746, 230, 42, "seed-buy", { cropId: selectedCrop.id }, {
      disabled: selectedCrop.level > this.state.level,
      fill: C.yellowSoft,
      size: 11
    });
    [
      ["sprinkler", "自动浇水"],
      ["harvester", "自动收菜"]
    ].forEach(([type, label], index) => {
      const enabled = this.state.automationEnabled[type];
      this.button(`${label} ${enabled ? "开" : "关"}`, 258 + index * 181, 746, 171, 42, "auto-toggle", { itemId: type }, {
        fill: enabled ? C.greenSoft : C.paper2,
        color: enabled ? C.greenDark : C.lock,
        size: 10
      });
    });
  }

  drawMobileFarmFooter() {
    const count = Core.availableProduce(this.state);
    const value = Math.floor(Core.produceValue(this.state));
    this.rounded(18, 797, 294, 80, 6, C.paper, C.ink, 2);
    this.text(`仓库 ${count} 份 · ￥${value}`, 32, 819, 12, C.ink, "left", 900);
    this.button("全部出售", 174, 832, 124, 34, "sell", {}, {
      fill: value ? C.greenSoft : C.paper2,
      disabled: !value,
      size: 10
    });
    this.rounded(322, 797, 300, 80, 6, C.cream, C.ink, 2);
    this.text(`庆典 · 第 ${this.state.festivalCount + 1} 轮`, 338, 818, 12, C.ink, "left", 900);
    const progress = ["link", "match3"].map((key, index) => (
      `${["连", "益"][index]} ${this.state.festival[key] ? "完成" : `${this.state.festivalProgress[key]}/${this.state.festivalGoals[key]}`}`
    )).join("  ");
    this.text(progress, 338, 843, 9, C.greenDark, "left", 800);
    this.text(`游园礼袋 ${this.state.miniGiftProgress}/3`, 338, 864, 9, C.coralDark, "left", 800);
  }

  drawMobileFarm() {
    this.drawMobileTitle("农场", "订单、种植和自动化");
    this.drawMobileOrders();
    this.drawMobilePlots();
    this.drawMobileFarmTools();
    this.drawMobileSeedShelf();
    this.drawMobileFarmFooter();
  }

  drawFestivalStrip() {
    this.rounded(646, 550, 302, 78, 7, C.paper, C.ink, 2);
    this.text(`丰收庆典 · 第 ${this.state.festivalCount + 1} 轮`, 662, 566, 14, C.ink, "left", 900);
    this.text("可反复完成 · 每轮目标不同", 932, 566, 9, C.greenDark, "right", 700);
    ["link", "match3"].forEach((key, index) => {
      const x = 664 + index * 138;
      const done = this.state.festival[key];
      const progress = this.state.festivalProgress[key];
      const goal = this.state.festivalGoals[key];
      this.rounded(x, 580, 126, 21, 4, done ? C.greenSoft : C.paper2, C.ink, 1);
      this.text(
        `${["连连看", "益智"][index]} ${done ? "完成" : `${progress}/${goal}`}`,
        x + 63,
        591,
        9,
        done ? C.greenDark : C.ink,
        "center",
        900
      );
    });
    const previewCoins = 140 + this.state.level * 25 + this.state.festivalCount * 15;
    this.text(`本轮奖励：金币 ${previewCoins} + 永久研究星 1`, 662, 614, 9, C.inkSoft, "left", 700);
  }

  render() {
    this.hits = [];
    this.drawBackground();
    if (MOBILE_LAYOUT) {
      this.renderMobile();
      this.drawActionEffects();
      if (this.toast) this.drawToast();
      this.surface.refresh();
      return;
    }
    this.drawHeader();
    this.drawNav();
    if (this.state.view === "farm") this.drawFarm();
    else if (this.state.view === "market") this.drawMarket();
    else if (this.state.view === "pets") this.drawPetGarden();
    else if (this.state.view === "link") this.drawLink();
    else if (this.state.view === "match3") {
      if (this.puzzleMode === "merge") this.drawMergeGame();
      else this.drawMatch3();
    }
    this.drawActionEffects();
    if (this.toast) this.drawToast();
    this.surface.refresh();
  }

  drawToast() {
    const enter = easeOut((this.frameNow - this.toast.startedAt) / 150);
    const leave = clamp01((this.toast.until - this.frameNow) / 180);
    const alpha = Math.min(enter, leave);
    const width = Math.min(MOBILE_LAYOUT ? 590 : 350, Math.max(210, 42 + this.toast.text.length * 11));
    const fill = this.toast.tone === "good" ? C.greenSoft : this.toast.tone === "bad" ? "#f2b1aa" : C.yellowSoft;
    this.ctx.save();
    this.ctx.globalAlpha = alpha;
    const rightEdge = MOBILE_LAYOUT ? 630 : this.state.view === "match3" ? 708 : 940;
    this.ctx.translate(rightEdge - width / 2, MOBILE_LAYOUT ? 858 : 149);
    this.ctx.scale(0.94 + enter * 0.06, 0.94 + enter * 0.06);
    this.rounded(-width / 2, -14, width, 28, 6, fill, C.ink, 2);
    this.text(this.toast.text, 0, 1, 10, C.ink, "center", 800);
    this.ctx.restore();
  }

  drawWaterDrop(x, y, size = 5, alpha = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.bezierCurveTo(x - size, y, x - size * 0.7, y + size, x, y + size);
    ctx.bezierCurveTo(x + size * 0.7, y + size, x + size, y, x, y - size);
    ctx.fillStyle = C.sky;
    ctx.fill();
    ctx.strokeStyle = C.blue;
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.restore();
  }

  drawSpark(x, y, size = 6, color = C.yellow, alpha = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    this.line(x - size, y, x + size, y, color, 2);
    this.line(x, y - size, x, y + size, color, 2);
    ctx.restore();
  }

  drawActionEffects() {
    const headerTargets = MOBILE_LAYOUT ? {
      coins: { x: 252, y: 34 },
      seedTickets: { x: 375, y: 34 },
      compost: { x: 498, y: 34 },
      orderSeals: { x: 252, y: 77 },
      sun: { x: 375, y: 77 },
      stars: { x: 498, y: 77 }
    } : {
      coins: { x: 305, y: 35 },
      seedTickets: { x: 397, y: 35 },
      compost: { x: 489, y: 35 },
      orderSeals: { x: 581, y: 35 },
      sun: { x: 673, y: 35 },
      stars: { x: 765, y: 35 }
    };
    for (const effect of this.actionEffects) {
      if (effect.view && effect.view !== this.state.view) continue;
      const progress = this.effectProgress(effect);
      const fade = 1 - easeInOut(progress);

      if (effect.type === "view-transition") {
        const sweepX = -180 + easeOut(progress) * 1320;
        this.ctx.save();
        this.ctx.globalAlpha = Math.sin(progress * Math.PI) * 0.16;
        this.ctx.fillStyle = C.white;
        this.ctx.transform(1, 0, -0.32, 1, 0, 0);
        this.ctx.fillRect(sweepX, MOBILE_LAYOUT ? 112 : 128, 115, HEIGHT - (MOBILE_LAYOUT ? 112 : 128));
        this.ctx.restore();
        continue;
      }

      if (effect.type === "resource") {
        const target = headerTargets[effect.kind] || headerTargets.coins;
        const color = effect.delta > 0 ? C.greenDark : C.coralDark;
        this.ctx.save();
        this.ctx.globalAlpha = fade;
        this.text(
          `${effect.delta > 0 ? "+" : ""}${effect.delta}`,
          target.x + 27,
          target.y + 23 - progress * 20,
          12 + Math.sin(progress * Math.PI) * 3,
          color,
          "center",
          900
        );
        this.ctx.restore();
        continue;
      }

      if (effect.type === "button-ripple") {
        const inset = easeOut(progress) * 8;
        this.ctx.save();
        this.ctx.globalAlpha = fade * 0.7;
        this.rounded(
          effect.x + inset,
          effect.y + inset,
          Math.max(2, effect.w - inset * 2),
          Math.max(2, effect.h - inset * 2),
          5,
          null,
          effect.tone === "good" ? C.greenDark : C.yellow,
          3
        );
        this.ctx.restore();
        continue;
      }

      if (effect.type.startsWith("plot-")) {
        const bounds = this.plotBounds(effect.plotIndex);
        const centerX = bounds.x + bounds.w / 2;
        const centerY = bounds.y + 40;
        if (effect.type === "plot-plant") {
          const fall = easeOut(Math.min(1, progress * 1.7));
          const seedY = bounds.y - 10 + fall * 48;
          this.ctx.save();
          this.ctx.translate(centerX, seedY);
          this.ctx.rotate(progress * 4);
          this.ctx.beginPath();
          this.ctx.ellipse(0, 0, 5, 8, 0.5, 0, Math.PI * 2);
          this.ctx.fillStyle = C.yellowSoft;
          this.ctx.fill();
          this.ctx.strokeStyle = C.soilDark;
          this.ctx.stroke();
          this.ctx.restore();
          for (let particle = 0; particle < 7; particle += 1) {
            const angle = particle * Math.PI / 3.5;
            const distance = Math.sin(progress * Math.PI) * (15 + particle * 2);
            this.circle(centerX + Math.cos(angle) * distance, bounds.y + 48 + Math.sin(angle) * distance * 0.35, 2, C.soilDark);
          }
        } else if (effect.type === "plot-water") {
          this.ctx.save();
          this.ctx.translate(bounds.x + 30, bounds.y + 14);
          this.ctx.rotate(-0.35 + Math.sin(progress * Math.PI) * 0.25);
          this.rounded(-13, -8, 24, 17, 4, C.sky, C.ink, 2);
          this.line(10, -3, 20, 3, C.blue, 4);
          this.line(-5, -8, -5, -15, C.ink, 2);
          this.ctx.restore();
          for (let drop = 0; drop < 9; drop += 1) {
            const local = (progress * 1.8 + drop / 9) % 1;
            this.drawWaterDrop(bounds.x + 52 + drop * 8, bounds.y + 17 + local * 48, 3, Math.sin(local * Math.PI));
          }
          this.ctx.save();
          this.ctx.globalAlpha = fade * 0.3;
          this.rounded(bounds.x + 4, bounds.y + 47, bounds.w - 8, 28, 4, C.blue);
          this.ctx.restore();
        } else if (effect.type === "plot-fertilize") {
          this.ctx.save();
          this.ctx.translate(bounds.x + 29, bounds.y + 18);
          this.ctx.rotate(Math.sin(progress * Math.PI * 4) * 0.12);
          this.rounded(-13, -14, 26, 28, 4, C.greenSoft, C.ink, 2);
          this.text("肥", 0, 1, 12, C.greenDark, "center", 900);
          this.ctx.restore();
          for (let particle = 0; particle < 12; particle += 1) {
            const local = (progress * 1.5 + particle / 12) % 1;
            const angle = particle * 2.4;
            this.circle(
              centerX + Math.cos(angle) * (12 + local * 30),
              bounds.y + 12 + local * 50,
              2 + (particle % 2),
              particle % 3 ? C.yellow : C.greenSoft,
              C.greenDark,
              1
            );
          }
        } else if (effect.type === "plot-harvest") {
          const targetX = MOBILE_LAYOUT ? 150 : 690;
          const targetY = MOBILE_LAYOUT ? 818 : 486;
          const fly = easeInOut(progress);
          const arc = Math.sin(progress * Math.PI) * 60;
          const x = centerX + (targetX - centerX) * fly;
          const y = centerY + (targetY - centerY) * fly - arc;
          this.ctx.save();
          this.ctx.globalAlpha = 1 - Math.max(0, progress - 0.78) / 0.22;
          this.ctx.translate(x, y);
          this.ctx.rotate(progress * Math.PI * 2);
          this.drawCropIcon(effect.cropId, 0, 0, 1.1 - progress * 0.35);
          this.ctx.restore();
          this.ctx.save();
          this.ctx.globalAlpha = fade;
          this.text(`+${effect.amount}`, centerX, bounds.y + 10 - progress * 22, 14, C.yellowSoft, "center", 900);
          this.ctx.restore();
        } else if (effect.type === "plot-soil") {
          for (let ring = 0; ring < 3; ring += 1) {
            const ringProgress = clamp01(progress * 1.4 - ring * 0.16);
            this.ctx.save();
            this.ctx.globalAlpha = (1 - ringProgress) * 0.8;
            this.ctx.strokeStyle = C.yellow;
            this.ctx.lineWidth = 3;
            this.ctx.beginPath();
            this.ctx.ellipse(centerX, centerY, 15 + ringProgress * 48, 7 + ringProgress * 22, 0, 0, Math.PI * 2);
            this.ctx.stroke();
            this.ctx.restore();
          }
        } else if (effect.type === "plot-unlock") {
          this.ctx.save();
          this.ctx.globalAlpha = fade * 0.75;
          this.rounded(bounds.x, bounds.y, bounds.w * easeOut(progress), bounds.h, 5, C.greenSoft);
          this.ctx.restore();
          this.drawSpark(centerX, centerY, 9 + Math.sin(progress * Math.PI) * 8, C.yellow, fade);
        } else if (effect.type === "plot-device") {
          const radius = 8 + easeOut(progress) * 45;
          this.ctx.save();
          this.ctx.globalAlpha = fade;
          this.circle(centerX, centerY, radius, null, effect.action === "placed" ? C.sky : C.coral, 3);
          this.ctx.translate(centerX, centerY);
          this.ctx.rotate(progress * Math.PI * 4);
          for (let tooth = 0; tooth < 8; tooth += 1) {
            const angle = tooth * Math.PI / 4;
            this.rect(Math.cos(angle) * 18 - 2, Math.sin(angle) * 18 - 2, 4, 4, C.yellow);
          }
          this.ctx.restore();
        } else if (effect.type === "plot-mature") {
          const pulse = Math.sin(progress * Math.PI);
          for (let spark = 0; spark < 8; spark += 1) {
            const angle = spark * Math.PI / 4 + progress;
            this.drawSpark(centerX + Math.cos(angle) * (20 + pulse * 24), centerY + Math.sin(angle) * (12 + pulse * 18), 4, C.yellow, fade);
          }
        } else if (effect.type === "plot-fail") {
          const shake = Math.sin(progress * Math.PI * 8) * 6 * fade;
          this.ctx.save();
          this.ctx.globalAlpha = fade;
          this.rounded(bounds.x + shake, bounds.y, bounds.w, bounds.h, 5, null, C.coralDark, 4);
          this.ctx.restore();
        }
        continue;
      }

      if (effect.type === "order-deliver") {
        const startX = MOBILE_LAYOUT ? 18 + effect.orderIndex * 207 + 98 : 18 + effect.orderIndex * 205 + 98;
        const startY = MOBILE_LAYOUT ? 191 : 193;
        const coinTarget = headerTargets.coins;
        const fly = easeInOut(progress);
        const x = startX + (coinTarget.x - startX) * fly;
        const y = startY + (coinTarget.y - startY) * fly - Math.sin(progress * Math.PI) * 35;
        this.ctx.save();
        this.ctx.translate(x, y);
        this.ctx.rotate(progress * 0.4);
        this.rounded(-18, -13, 36, 26, 4, C.paper, C.ink, 2);
        this.rect(-11, -6, 22, 4, C.coral);
        this.ctx.restore();
        for (let coin = 0; coin < 6; coin += 1) {
          const angle = coin * Math.PI / 3;
          this.circle(coinTarget.x + Math.cos(angle) * progress * 25, coinTarget.y + Math.sin(angle) * progress * 18, 3, C.yellow, C.ink, 1);
        }
        continue;
      }

      if (effect.type === "warehouse-sell") {
        for (let item = 0; item < 7; item += 1) {
          const local = clamp01(progress * 1.35 - item * 0.06);
          const startX = (MOBILE_LAYOUT ? 55 : 700) + item * 18;
          const startY = MOBILE_LAYOUT ? 835 : 495;
          const x = startX + (headerTargets.coins.x - startX) * easeInOut(local);
          const y = startY + (headerTargets.coins.y - startY) * easeInOut(local) - Math.sin(local * Math.PI) * (35 + item * 5);
          this.circle(x, y, 5, item % 2 ? C.green : C.yellow, C.ink, 1);
        }
        this.ctx.save();
        this.ctx.globalAlpha = fade;
        this.text(`+￥${effect.value}`, MOBILE_LAYOUT ? 150 : 760, (MOBILE_LAYOUT ? 808 : 466) - progress * 28, 16, C.greenDark, "center", 900);
        this.ctx.restore();
        continue;
      }

      if (effect.type === "ui-success") {
        const pulse = Math.sin(progress * Math.PI);
        this.ctx.save();
        this.ctx.globalAlpha = fade;
        this.circle(effect.x, effect.y, 8 + pulse * 28, null, effect.color || C.yellow, 3);
        for (let spark = 0; spark < 6; spark += 1) {
          const angle = spark * Math.PI / 3;
          this.drawSpark(effect.x + Math.cos(angle) * pulse * 34, effect.y + Math.sin(angle) * pulse * 25, 4, effect.color || C.yellow, fade);
        }
        this.ctx.restore();
        continue;
      }

      if (effect.type === "pet-action") {
        const actor = this.petActorPosition(effect.petId || this.state.petGarden.selectedPet);
        const centerX = actor.x;
        const centerY = actor.y - 38;
        if (effect.action === "feed") {
          for (let bit = 0; bit < 6; bit += 1) {
            const local = clamp01(progress * 1.4 - bit * 0.08);
            const feedX = MOBILE_LAYOUT ? 150 : 180;
            const feedTargetX = MOBILE_LAYOUT ? 180 : 210;
            const feedY = MOBILE_LAYOUT ? 490 : 470;
            this.circle(feedX + bit * 8 + (centerX - feedTargetX - bit * 8) * local, feedY + (centerY - feedY) * local - Math.sin(local * Math.PI) * 40, 4, C.soil, C.ink, 1);
          }
        } else if (effect.action === "pet") {
          for (let heart = 0; heart < 7; heart += 1) {
            const angle = heart * 0.9;
            this.text("♥", centerX + Math.cos(angle) * (30 + progress * 45), centerY + Math.sin(angle) * 22 - progress * 70, 15, C.coral, "center", 900);
          }
        } else if (effect.action === "play") {
          const x = centerX - 120 + progress * 210;
          const y = centerY + 55 - Math.sin(progress * Math.PI) * 110;
          this.circle(x, y, 13, C.yellow, C.ink, 2);
          this.line(x - 8, y, x + 8, y, C.coral, 2);
        } else if (effect.action === "bathe") {
          for (let bubble = 0; bubble < 14; bubble += 1) {
            const angle = bubble * 2.1;
            this.circle(centerX + Math.cos(angle) * (30 + bubble % 4 * 12), centerY + 65 - progress * (60 + bubble * 5), 4 + bubble % 3, "rgba(255,255,255,0.65)", C.blue, 1);
          }
        } else {
          for (let spark = 0; spark < 10; spark += 1) {
            const angle = spark * Math.PI / 5;
            this.drawSpark(centerX + Math.cos(angle) * (35 + progress * 45), centerY + Math.sin(angle) * (25 + progress * 30), 5, C.yellow, fade);
          }
        }
      }
    }
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
        const plantEffect = this.actionEffects.find((effect) => (
          effect.type === "plot-plant"
          && effect.plotIndex === index
          && effect.until >= this.frameNow
        ));
        const plantProgress = plantEffect ? easeOut(this.effectProgress(plantEffect)) : 1;
        const maturePulse = progress >= 1 ? 1 + Math.sin(this.frameNow / 170 + index) * 0.06 : 1;
        const sway = Math.sin(this.frameNow / 520 + index * 1.7) * (progress >= 1 ? 0.055 : 0.025);
        this.ctx.save();
        this.ctx.translate(x + w / 2, y + 40 + (1 - plantProgress) * 15);
        this.ctx.rotate(sway);
        this.ctx.scale(maturePulse * plantProgress, maturePulse * plantProgress);
        this.drawCropIcon(crop.id, 0, 0, 0.85 + progress * 0.35);
        this.ctx.restore();
        if (plot.crop.watered) {
          const bob = Math.sin(this.frameNow / 260 + index) * 2;
          this.drawWaterDrop(x + w - 14, y + 13 + bob, 4, 0.85);
        }
        if (plot.crop.fertilized) {
          for (let spark = 0; spark < 3; spark += 1) {
            const angle = this.frameNow / 700 + spark * Math.PI * 2 / 3 + index;
            this.circle(
              x + w / 2 + Math.cos(angle) * 28,
              y + 39 + Math.sin(angle) * 15,
              2,
              spark % 2 ? C.yellow : C.greenSoft,
              C.greenDark,
              1
            );
          }
        }
        if (progress >= 1) {
          for (let ray = 0; ray < 4; ray += 1) {
            const angle = this.frameNow / 900 + ray * Math.PI / 2;
            this.drawSpark(x + w / 2 + Math.cos(angle) * 31, y + 40 + Math.sin(angle) * 19, 3, C.yellow, 0.72);
          }
        }
        if (plot.crop.rotationBonus) {
          this.rounded(x + 7, y + 6, 39, 16, 4, C.greenSoft, C.greenDark, 1);
          this.text("轮作+", x + 26, y + 14, 8, C.greenDark, "center", 900);
        }
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
    if (MOBILE_LAYOUT) {
      const w = 195;
      const h = 82;
      const gap = 8;
      return {
        x: 18 + (index % 3) * (w + gap),
        y: 238 + Math.floor(index / 3) * (h + gap),
        w,
        h
      };
    }
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
    if (this.state.automationEnabled.sprinkler) {
      for (const plotIndex of this.state.automationSlots.sprinkler) {
        const plot = this.state.plots[plotIndex];
        if (plot?.crop && !plot.crop.watered && Core.cropProgress(plot, now) < 1) {
          this.queueRobotJob("sprinkler", plotIndex, 2200);
        }
      }
    }
    if (this.state.automationEnabled.harvester) {
      for (const plotIndex of this.state.automationSlots.harvester) {
        const plot = this.state.plots[plotIndex];
        if (plot?.crop && Core.cropProgress(plot, now) >= 1) this.queueRobotJob("harvester", plotIndex, 2600);
      }
    }
  }

  updateAutomationRobots() {
    this.scanAutomation(false);
    const now = this.now();
    for (const job of this.robotJobs) {
      const progress = (now - job.start) / job.duration;
      if (job.type === "sprinkler" && progress >= 0.58 && !job.watered) {
        job.watered = true;
        const result = Core.water(this.state, job.plotIndex, now);
        if (result.ok && this.state.view === "farm") {
          this.addActionEffect("plot-water", { plotIndex: job.plotIndex, view: "farm" }, 900);
          this.showToast("洒水机器人完成浇水", "good", 1300);
        }
      }
      if (job.type === "harvester" && progress >= 0.58 && !job.harvested) {
        job.harvested = true;
        const result = Core.harvest(this.state, job.plotIndex, now);
        if (result.ok && this.state.view === "farm") {
          this.addActionEffect("plot-harvest", {
            plotIndex: job.plotIndex,
            cropId: result.crop.id,
            amount: result.amount,
            view: "farm"
          }, 1050);
          this.addResourceEffect("sun", Math.max(1, Math.floor(result.amount / 2)));
          this.showToast(`收菜机器人装箱 ${result.crop.name} ×${result.amount}`, "good", 1500);
        }
      }
    }
    this.robotJobs = this.robotJobs.filter((job) => now - job.start <= job.duration);
  }

  drawRobot(type, x, y, phase, working = false, disabled = false) {
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
    this.circle(0, -20, 3, disabled ? C.lock : working ? C.coral : C.green, C.ink, 1);
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
      const enabled = this.state.automationEnabled[type];
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
      } else if (enabled) {
        const patrol = (Math.sin(now / 1400 + plotIndex + order) + 1) / 2;
        x = bounds.x + 24 + patrol * (bounds.w - 48);
        y = bounds.y + (type === "sprinkler" ? 19 : 63);
      } else {
        phase = 0;
        x = type === "sprinkler" ? bounds.x + 22 : bounds.x + bounds.w - 22;
        y = bounds.y + (type === "sprinkler" ? 19 : 63);
      }
      this.ctx.save();
      this.ctx.globalAlpha = enabled ? 1 : 0.58;
      this.drawRobot(type, x, y, phase, Boolean(job), !enabled);
      this.ctx.restore();
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
      this.button("退出布置", 250, 588, 104, 30, "tool", { tool: "hand" }, { size: 10, fill: C.paper2 });
    }
    [
      ["sprinkler", "自动浇水"],
      ["harvester", "自动收菜"]
    ].forEach(([type, label], index) => {
      const enabled = this.state.automationEnabled[type];
      this.button(`${label} ${enabled ? "开" : "关"}`, 365 + index * 130, 588, 120, 30, "auto-toggle", { itemId: type }, {
        fill: enabled ? C.greenSoft : C.paper2,
        color: enabled ? C.greenDark : C.lock,
        size: 9
      });
    });
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
        const coinsBefore = this.state.coins;
        const result = Core.unlockNextPlot(this.state);
        if (result.ok) {
          this.addActionEffect("plot-unlock", { plotIndex: index, view: "farm" }, 950);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        } else {
          this.addActionEffect("plot-fail", { plotIndex: index, view: "farm" }, 420);
        }
        this.showToast(result.ok ? `解锁第 ${this.state.unlockedPlots} 块土地` : result.reason, result.ok ? "good" : "bad");
      }
      return;
    }
    const plot = this.state.plots[index];
    if (plot.crop && Core.cropProgress(plot, this.now()) >= 1 && this.state.selected.type !== "automation") {
      const cropId = plot.crop.cropId;
      const sunBefore = this.state.sun;
      const result = Core.harvest(this.state, index, this.now());
      if (result.ok) {
        this.robotJobs = this.robotJobs.filter((job) => job.plotIndex !== index);
        this.addActionEffect("plot-harvest", { plotIndex: index, cropId, amount: result.amount, view: "farm" }, 1050);
        this.addResourceEffect("sun", this.state.sun - sunBefore);
      } else {
        this.addActionEffect("plot-fail", { plotIndex: index, view: "farm" }, 420);
      }
      this.showToast(result.ok ? `收获 ${result.crop.name} ×${result.amount}，获得阳光` : result.reason, result.ok ? "good" : "bad");
      return;
    }
    let result;
    const selected = this.state.selected;
    const coinsBefore = this.state.coins;
    const compostBefore = this.state.compost;
    if (selected.type === "seed") result = Core.plant(this.state, index, selected.id, this.now());
    else if (selected.type === "water") result = Core.water(this.state, index, this.now());
    else if (selected.type === "fertilizer") result = Core.fertilize(this.state, index, this.now());
    else if (selected.type === "hand") result = Core.harvest(this.state, index, this.now());
    else if (selected.type === "soil") result = Core.applySoilKit(this.state, index);
    else if (selected.type === "automation") result = Core.toggleAutomation(this.state, selected.id, index);
    if (result) {
      let message = result.reason || "操作完成";
      if (!result.ok) this.addActionEffect("plot-fail", { plotIndex: index, view: "farm" }, 420);
      if (result.ok && selected.type === "seed") {
        this.addActionEffect("plot-plant", { plotIndex: index, cropId: result.crop.id, view: "farm" }, 720);
        message = `${result.crop.name}种下了`;
        if (this.state.automationEnabled.sprinkler && this.state.automationSlots.sprinkler.includes(index)) {
          this.queueRobotJob("sprinkler", index, 1900);
          message += "，洒水机器人出发";
        }
      }
      if (result.ok && selected.type === "water") {
        this.addActionEffect("plot-water", { plotIndex: index, view: "farm" }, 880);
        message = "浇水完成，成长时间缩短";
      }
      if (result.ok && selected.type === "fertilizer") {
        this.addActionEffect("plot-fertilize", { plotIndex: index, view: "farm" }, 950);
        this.addResourceEffect("compost", this.state.compost - compostBefore);
        this.addResourceEffect("coins", this.state.coins - coinsBefore);
        message = "施肥完成，肥力正在渗入";
      }
      if (result.ok && selected.type === "soil") {
        this.addActionEffect("plot-soil", { plotIndex: index, view: "farm" }, 900);
        message = `土地品质提升到 ${result.soil} 级`;
      }
      if (result.ok && selected.type === "automation") message = result.action === "placed" ? "设备已安装" : "设备已收回";
      if (result.ok && selected.type === "automation") {
        this.addActionEffect("plot-device", {
          plotIndex: index,
          action: result.action,
          device: selected.id,
          view: "farm"
        }, 760);
      }
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

  drawPetPortrait(petId, x, y, size, options = {}) {
    const type = Core.petType(petId);
    if (!type) return;
    const ctx = this.ctx;
    const bob = options.bob ?? 0;
    const scale = options.scale ?? 1;
    ctx.save();
    ctx.imageSmoothingEnabled = false;
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.translate(x, y + bob);
    ctx.scale(scale, scale);
    if (this.petPortraits.complete && this.petPortraits.naturalWidth) {
      const cellW = this.petPortraits.naturalWidth / 2;
      const cellH = this.petPortraits.naturalHeight / 2;
      const sx = (type.portrait % 2) * cellW;
      const sy = Math.floor(type.portrait / 2) * cellH;
      ctx.drawImage(this.petPortraits, sx, sy, cellW, cellH, -size / 2, -size / 2, size, size);
    } else {
      this.circle(0, 0, size * 0.34, C.yellowSoft, C.ink, 3);
      this.circle(-size * 0.2, -size * 0.23, size * 0.12, C.soil, C.ink, 2);
      this.circle(size * 0.2, -size * 0.23, size * 0.12, C.soil, C.ink, 2);
      this.circle(-size * 0.12, -size * 0.03, size * 0.035, C.ink);
      this.circle(size * 0.12, -size * 0.03, size * 0.035, C.ink);
    }
    ctx.restore();
  }

  prepareChromaSprite(imageElement, tolerance = 72) {
    const canvas = document.createElement("canvas");
    canvas.width = imageElement.naturalWidth;
    canvas.height = imageElement.naturalHeight;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(imageElement, 0, 0);
    const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const pixels = image.data;
    const visited = new Uint8Array(canvas.width * canvas.height);
    const queue = [];
    const cornerIndexes = [
      0,
      canvas.width - 1,
      (canvas.height - 1) * canvas.width,
      canvas.width * canvas.height - 1
    ];
    const cornerColors = cornerIndexes.map((index) => {
      const offset = index * 4;
      return [pixels[offset], pixels[offset + 1], pixels[offset + 2]];
    });
    const isBackground = (index) => {
      const offset = index * 4;
      const red = pixels[offset];
      const green = pixels[offset + 1];
      const blue = pixels[offset + 2];
      return cornerColors.some(([cornerRed, cornerGreen, cornerBlue]) => (
        Math.hypot(red - cornerRed, green - cornerGreen, blue - cornerBlue) < tolerance
      ));
    };
    const add = (index) => {
      if (visited[index] || !isBackground(index)) return;
      visited[index] = 1;
      queue.push(index);
    };
    for (let x = 0; x < canvas.width; x += 1) {
      add(x);
      add((canvas.height - 1) * canvas.width + x);
    }
    for (let y = 0; y < canvas.height; y += 1) {
      add(y * canvas.width);
      add(y * canvas.width + canvas.width - 1);
    }
    for (let cursor = 0; cursor < queue.length; cursor += 1) {
      const index = queue[cursor];
      pixels[index * 4 + 3] = 0;
      const x = index % canvas.width;
      if (x > 0) add(index - 1);
      if (x < canvas.width - 1) add(index + 1);
      if (index >= canvas.width) add(index - canvas.width);
      if (index < canvas.width * (canvas.height - 1)) add(index + canvas.width);
    }
    ctx.putImageData(image, 0, 0);
    return canvas;
  }

  pixelateSpriteSheet(source, columns, rows, cellPixels) {
    const canvas = document.createElement("canvas");
    canvas.width = columns * cellPixels;
    canvas.height = rows * cellPixels;
    const ctx = canvas.getContext("2d");
    const sourceCellWidth = source.width / columns;
    const sourceCellHeight = source.height / rows;
    ctx.imageSmoothingEnabled = true;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        ctx.drawImage(
          source,
          col * sourceCellWidth,
          row * sourceCellHeight,
          sourceCellWidth,
          sourceCellHeight,
          col * cellPixels,
          row * cellPixels,
          cellPixels,
          cellPixels
        );
      }
    }
    return canvas;
  }

  petActorPosition(petId) {
    const index = Math.max(0, Core.PET_TYPES.findIndex((pet) => pet.id === petId));
    const phase = this.frameNow / 5200;
    if (MOBILE_LAYOUT) {
      const routes = {
        dog: { x: 310 + Math.sin(phase * 1.25) * 150, y: 390 + Math.sin(phase * 2.1) * 48, facing: Math.cos(phase * 1.25) >= 0 ? 1 : -1, pace: 1.2 },
        cat: { x: 410 + Math.sin(phase * 0.52 + 1.4) * 92, y: 335 + Math.sin(phase * 0.8 + 0.5) * 35, facing: Math.cos(phase * 0.52 + 1.4) >= 0 ? 1 : -1, pace: 0.55 },
        rabbit: { x: 315 + Math.sin(phase * 1.8 + 2.2) * 115, y: 485 + Math.sin(phase * 1.1) * 22, facing: Math.cos(phase * 1.8 + 2.2) >= 0 ? 1 : -1, pace: 1.8 },
        chick: { x: 125 + Math.cos(phase * 1.35) * 58, y: 335 + Math.sin(phase * 1.35) * 42, facing: -Math.sin(phase * 1.35) >= 0 ? 1 : -1, pace: 1.35 }
      };
      const route = routes[petId] || routes.dog;
      const behaviorCycle = (this.frameNow / ({ dog: 7200, cat: 9800, rabbit: 6200, chick: 5600 }[petId] || 7200) + index * 0.19) % 1;
      const action = behaviorCycle > ({ dog: 0.9, cat: 0.7, rabbit: 0.91, chick: 0.86 }[petId] || 0.88)
        ? "sleep"
        : behaviorCycle < ({ dog: 0.7, cat: 0.34, rabbit: 0.58, chick: 0.74 }[petId] || 0.6) ? "walk" : "idle";
      const effect = [...this.actionEffects].reverse().find((entry) => entry.type === "pet-action" && entry.petId === petId && entry.until >= this.frameNow);
      if (!effect) return { ...route, walking: action === "walk", action, step: Math.sin(this.frameNow / (155 / route.pace) + index) };
      const targets = {
        feed: { x: 180, y: 495 },
        play: { x: 315, y: 510 },
        bathe: { x: 520, y: 475 },
        groom: { x: 545, y: 330 },
        pet: route
      };
      const progress = this.effectProgress(effect);
      const travel = Math.sin(progress * Math.PI);
      const target = targets[effect.action] || route;
      const effectAction = progress < 0.24 || progress > 0.76
        ? "walk"
        : ({ feed: "feed", play: "play", bathe: "care", groom: "care", pet: "idle" }[effect.action] || "idle");
      return {
        x: route.x + (target.x - route.x) * travel,
        y: route.y + (target.y - route.y) * travel,
        walking: effectAction === "walk",
        action: effectAction,
        facing: target.x >= route.x ? 1 : -1,
        step: Math.sin(progress * Math.PI * 8)
      };
    }
    const routes = {
      dog: {
        x: 335 + Math.sin(phase * 1.25) * 135,
        y: 445 + Math.sin(phase * 2.1) * 45,
        facing: Math.cos(phase * 1.25) >= 0 ? 1 : -1,
        pace: 1.2
      },
      cat: {
        x: 445 + Math.sin(phase * 0.52 + 1.4) * 82,
        y: 382 + Math.sin(phase * 0.8 + 0.5) * 32,
        facing: Math.cos(phase * 0.52 + 1.4) >= 0 ? 1 : -1,
        pace: 0.55
      },
      rabbit: {
        x: 325 + Math.sin(phase * 1.8 + 2.2) * 102,
        y: 505 + Math.sin(phase * 1.1) * 20,
        facing: Math.cos(phase * 1.8 + 2.2) >= 0 ? 1 : -1,
        pace: 1.8
      },
      chick: {
        x: 112 + Math.cos(phase * 1.35) * 54,
        y: 355 + Math.sin(phase * 1.35) * 38,
        facing: -Math.sin(phase * 1.35) >= 0 ? 1 : -1,
        pace: 1.35
      }
    };
    const route = routes[petId] || routes.dog;
    const roam = { x: route.x, y: route.y };
    const behaviorCycle = (this.frameNow / ({ dog: 7200, cat: 9800, rabbit: 6200, chick: 5600 }[petId] || 7200) + index * 0.19) % 1;
    const roamingAction = behaviorCycle > ({ dog: 0.9, cat: 0.7, rabbit: 0.91, chick: 0.86 }[petId] || 0.88)
      ? "sleep"
      : behaviorCycle < ({ dog: 0.7, cat: 0.34, rabbit: 0.58, chick: 0.74 }[petId] || 0.6)
        ? "walk"
        : "idle";
    const effect = [...this.actionEffects].reverse().find((entry) => (
      entry.type === "pet-action"
      && entry.petId === petId
      && entry.until >= this.frameNow
    ));
    if (!effect) {
      return {
        ...roam,
        walking: roamingAction === "walk",
        action: roamingAction,
        facing: route.facing,
        step: Math.sin(this.frameNow / (155 / route.pace) + index)
      };
    }
    const targets = {
      feed: { x: 210, y: 510 },
      play: { x: 315, y: 520 },
      bathe: { x: 530, y: 485 },
      groom: { x: 558, y: 355 },
      pet: roam
    };
    const progress = this.effectProgress(effect);
    const travel = Math.sin(progress * Math.PI);
    const target = targets[effect.action] || roam;
    const action = progress < 0.24 || progress > 0.76
      ? "walk"
      : ({ feed: "feed", play: "play", bathe: "care", groom: "care", pet: "idle" }[effect.action] || "idle");
    return {
      x: roam.x + (target.x - roam.x) * travel,
      y: roam.y + (target.y - roam.y) * travel,
      walking: action === "walk",
      action,
      facing: target.x >= roam.x ? 1 : -1,
      step: Math.sin(progress * Math.PI * 8)
    };
  }

  drawPixelPetActor(petId, x, y, size = 68, options = {}) {
    if (this.petSpriteCanvas) {
      const type = Core.petType(petId);
      const actionColumn = {
        idle: 0,
        walk: 1,
        feed: 2,
        play: 3,
        care: 4,
        sleep: 5
      }[options.action || (options.walking ? "walk" : "idle")] || 0;
      const cellWidth = this.petSpriteCanvas.width / 6;
      const cellHeight = this.petSpriteCanvas.height / 4;
      const sourceInsetX = Math.max(1, Math.round(cellWidth * 0.035));
      const sourceInsetY = Math.max(2, Math.round(cellHeight * 0.055));
      const facing = options.facing || 1;
      const bounce = options.walking ? Math.abs(options.step || 0) * 2.5 : Math.sin(this.frameNow / 430 + type.portrait) * 1.4;
      const ctx = this.ctx;
      ctx.save();
      ctx.translate(Math.round(x), Math.round(y - bounce));
      if (options.selected) {
        ctx.save();
        ctx.globalAlpha = 0.56 + Math.sin(this.frameNow / 210) * 0.14;
        ctx.beginPath();
        ctx.ellipse(0, 2, size * 0.42, size * 0.13, 0, 0, Math.PI * 2);
        ctx.strokeStyle = C.yellow;
        ctx.lineWidth = 3;
        ctx.stroke();
        ctx.restore();
      }
      ctx.globalAlpha = 0.17;
      ctx.beginPath();
      ctx.ellipse(0, 3, size * 0.34, size * 0.1, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.ink;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.scale(facing, 1);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.petSpriteCanvas,
        actionColumn * cellWidth + sourceInsetX,
        type.portrait * cellHeight + sourceInsetY,
        cellWidth - sourceInsetX * 2,
        cellHeight - sourceInsetY * 2,
        -size / 2,
        -size,
        size,
        size
      );
      ctx.restore();
      return;
    }
    const ctx = this.ctx;
    const facing = options.facing || 1;
    const step = options.walking ? options.step || 0 : 0;
    const selected = Boolean(options.selected);
    const colors = {
      dog: { body: "#efbd73", patch: "#9f5b2f", light: "#fff0c9" },
      cat: { body: "#efa43e", patch: "#b95c2c", light: "#fff0ca" },
      rabbit: { body: "#f5f0e8", patch: "#e9a6b6", light: "#ffffff" },
      chick: { body: "#f3cf4f", patch: "#e98936", light: "#fff2a5" }
    }[petId];
    const scale = size / 72;
    const bounce = options.walking ? Math.abs(step) * 2 : Math.sin(this.frameNow / 420 + x) * 1.4;
    ctx.save();
    ctx.translate(Math.round(x), Math.round(y - bounce));
    if (selected) {
      ctx.save();
      ctx.globalAlpha = 0.55 + Math.sin(this.frameNow / 210) * 0.15;
      ctx.beginPath();
      ctx.ellipse(0, 3, 31 * scale, 12 * scale, 0, 0, Math.PI * 2);
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(0, 4, 25 * scale, 8 * scale, 0, 0, Math.PI * 2);
    ctx.fillStyle = C.ink;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.scale(facing * scale, scale);

    const leg = Math.round(step * 4);
    if (petId === "dog") {
      this.line(24, -30, 32, -39 - Math.sin(this.frameNow / 170) * 5, colors.patch, 6);
      this.rounded(-21, -30, 43, 29, 10, colors.body, C.ink, 2);
      this.rounded(-15, -7 + leg, 9, 13, 3, colors.patch, C.ink, 1);
      this.rounded(7, -7 - leg, 9, 13, 3, colors.patch, C.ink, 1);
      this.circle(-1, -43, 23, colors.body, C.ink, 2);
      this.rounded(-25, -55, 10, 28, 5, colors.patch, C.ink, 2);
      this.rounded(15, -55, 10, 28, 5, colors.patch, C.ink, 2);
      this.rounded(-12, -42, 24, 16, 7, colors.light);
      this.circle(-8, -47, 3, C.ink);
      this.circle(8, -47, 3, C.ink);
      this.rect(-3, -42, 6, 5, C.ink);
      ctx.beginPath();
      ctx.moveTo(-16, -28);
      ctx.lineTo(16, -28);
      ctx.lineTo(0, -13);
      ctx.closePath();
      ctx.fillStyle = C.greenDark;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else if (petId === "cat") {
      this.ctx.beginPath();
      this.ctx.arc(20, -27, 18, -1.2, 1.4);
      this.ctx.strokeStyle = colors.patch;
      this.ctx.lineWidth = 7;
      this.ctx.stroke();
      this.rounded(-20, -31, 40, 30, 13, colors.body, C.ink, 2);
      this.rounded(-14, -7 + leg, 8, 13, 3, colors.patch, C.ink, 1);
      this.rounded(7, -7 - leg, 8, 13, 3, colors.patch, C.ink, 1);
      ctx.beginPath();
      ctx.moveTo(-20, -58);
      ctx.lineTo(-12, -72);
      ctx.lineTo(-4, -57);
      ctx.moveTo(4, -57);
      ctx.lineTo(12, -72);
      ctx.lineTo(21, -57);
      ctx.fillStyle = colors.body;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      this.circle(0, -45, 23, colors.body, C.ink, 2);
      this.rounded(-12, -42, 24, 15, 7, colors.light);
      this.circle(-8, -48, 3, C.ink);
      this.circle(8, -48, 3, C.ink);
      this.rect(-2, -42, 4, 4, C.coral);
      this.line(-17, -38, -29, -41, C.inkSoft, 1);
      this.line(17, -38, 29, -41, C.inkSoft, 1);
    } else if (petId === "rabbit") {
      this.rounded(-19, -32, 38, 31, 13, colors.body, C.ink, 2);
      this.rounded(-16, -8 + leg, 11, 14, 4, colors.light, C.ink, 1);
      this.rounded(5, -8 - leg, 11, 14, 4, colors.light, C.ink, 1);
      this.rounded(-17, -83, 13, 42, 7, colors.body, C.ink, 2);
      this.rounded(4, -83, 13, 42, 7, colors.body, C.ink, 2);
      this.rounded(-13, -77, 5, 29, 3, colors.patch);
      this.rounded(8, -77, 5, 29, 3, colors.patch);
      this.circle(0, -43, 22, colors.body, C.ink, 2);
      this.circle(-8, -47, 3, C.ink);
      this.circle(8, -47, 3, C.ink);
      this.rect(-2, -41, 4, 4, C.coral);
    } else {
      this.rounded(-24, -43, 48, 42, 19, colors.body, C.ink, 2);
      this.rounded(-30, -34, 13, 23, 8, colors.light, C.ink, 1);
      this.rounded(17, -34, 13, 23, 8, colors.light, C.ink, 1);
      this.line(-10, -2, -12 + leg, 6, colors.patch, 3);
      this.line(10, -2, 12 - leg, 6, colors.patch, 3);
      this.circle(-8, -34, 3, C.ink);
      this.circle(8, -34, 3, C.ink);
      this.rect(-5, -27, 10, 6, colors.patch, C.ink, 1);
      this.rect(-3, -51, 6, 9, colors.patch, C.ink, 1);
    }
    ctx.restore();
  }

  drawShopIcon(id, x, y, scale = 1) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (id === "watering") {
      this.rounded(-13, -8, 22, 18, 4, C.sky, C.ink, 2);
      this.line(8, -3, 17, 3, C.blue, 5);
      this.line(-6, -8, -6, -15, C.ink, 2);
      this.drawWaterDrop(17, 10, 3);
    } else if (id === "basket") {
      this.rounded(-14, -5, 28, 19, 3, C.yellowSoft, C.ink, 2);
      this.ctx.beginPath();
      this.ctx.arc(0, -4, 10, Math.PI, 0);
      this.ctx.strokeStyle = C.soilDark;
      this.ctx.lineWidth = 3;
      this.ctx.stroke();
      this.line(-6, -3, -6, 12, C.soilDark, 1);
      this.line(2, -3, 2, 12, C.soilDark, 1);
    } else if (id === "greenhouse") {
      this.ctx.beginPath();
      this.ctx.moveTo(-15, 12);
      this.ctx.lineTo(-12, -5);
      this.ctx.lineTo(0, -15);
      this.ctx.lineTo(12, -5);
      this.ctx.lineTo(15, 12);
      this.ctx.closePath();
      this.ctx.fillStyle = "rgba(125,198,216,0.45)";
      this.ctx.fill();
      this.ctx.strokeStyle = C.ink;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.line(0, -14, 0, 12, C.blue, 1);
    } else if (id === "market") {
      this.rect(-14, -5, 28, 18, C.paper, C.ink, 2);
      this.rect(-17, -13, 34, 9, C.coral, C.ink, 2);
      this.rect(-7, 2, 8, 11, C.greenDark);
    } else if (id === "sprinkler") {
      this.rect(-7, -2, 14, 16, C.sky, C.ink, 2);
      this.line(-14, -4, 14, -4, C.blue, 4);
      for (let drop = -1; drop <= 1; drop += 1) this.drawWaterDrop(drop * 12, -13 - Math.abs(drop) * 2, 3);
    } else if (id === "harvester") {
      this.rounded(-15, -9, 30, 22, 4, C.yellow, C.ink, 2);
      this.circle(-9, 14, 5, C.ink);
      this.circle(9, 14, 5, C.ink);
      this.rect(-8, -4, 16, 9, C.cream, C.ink, 1);
    } else if (id === "soilKit" || id === "compostBin") {
      this.rounded(-12, -14, 24, 28, 4, C.greenSoft, C.ink, 2);
      this.text(id === "soilKit" ? "土" : "肥", 0, 1, 13, C.greenDark, "center", 900);
    } else if (id === "windmill") {
      this.line(0, -2, 0, 16, C.soilDark, 4);
      for (let blade = 0; blade < 4; blade += 1) {
        ctx.save();
        ctx.rotate(this.frameNow / 900 + blade * Math.PI / 2);
        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(5, -16);
        ctx.lineTo(-3, -17);
        ctx.closePath();
        ctx.fillStyle = [C.coral, C.sky, C.yellow, C.green][blade];
        ctx.fill();
        ctx.restore();
      }
      this.circle(0, 0, 4, C.paper, C.ink, 1);
    } else if (id === "scarecrow") {
      this.line(0, -8, 0, 16, C.soilDark, 4);
      this.line(-14, -2, 14, -2, C.soilDark, 3);
      this.circle(0, -12, 8, C.yellowSoft, C.ink, 2);
      this.line(-9, -20, 9, -20, C.coralDark, 3);
    } else if (id === "orderBell") {
      ctx.beginPath();
      ctx.arc(0, 2, 13, Math.PI, 0);
      ctx.lineTo(15, 9);
      ctx.lineTo(-15, 9);
      ctx.closePath();
      ctx.fillStyle = C.yellow;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      this.circle(0, 12, 3, C.coralDark);
    } else {
      this.rounded(-14, -14, 28, 28, 4, C.sky, C.ink, 2);
      this.rect(-9, -8, 18, 9, C.cream, C.blue, 1);
      this.line(-7, 7, 7, 7, C.white, 3);
    }
    ctx.restore();
  }

  marketItemsForTab(tab = this.marketTab) {
    const ids = {
      growth: ["watering", "basket", "greenhouse", "market", "compostBin", "orderBell"],
      automation: ["sprinkler", "harvester", "soilKit", "coldStorage"],
      decor: ["windmill", "scarecrow"]
    }[tab] || [];
    return ids.map((id) => Core.SHOP_ITEMS.find((item) => item.id === id)).filter(Boolean);
  }

  drawMarket() {
    this.text("经营集市", 18, 148, 17, C.ink, "left", 900);
    this.text("升级、自动化与装饰分区陈列", 118, 148, 10, C.greenDark, "left", 700);
    [
      ["growth", "效率升级"],
      ["automation", "自动化"],
      ["decor", "农场装饰"]
    ].forEach(([tab, label], index) => {
      this.button(label, 18 + index * 103, 161, 95, 30, "market-tab", { tab }, {
        fill: this.marketTab === tab ? C.coral : C.paper,
        color: this.marketTab === tab ? C.white : C.ink,
        size: 11
      });
    });

    this.marketItemsForTab().forEach((item, index) => {
      const col = index % 3;
      const row = Math.floor(index / 3);
      const x = 18 + col * 205;
      const y = 201 + row * 145;
      const level = Core.itemLevel(this.state, item);
      const maxed = level >= item.max;
      const cost = Core.itemCost(this.state, item);
      this.rounded(x, y, 194, 132, 7, index % 2 ? C.cream : C.paper, C.ink, 2);
      this.drawShopIcon(item.id, x + 164, y + 29, 0.86);
      this.text(item.name, x + 13, y + 20, 13, C.ink, "left", 900);
      const status = item.kind === "consumable"
        ? `持有 ${level}`
        : item.kind === "automation"
          ? `已购 ${level}/${item.max} · 空闲 ${Core.unplacedAutomation(this.state, item.id)}`
          : `Lv.${level}/${item.max}`;
      this.text(status, x + 13, y + 45, 10, C.greenDark, "left", 800);
      this.text(item.description, x + 13, y + 70, 9, C.inkSoft, "left", 700);
      if (item.kind === "automation" && level > 0) {
        this.button("布置", x + 12, y + 94, 70, 27, "place-auto", { itemId: item.id }, { fill: C.mint, size: 10 });
        this.button(maxed ? "已满" : `再买 ￥${cost}`, x + 88, y + 94, 94, 27, "buy-shop", { itemId: item.id }, {
          disabled: maxed,
          fill: C.yellowSoft,
          size: 10
        });
      } else {
        this.button(maxed ? "已拥有" : `购买 ￥${cost}`, x + 72, y + 94, 110, 27, "buy-shop", { itemId: item.id }, {
          disabled: maxed,
          fill: C.yellowSoft,
          size: 10
        });
      }
    });

    this.rounded(636, 161, 306, 100, 7, C.paper, C.ink, 2);
    this.drawPetPortrait("dog", 675, 211, 70);
    this.text("暖阳宠物园", 715, 181, 14, C.ink, "left", 900);
    this.text(this.state.petGarden.unlocked ? "已解锁 · 宠物会带来访客收益" : `购买地契 ￥${Core.PET_GARDEN_COST}`, 715, 206, 9, C.greenDark, "left", 700);
    this.button(this.state.petGarden.unlocked ? "进入" : "解锁", 824, 218, 103, 30, this.state.petGarden.unlocked ? "nav" : "unlock-pets", {
      view: "pets"
    }, { fill: C.coral, color: C.white, size: 11 });

    this.rounded(636, 272, 306, 72, 7, C.cream, C.ink, 2);
    this.text("种子券兑换", 650, 291, 12, C.ink, "left", 900);
    this.text("1 张券换当前等级随机种子", 650, 316, 9, C.inkSoft, "left", 700);
    this.button("兑换", 844, 289, 83, 34, "exchange", {}, {
      disabled: this.state.seedTickets < 1,
      fill: C.greenSoft,
      size: 11
    });

    this.rounded(636, 355, 306, 72, 7, C.paper, C.ink, 2);
    const landCost = Core.nextLandCost(this.state);
    this.text("农田扩建", 650, 374, 12, C.ink, "left", 900);
    this.text(`${this.state.unlockedPlots}/${Core.PLOT_COUNT} 块土地`, 650, 399, 9, C.greenDark, "left", 800);
    this.button(landCost == null ? "已全部解锁" : `解锁 ￥${landCost}`, 805, 372, 122, 34, "unlock-land", {}, {
      disabled: landCost == null,
      fill: C.greenSoft,
      size: 10
    });

    this.text(`丰收研究 · ★${this.state.stars}`, 636, 451, 14, C.ink, "left", 900);
    Core.RESEARCH.forEach((entry, index) => {
      const y = 467 + index * 53;
      const level = this.state.research[entry.id];
      const cost = Core.researchCost(this.state, entry.id);
      this.rounded(636, y, 306, 46, 5, index % 2 ? C.cream : C.paper, C.ink, 1);
      this.text(entry.name, 650, y + 14, 11, C.ink, "left", 900);
      this.text(`${entry.description} · Lv.${level}`, 650, y + 33, 8, C.greenDark, "left", 700);
      this.button(cost == null ? "完成" : `★${cost}`, 872, y + 8, 56, 30, "research", { researchId: entry.id }, {
        disabled: cost == null,
        fill: C.yellowSoft,
        size: 10
      });
    });
  }

  drawMobileMarketItem(item, index, x, y) {
    const level = Core.itemLevel(this.state, item);
    const maxed = level >= item.max;
    const cost = Core.itemCost(this.state, item);
    this.rounded(x, y, 294, 148, 7, index % 2 ? C.cream : C.paper, C.ink, 2);
    this.drawShopIcon(item.id, x + 258, y + 30, 0.92);
    this.text(item.name, x + 14, y + 22, 13, C.ink, "left", 900);
    const status = item.kind === "consumable"
      ? `持有 ${level}`
      : item.kind === "automation"
        ? `已购 ${level}/${item.max} · 空闲 ${Core.unplacedAutomation(this.state, item.id)}`
        : `Lv.${level}/${item.max}`;
    this.text(status, x + 14, y + 51, 10, C.greenDark, "left", 800);
    this.text(item.description, x + 14, y + 78, 9, C.inkSoft, "left", 700);
    if (item.kind === "automation" && level > 0) {
      this.button("布置", x + 14, y + 102, 104, 36, "place-auto", { itemId: item.id }, { fill: C.mint, size: 10 });
      this.button(maxed ? "已满" : `再买 ￥${cost}`, x + 128, y + 102, 152, 36, "buy-shop", { itemId: item.id }, {
        disabled: maxed,
        fill: C.yellowSoft,
        size: 10
      });
    } else {
      this.button(maxed ? "已拥有" : `购买 ￥${cost}`, x + 128, y + 102, 152, 36, "buy-shop", { itemId: item.id }, {
        disabled: maxed,
        fill: C.yellowSoft,
        size: 10
      });
    }
  }

  drawMobileMarket() {
    this.drawMobileTitle("经营集市", "升级、自动化、装饰");
    [
      ["growth", "效率升级"],
      ["automation", "自动化"],
      ["decor", "农场装饰"]
    ].forEach(([tab, label], index) => {
      this.button(label, 18 + index * 204, 151, 192, 40, "market-tab", { tab }, {
        fill: this.marketTab === tab ? C.coral : C.paper,
        color: this.marketTab === tab ? C.white : C.ink,
        size: 11
      });
    });
    const allItems = this.marketItemsForTab();
    const pageCount = Math.max(1, Math.ceil(allItems.length / 4));
    this.mobileMarketPage = Math.min(this.mobileMarketPage, pageCount - 1);
    allItems.slice(this.mobileMarketPage * 4, this.mobileMarketPage * 4 + 4).forEach((item, index) => {
      this.drawMobileMarketItem(item, index, 18 + (index % 2) * 310, 201 + Math.floor(index / 2) * 157);
    });
    if (pageCount > 1) {
      this.button("‹", 236, 510, 60, 36, "mobile-page", { target: "market", delta: -1 }, {
        disabled: this.mobileMarketPage === 0,
        size: 18
      });
      this.text(`${this.mobileMarketPage + 1} / ${pageCount}`, 320, 528, 11, C.ink, "center", 900);
      this.button("›", 344, 510, 60, 36, "mobile-page", { target: "market", delta: 1 }, {
        disabled: this.mobileMarketPage >= pageCount - 1,
        size: 18
      });
    }

    this.rounded(18, 556, 604, 68, 7, C.paper, C.ink, 2);
    this.drawPetPortrait("dog", 54, 590, 54);
    this.text("暖阳宠物园", 90, 577, 13, C.ink, "left", 900);
    this.text(this.state.petGarden.unlocked ? "已解锁 · 农作物供给宠物园" : `地契 ￥${Core.PET_GARDEN_COST}`, 90, 606, 9, C.greenDark, "left", 700);
    this.button(this.state.petGarden.unlocked ? "进入" : "解锁", 500, 571, 108, 40, this.state.petGarden.unlocked ? "nav" : "unlock-pets", {
      view: "pets"
    }, { fill: C.coral, color: C.white, size: 11 });

    this.rounded(18, 634, 294, 68, 6, C.cream, C.ink, 2);
    this.text("种子券兑换", 32, 655, 12, C.ink, "left", 900);
    this.text(`持有 ${this.state.seedTickets} 张`, 32, 683, 9, C.greenDark, "left", 800);
    this.button("兑换", 211, 648, 87, 40, "exchange", {}, {
      disabled: this.state.seedTickets < 1,
      fill: C.greenSoft,
      size: 10
    });

    const landCost = Core.nextLandCost(this.state);
    this.rounded(328, 634, 294, 68, 6, C.paper, C.ink, 2);
    this.text("农田扩建", 342, 655, 12, C.ink, "left", 900);
    this.text(`${this.state.unlockedPlots}/${Core.PLOT_COUNT} 块`, 342, 683, 9, C.greenDark, "left", 800);
    this.button(landCost == null ? "已满" : `￥${landCost}`, 515, 648, 93, 40, "unlock-land", {}, {
      disabled: landCost == null,
      fill: C.greenSoft,
      size: 10
    });

    this.text(`丰收研究 · ★${this.state.stars}`, 18, 723, 13, C.ink, "left", 900);
    Core.RESEARCH.forEach((entry, index) => {
      const y = 741 + index * 45;
      const level = this.state.research[entry.id];
      const cost = Core.researchCost(this.state, entry.id);
      this.rounded(18, y, 604, 39, 5, index % 2 ? C.cream : C.paper, C.ink, 1);
      this.text(`${entry.name} Lv.${level}`, 32, y + 20, 10, C.ink, "left", 900);
      this.text(entry.description, 183, y + 20, 9, C.greenDark, "left", 700);
      this.button(cost == null ? "完成" : `★${cost}`, 546, y + 4, 64, 31, "research", { researchId: entry.id }, {
        disabled: cost == null,
        fill: C.yellowSoft,
        size: 9
      });
    });
  }

  drawPetFacilityIcon(icon, x, y, scale = 1) {
    const facilityIndex = {
      food: 0,
      kennel: 1,
      pond: 2,
      feeder: 3,
      toy: 4,
      groom: 5,
      flower: 6,
      lamp: 7,
      picnic: 8,
      birdbath: 9,
      path: 10,
      music: 11
    }[icon];
    if (this.petFacilityCanvas && facilityIndex != null) {
      const ctx = this.ctx;
      const cellWidth = this.petFacilityCanvas.width / 4;
      const cellHeight = this.petFacilityCanvas.height / 3;
      const size = 58 * scale;
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(
        this.petFacilityCanvas,
        (facilityIndex % 4) * cellWidth,
        Math.floor(facilityIndex / 4) * cellHeight,
        cellWidth,
        cellHeight,
        x - size / 2,
        y - size / 2,
        size,
        size
      );
      ctx.restore();
      return;
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    if (icon === "food") {
      this.rounded(-15, 2, 30, 13, 5, C.coral, C.ink, 2);
      this.circle(-8, 1, 5, C.soil, C.ink, 1);
      this.circle(0, -1, 5, C.soil, C.ink, 1);
      this.circle(8, 1, 5, C.soil, C.ink, 1);
    } else if (icon === "kennel") {
      this.rect(-14, -5, 28, 20, C.yellowSoft, C.ink, 2);
      ctx.beginPath();
      ctx.moveTo(-18, -5);
      ctx.lineTo(0, -20);
      ctx.lineTo(18, -5);
      ctx.closePath();
      ctx.fillStyle = C.coral;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      this.rounded(-6, 2, 12, 13, 5, C.soilDark);
    } else if (icon === "pond") {
      ctx.beginPath();
      ctx.ellipse(0, 6, 19, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = C.sky;
      ctx.fill();
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = 2;
      ctx.stroke();
      this.line(-12, 4, 10, 4, C.white, 2);
      this.rect(-16, -8, 4, 12, C.greenDark);
      this.line(-14, -7, -20, -14, C.green, 3);
    } else if (icon === "feeder") {
      this.rect(-8, -18, 16, 24, C.yellow, C.ink, 2);
      this.rounded(-17, 4, 34, 12, 4, C.coral, C.ink, 2);
      this.circle(0, -8, 4, C.green, C.ink, 1);
    } else if (icon === "toy") {
      this.rect(-17, 0, 34, 16, C.coral, C.ink, 2);
      this.circle(-9, -7, 8, C.yellow, C.ink, 2);
      this.line(-14, -7, -4, -7, C.blue, 2);
      this.rect(3, -13, 10, 13, C.greenSoft, C.ink, 1);
    } else if (icon === "groom") {
      this.rect(-16, 3, 32, 13, C.paper, C.ink, 2);
      this.rect(-3, -15, 6, 18, C.soilDark, C.ink, 1);
      this.line(-12, -12, 12, -12, C.coral, 5);
      for (let tooth = -10; tooth <= 10; tooth += 5) this.line(tooth, -10, tooth, -4, C.ink, 1);
    } else if (icon === "flower") {
      this.line(-14, 16, -14, -3, C.greenDark, 3);
      this.line(14, 16, 14, -3, C.greenDark, 3);
      ctx.beginPath();
      ctx.arc(0, -3, 15, Math.PI, 0);
      ctx.strokeStyle = C.greenDark;
      ctx.lineWidth = 4;
      ctx.stroke();
      [-12, -5, 3, 11].forEach((dx, index) => this.circle(dx, -8 - Math.abs(dx) * 0.18, 4, index % 2 ? C.yellow : C.coral, C.ink, 1));
    } else if (icon === "lamp") {
      this.line(0, -12, 0, 16, C.soilDark, 4);
      this.rounded(-9, -18, 18, 14, 4, C.yellowSoft, C.ink, 2);
      this.circle(0, -11, 4, C.yellow);
    } else if (icon === "birdbath") {
      this.rect(-3, -1, 6, 18, C.paper, C.ink, 1);
      this.rounded(-12, 14, 24, 5, 2, C.paper2, C.ink, 1);
      this.ctx.beginPath();
      this.ctx.ellipse(0, -4, 15, 6, 0, 0, Math.PI * 2);
      this.ctx.fillStyle = C.sky;
      this.ctx.fill();
      this.ctx.strokeStyle = C.ink;
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      this.rect(4, -17, 9, 7, C.yellow, C.ink, 1);
      this.rect(11, -14, 5, 2, C.coral);
      this.line(7, -10, 5, -6, C.soilDark, 1);
      this.line(10, -10, 12, -6, C.soilDark, 1);
    } else if (icon === "path") {
      [
        [-12, 5, C.coral],
        [1, -4, C.sky],
        [13, 7, C.yellow],
        [-1, 12, C.greenSoft]
      ].forEach(([dx, dy, color]) => {
        this.ctx.beginPath();
        this.ctx.ellipse(dx, dy, 8, 5, -0.18, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        this.ctx.strokeStyle = C.ink;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      });
    } else if (icon === "music") {
      this.rounded(-15, -5, 30, 20, 3, C.coral, C.ink, 2);
      this.rect(-10, -13, 20, 9, C.yellowSoft, C.ink, 1);
      this.circle(-5, 5, 4, C.yellow, C.ink, 1);
      this.line(15, 2, 22, 2, C.soilDark, 2);
      this.line(21, 2, 21, 9, C.soilDark, 2);
      this.line(18, 9, 24, 9, C.soilDark, 2);
    } else {
      this.rect(-18, -5, 36, 21, C.paper, C.ink, 2);
      this.rect(-18, -5, 18, 10, C.coral);
      this.rect(0, 5, 18, 11, C.greenSoft);
      this.line(-12, 16, -12, 21, C.soilDark, 3);
      this.line(12, 16, 12, 21, C.soilDark, 3);
    }
    ctx.restore();
  }

  drawPetMeter(label, value, x, y, color) {
    this.text(label, x, y, 10, C.ink, "left", 800);
    this.rounded(x + 38, y - 6, 70, 12, 4, C.paper2, C.ink, 1);
    this.rounded(x + 40, y - 4, 66 * clamp01(value / 100), 8, 3, color);
    this.text(Math.round(value), x + 113, y, 9, C.inkSoft, "left", 800);
  }

  drawPetGardenScene() {
    const garden = this.state.petGarden;
    const selectedType = Core.petType(garden.selectedPet);
    const selected = garden.pets[garden.selectedPet];
    this.rounded(18, 169, 600, 455, 7, C.paper2, C.ink, 2);
    if (this.petGardenBackground.complete && this.petGardenBackground.naturalWidth) {
      const sourceWidth = this.petGardenBackground.naturalWidth;
      const sourceHeight = Math.min(
        this.petGardenBackground.naturalHeight,
        Math.round(sourceWidth / (596 / 398))
      );
      const sourceY = Math.max(0, Math.round((this.petGardenBackground.naturalHeight - sourceHeight) / 2));
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.rect(20, 224, 596, 398);
      this.ctx.clip();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(
        this.petGardenBackground,
        0,
        sourceY,
        sourceWidth,
        sourceHeight,
        20,
        224,
        596,
        398
      );
      this.ctx.restore();
    } else {
      this.rect(20, 224, 596, 398, "#8fc36d");
    }
    this.rect(20, 216, 596, 10, C.paper, C.ink, 1);

    this.rounded(28, 179, 438, 34, 5, C.cream, C.ink, 1);
    this.text(
      selected?.owned ? `当前伙伴：${selectedType.name} · ${Core.petMood(selected)} 心情` : "草地活动区 · 领养后可在右侧查看状态",
      42,
      197,
      10,
      selected?.owned ? C.greenDark : C.inkSoft,
      "left",
      800
    );
    this.button(`领取 ￥${garden.visitorCoins}`, 480, 179, 126, 34, "pet-claim", {}, {
      disabled: garden.visitorCoins < 1,
      fill: C.yellowSoft,
      size: 10
    });

    const facilities = garden.facilities;
    this.drawPetFacilityIcon("food", 210, 510, 0.66);
    this.text(`粮 ${garden.food}`, 210, 533, 8, C.greenDark, "center", 800);
    if (facilities.flowerArch) this.drawPetFacilityIcon("flower", 300, 286, 0.84);
    if (facilities.kennel) this.drawPetFacilityIcon("kennel", 78, 480, 1.02);
    if (facilities.pond) {
      this.drawPetFacilityIcon("pond", 535, 486, 1.08);
      const ripple = (Math.sin(this.frameNow / 340) + 1) / 2;
      this.ctx.save();
      this.ctx.globalAlpha = 0.35 * (1 - ripple);
      this.ctx.beginPath();
      this.ctx.ellipse(535, 492, 16 + ripple * 14, 5 + ripple * 4, 0, 0, Math.PI * 2);
      this.ctx.strokeStyle = C.white;
      this.ctx.stroke();
      this.ctx.restore();
    }
    if (facilities.autoFeeder) {
      this.drawPetFacilityIcon("feeder", 525, 296, 0.82);
      const drop = (this.frameNow / 900) % 1;
      this.circle(525, 302 + drop * 17, 2, C.soil, C.ink, 1);
    }
    if (facilities.toyBox) {
      this.drawPetFacilityIcon("toy", 315, 523, 0.72);
      this.circle(288 + Math.sin(this.frameNow / 500) * 7, 510 - Math.abs(Math.sin(this.frameNow / 360)) * 11, 5, C.yellow, C.ink, 1);
    }
    if (facilities.grooming) this.drawPetFacilityIcon("groom", 560, 355, 0.76);
    if (facilities.nightLamp) {
      this.drawPetFacilityIcon("lamp", 584, 422, 0.76);
      this.circle(584, 412, 15 + Math.sin(this.frameNow / 400) * 2, "rgba(243,201,85,0.13)");
    }
    if (facilities.picnic) this.drawPetFacilityIcon("picnic", 105, 363, 0.84);
    if (facilities.birdBath) {
      this.drawPetFacilityIcon("birdbath", 60, 302, 0.78);
      const splash = (this.frameNow / 720) % 1;
      this.drawWaterDrop(60 + Math.sin(this.frameNow / 180) * 4, 291 - splash * 10, 2, 0.75 * (1 - splash));
    }
    if (facilities.pebblePath) {
      const stones = Math.min(15, 5 + facilities.pebblePath * 4);
      for (let index = 0; index < stones; index += 1) {
        const ratio = index / Math.max(1, stones - 1);
        const x = 215 + ratio * 255;
        const y = 535 + Math.sin(index * 1.7) * 8;
        const colors = [C.coral, C.sky, C.yellow, C.greenSoft];
        this.ctx.beginPath();
        this.ctx.ellipse(x, y, 10, 6, index % 2 ? 0.22 : -0.22, 0, Math.PI * 2);
        this.ctx.fillStyle = colors[index % colors.length];
        this.ctx.fill();
        this.ctx.strokeStyle = C.ink;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
    if (facilities.musicBox) {
      this.drawPetFacilityIcon("music", 440, 530, 0.72);
      for (let note = 0; note < 3; note += 1) {
        const phase = ((this.frameNow / 980) + note / 3) % 1;
        this.ctx.save();
        this.ctx.globalAlpha = 1 - phase;
        this.text(note % 2 ? "♪" : "♫", 450 + note * 12, 516 - phase * 25, 12, note % 2 ? C.coral : C.blue, "center", 900);
        this.ctx.restore();
      }
    }
    if (this.state.upgrades.windmill) {
      this.drawShopIcon("windmill", 37, 530, 0.72);
      this.text(`Lv.${this.state.upgrades.windmill}`, 37, 560, 8, C.greenDark, "center", 800);
    }
    if (this.state.upgrades.scarecrow) this.drawShopIcon("scarecrow", 574, 540, 0.78);

    const actors = Core.PET_TYPES
      .filter((type) => garden.pets[type.id].owned)
      .map((type) => ({ type, position: this.petActorPosition(type.id) }))
      .sort((a, b) => a.position.y - b.position.y);
    if (actors.length) {
      actors.forEach(({ type, position }) => {
        const isSelected = garden.selectedPet === type.id;
        const size = { dog: 64, cat: 58, rabbit: 62, chick: 46 }[type.id];
        this.drawPixelPetActor(type.id, position.x, position.y, size, {
          selected: isSelected,
          walking: position.walking,
          action: position.action,
          facing: position.facing,
          step: position.step
        });
        if (isSelected) {
          this.rounded(position.x - 26, position.y + 7, 52, 17, 5, C.paper, C.ink, 1);
          this.text(type.name, position.x, position.y + 16, 8, C.ink, "center", 900);
        }
      });
    } else {
      this.rounded(235, 325, 210, 84, 6, C.paper, C.ink, 2);
      this.text("先从右侧领养小麦犬", 340, 355, 13, C.ink, "center", 900);
      this.text("领养后会在园里自由活动", 340, 383, 9, C.greenDark, "center", 700);
    }

    const petOwned = Boolean(selected?.owned);
    const activePetAction = [...this.actionEffects].reverse().find((effect) => (
      effect.type === "pet-action"
      && effect.petId === garden.selectedPet
      && effect.until >= this.frameNow
    ));
    if (activePetAction) {
      const actionLabel = { feed: "吃饭", pet: "撒娇", play: "玩球", bathe: "洗澡", groom: "梳毛" }[activePetAction.action] || "活动";
      this.rounded(250, 537, 180, 24, 5, "rgba(255,253,240,0.92)", C.ink, 1);
      this.text(`${selectedType.name}正在${actionLabel}…`, 340, 551, 9, C.greenDark, "center", 900);
    }
    this.rounded(23, 562, 590, 56, 5, "rgba(255,253,240,0.88)", C.ink, 1);
    [
      ["feed", "喂食", true],
      ["pet", "抚摸", true],
      ["play", "玩耍", true],
      ["bathe", facilities.pond ? "洗澡" : "洗澡·需水池", Boolean(facilities.pond)],
      ["groom", facilities.grooming ? "梳毛" : "梳毛·需护理", Boolean(facilities.grooming)]
    ].forEach(([action, label, available], index) => {
      this.button(label, 28 + index * 116, 570, 106, 34, "pet-action", { action }, {
        disabled: !petOwned || !available || Boolean(activePetAction),
        fill: available ? C.cream : C.paper2,
        size: available ? 11 : 8
      });
    });
  }

  drawPetShop() {
    const garden = this.state.petGarden;
    this.rounded(636, 169, 306, 455, 7, C.paper, C.ink, 2);
    this.text("宠物园商店", 650, 189, 15, C.ink, "left", 900);
    [
      ["pets", "领养"],
      ["facilities", "设施"],
      ["decor", "装饰"]
    ].forEach(([tab, label], index) => {
      this.button(label, 650 + index * 92, 204, 84, 29, "pet-tab", { tab }, {
        fill: this.petShopTab === tab ? C.coral : C.cream,
        color: this.petShopTab === tab ? C.white : C.ink,
        size: 10
      });
    });

    if (this.petShopTab === "pets") {
      Core.PET_TYPES.forEach((pet, index) => {
        const y = 242 + index * 86;
        const entry = garden.pets[pet.id];
        const locked = this.state.level < pet.level;
        const active = garden.selectedPet === pet.id;
        this.rounded(648, y, 282, 76, 5, index % 2 ? C.cream : C.paper2, C.ink, 1);
        this.drawPetPortrait(pet.id, 681, y + 38, 62, { alpha: locked ? 0.4 : 1 });
        this.text(pet.name, 718, y + 17, 12, locked ? C.lock : C.ink, "left", 900);
        if (entry.owned) {
          [
            ["饱", entry.hunger, C.yellow],
            ["乐", entry.happiness, C.coral],
            ["净", entry.cleanliness, C.sky]
          ].forEach(([label, value, color], meterIndex) => {
            const x = 718 + meterIndex * 38;
            this.text(label, x, y + 39, 8, C.inkSoft, "left", 800);
            this.rounded(x, y + 51, 31, 7, 3, C.paper, C.ink, 1);
            this.rounded(x + 1, y + 52, 29 * clamp01(value / 100), 5, 2, color);
          });
          this.text(`心情 ${Core.petMood(entry)}`, 718, y + 67, 8, C.greenDark, "left", 800);
          this.button(active ? "当前" : "查看", 838, y + 44, 80, 26, "pet-select", { petId: pet.id }, {
            disabled: active,
            fill: active ? C.greenSoft : C.yellowSoft,
            size: 9
          });
        } else {
          this.text(locked ? `农场 Lv.${pet.level} 解锁` : pet.description, 718, y + 38, 8, locked ? C.lock : C.greenDark, "left", 700);
          this.button(`￥${pet.cost}`, 838, y + 46, 80, 24, "pet-buy", { petId: pet.id }, {
            disabled: locked,
            fill: C.yellowSoft,
            size: 9
          });
        }
      });
    } else {
      const items = this.petShopTab === "decor"
        ? Core.PET_FACILITIES.filter((item) => item.kind === "decoration")
        : Core.PET_FACILITIES.filter((item) => item.kind !== "decoration");
      const rowHeight = items.length > 4 ? 58 : 84;
      items.forEach((item, index) => {
        const y = 242 + index * rowHeight;
        const level = item.kind === "consumable" ? garden.food : garden.facilities[item.id];
        const maxed = item.kind !== "consumable" && level >= item.max;
        const cost = Core.petFacilityCost(this.state, item.id);
        this.rounded(648, y, 282, rowHeight - 7, 5, index % 2 ? C.cream : C.paper2, C.ink, 1);
        this.drawPetFacilityIcon(item.icon, 674, y + (rowHeight - 7) / 2, rowHeight > 70 ? 0.9 : 0.72);
        this.text(item.name, 703, y + 15, 10, C.ink, "left", 900);
        this.text(
          item.kind === "consumable"
            ? `农场蔬菜 ${Core.availableProduce(this.state)} 份 · 粮 ${garden.food}`
            : `${item.description} · ${level}/${item.max}`,
          703,
          y + 34,
          8,
          C.greenDark,
          "left",
          700
        );
        this.button(maxed ? "已满" : `￥${cost}`, 848, y + rowHeight - 32, 70, 23, "pet-facility-buy", { itemId: item.id }, {
          disabled: maxed,
          fill: C.yellowSoft,
          size: 9
        });
      });
    }
  }

  drawPetGarden() {
    Core.syncPetGarden(this.state, this.frameNow);
    this.text("暖阳宠物园", 18, 148, 17, C.ink, "left", 900);
    this.text(`农场供给 · 宠物回流金币和堆肥 · 仓库 ${Core.availableProduce(this.state)} 份`, 126, 148, 10, C.greenDark, "left", 700);
    this.drawPetGardenScene();
    this.drawPetShop();
  }

  drawMobilePetScene() {
    const garden = this.state.petGarden;
    const selectedType = Core.petType(garden.selectedPet);
    const selected = garden.pets[garden.selectedPet];
    this.rounded(18, 153, 604, 51, 6, C.paper, C.ink, 2);
    if (selected?.owned) {
      this.drawPetPortrait(garden.selectedPet, 47, 179, 44);
      this.text(`${selectedType.name} · ${Core.petMood(selected)}`, 76, 169, 11, C.ink, "left", 900);
      this.text(
        `饱 ${Math.round(selected.hunger)}  乐 ${Math.round(selected.happiness)}  净 ${Math.round(selected.cleanliness)}`,
        76,
        190,
        9,
        C.greenDark,
        "left",
        800
      );
    } else {
      this.text("领养后，这里会显示宠物状态", 34, 179, 11, C.inkSoft, "left", 800);
    }
    this.text(`口粮 ${garden.food} · 仓库蔬菜 ${Core.availableProduce(this.state)}`, 397, 169, 9, C.greenDark, "center", 800);
    this.button(`领取 ￥${garden.visitorCoins}`, 500, 163, 108, 32, "pet-claim", {}, {
      disabled: garden.visitorCoins < 1,
      fill: C.yellowSoft,
      size: 9
    });

    this.rounded(18, 212, 604, 337, 7, C.paper2, C.ink, 2);
    if (this.petGardenBackground.complete && this.petGardenBackground.naturalWidth) {
      const sw = this.petGardenBackground.naturalWidth;
      const sh = Math.min(this.petGardenBackground.naturalHeight, Math.round(sw / (600 / 333)));
      const sy = Math.max(0, Math.round((this.petGardenBackground.naturalHeight - sh) / 2));
      this.ctx.save();
      this.ctx.beginPath();
      this.ctx.roundRect(20, 214, 600, 333, 5);
      this.ctx.clip();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.drawImage(this.petGardenBackground, 0, sy, sw, sh, 20, 214, 600, 333);
      this.ctx.restore();
    } else {
      this.rect(20, 214, 600, 333, "#8fc36d");
    }

    const facilities = garden.facilities;
    this.drawPetFacilityIcon("food", 180, 500, 0.62);
    if (facilities.flowerArch) this.drawPetFacilityIcon("flower", 310, 266, 0.7);
    if (facilities.kennel) this.drawPetFacilityIcon("kennel", 74, 475, 0.84);
    if (facilities.pond) this.drawPetFacilityIcon("pond", 535, 468, 0.88);
    if (facilities.autoFeeder) {
      this.drawPetFacilityIcon("feeder", 540, 273, 0.7);
      const drop = (this.frameNow / 900) % 1;
      this.circle(540, 280 + drop * 15, 2, C.soil, C.ink, 1);
    }
    if (facilities.toyBox) this.drawPetFacilityIcon("toy", 315, 509, 0.62);
    if (facilities.grooming) this.drawPetFacilityIcon("groom", 555, 345, 0.66);
    if (facilities.nightLamp) this.drawPetFacilityIcon("lamp", 585, 410, 0.62);
    if (facilities.picnic) this.drawPetFacilityIcon("picnic", 108, 345, 0.7);
    if (facilities.birdBath) this.drawPetFacilityIcon("birdbath", 57, 276, 0.66);
    if (facilities.pebblePath) {
      const stones = Math.min(13, 4 + facilities.pebblePath * 3);
      for (let index = 0; index < stones; index += 1) {
        const ratio = index / Math.max(1, stones - 1);
        this.ctx.beginPath();
        this.ctx.ellipse(220 + ratio * 250, 520 + Math.sin(index * 1.7) * 7, 8, 5, index % 2 ? 0.2 : -0.2, 0, Math.PI * 2);
        this.ctx.fillStyle = [C.coral, C.sky, C.yellow, C.greenSoft][index % 4];
        this.ctx.fill();
        this.ctx.strokeStyle = C.ink;
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
      }
    }
    if (facilities.musicBox) this.drawPetFacilityIcon("music", 450, 510, 0.62);

    const actors = Core.PET_TYPES
      .filter((type) => garden.pets[type.id].owned)
      .map((type) => ({ type, position: this.petActorPosition(type.id) }))
      .sort((a, b) => a.position.y - b.position.y);
    actors.forEach(({ type, position }) => {
      this.drawPixelPetActor(type.id, position.x, position.y, { dog: 57, cat: 53, rabbit: 55, chick: 43 }[type.id], {
        selected: garden.selectedPet === type.id,
        walking: position.walking,
        action: position.action,
        facing: position.facing,
        step: position.step
      });
    });
    if (!actors.length) {
      this.rounded(190, 330, 260, 68, 6, C.paper, C.ink, 2);
      this.text("从下方商店领养第一只宠物", 320, 355, 12, C.ink, "center", 900);
      this.text("动物会在草地上自由活动", 320, 380, 9, C.greenDark, "center", 700);
    }

    const petOwned = Boolean(selected?.owned);
    const activeAction = [...this.actionEffects].reverse().find((effect) => (
      effect.type === "pet-action" && effect.petId === garden.selectedPet && effect.until >= this.frameNow
    ));
    [
      ["feed", "喂食", true],
      ["pet", "抚摸", true],
      ["play", "玩耍", true],
      ["bathe", facilities.pond ? "洗澡" : "需水池", Boolean(facilities.pond)],
      ["groom", facilities.grooming ? "梳毛" : "需护理", Boolean(facilities.grooming)]
    ].forEach(([action, label, available], index) => {
      this.button(label, 18 + index * 121, 557, 111, 43, "pet-action", { action }, {
        disabled: !petOwned || !available || Boolean(activeAction),
        fill: available ? C.cream : C.paper2,
        size: 10
      });
    });
  }

  mobilePetShopItems() {
    if (this.petShopTab === "pets") return Core.PET_TYPES;
    return this.petShopTab === "decor"
      ? Core.PET_FACILITIES.filter((item) => item.kind === "decoration")
      : Core.PET_FACILITIES.filter((item) => item.kind !== "decoration");
  }

  drawMobilePetShopItem(item, index, y) {
    const garden = this.state.petGarden;
    this.rounded(18, y, 604, 55, 5, index % 2 ? C.cream : C.paper, C.ink, 1);
    if (this.petShopTab === "pets") {
      const entry = garden.pets[item.id];
      const locked = this.state.level < item.level;
      const active = garden.selectedPet === item.id;
      this.drawPetPortrait(item.id, 49, y + 28, 46, { alpha: locked ? 0.4 : 1 });
      this.text(item.name, 80, y + 18, 11, locked ? C.lock : C.ink, "left", 900);
      this.text(
        entry.owned ? `饱 ${Math.round(entry.hunger)} · 乐 ${Math.round(entry.happiness)} · 净 ${Math.round(entry.cleanliness)}` : locked ? `农场 Lv.${item.level} 解锁` : item.description,
        80,
        y + 40,
        9,
        locked ? C.lock : C.greenDark,
        "left",
        700
      );
      this.button(
        entry.owned ? (active ? "当前" : "查看") : `￥${item.cost}`,
        520,
        y + 10,
        88,
        36,
        entry.owned ? "pet-select" : "pet-buy",
        { petId: item.id },
        { disabled: locked || (entry.owned && active), fill: entry.owned ? C.greenSoft : C.yellowSoft, size: 9 }
      );
      return;
    }
    const level = item.kind === "consumable" ? garden.food : garden.facilities[item.id];
    const maxed = item.kind !== "consumable" && level >= item.max;
    const cost = Core.petFacilityCost(this.state, item.id);
    this.drawPetFacilityIcon(item.icon, 49, y + 28, 0.62);
    this.text(item.name, 80, y + 18, 11, C.ink, "left", 900);
    this.text(
      item.kind === "consumable" ? `用农场蔬菜加工 · 现有口粮 ${garden.food}` : `${item.description} · ${level}/${item.max}`,
      80,
      y + 40,
      9,
      C.greenDark,
      "left",
      700
    );
    this.button(maxed ? "已满" : `￥${cost}`, 520, y + 10, 88, 36, "pet-facility-buy", { itemId: item.id }, {
      disabled: maxed,
      fill: C.yellowSoft,
      size: 9
    });
  }

  drawMobilePetGarden() {
    Core.syncPetGarden(this.state, this.frameNow);
    this.drawMobileTitle("暖阳宠物园", "农场供给，宠物回流收益");
    this.drawMobilePetScene();
    [
      ["pets", "领养"],
      ["facilities", "设施"],
      ["decor", "装饰"]
    ].forEach(([tab, label], index) => {
      this.button(label, 18 + index * 204, 611, 192, 38, "pet-tab", { tab }, {
        fill: this.petShopTab === tab ? C.coral : C.paper,
        color: this.petShopTab === tab ? C.white : C.ink,
        size: 10
      });
    });
    const allItems = this.mobilePetShopItems();
    const pageCount = Math.max(1, Math.ceil(allItems.length / 3));
    this.mobilePetPage = Math.min(this.mobilePetPage, pageCount - 1);
    allItems.slice(this.mobilePetPage * 3, this.mobilePetPage * 3 + 3).forEach((item, index) => {
      this.drawMobilePetShopItem(item, index, 658 + index * 60);
    });
    if (pageCount > 1) {
      this.button("‹", 236, 843, 60, 35, "mobile-page", { target: "pets", delta: -1 }, {
        disabled: this.mobilePetPage === 0,
        size: 18
      });
      this.text(`${this.mobilePetPage + 1} / ${pageCount}`, 320, 860, 11, C.ink, "center", 900);
      this.button("›", 344, 843, 60, 35, "mobile-page", { target: "pets", delta: 1 }, {
        disabled: this.mobilePetPage >= pageCount - 1,
        size: 18
      });
    }
  }

  startLinkRound(carry = {}) {
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
      score: carry.score ?? 0,
      combo: 0,
      bestCombo: carry.bestCombo ?? 0,
      clearedBoards: carry.clearedBoards ?? 0,
      matchedPairs: carry.matchedPairs ?? 0,
      rewardPairs: carry.rewardPairs ?? 0,
      rewards: carry.rewards ?? 0,
      flowMode: LINK_FLOW_MODES[(carry.clearedBoards ?? 0) % LINK_FLOW_MODES.length].id,
      lastPath: null,
      lastMatch: null,
      invalidMatch: null,
      shiftAnimation: null,
      hint: null,
      selectedAt: 0,
      lockedUntil: 0,
      pendingFinish: false,
      pendingShuffle: false
    };
    if (!this.findLinkMove()) this.shuffleLink(false);
  }

  linkCellCenter(row, col) {
    if (MOBILE_LAYOUT) return { x: 54 + col * 75, y: 280 + row * 82 };
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

  applyLinkFlow(startedAt) {
    if (!this.link) return [];
    const { rows, cols, board, flowMode } = this.link;
    const next = Array.from({ length: rows }, () => Array(cols).fill(null));
    const moves = [];
    const place = (entry, row, col) => {
      next[row][col] = entry.value;
      if (entry.row !== row || entry.col !== col) {
        moves.push({ ...entry, toRow: row, toCol: col });
      }
    };

    if (flowMode === "down" || flowMode === "up") {
      for (let col = 0; col < cols; col += 1) {
        const entries = [];
        for (let row = 0; row < rows; row += 1) {
          if (board[row][col] != null) entries.push({ row, col, value: board[row][col] });
        }
        const startRow = flowMode === "down" ? rows - entries.length : 0;
        entries.forEach((entry, index) => place(entry, startRow + index, col));
      }
    } else {
      for (let row = 0; row < rows; row += 1) {
        const entries = [];
        for (let col = 0; col < cols; col += 1) {
          if (board[row][col] != null) entries.push({ row, col, value: board[row][col] });
        }
        const startCol = flowMode === "center" ? Math.floor((cols - entries.length) / 2) : 0;
        entries.forEach((entry, index) => place(entry, row, startCol + index));
      }
    }

    this.link.board = next;
    if (moves.length) {
      this.link.shiftAnimation = {
        moves,
        startedAt: startedAt + 170,
        until: startedAt + 500
      };
    }
    return moves;
  }

  clickLinkCell(row, col) {
    if (!this.link || this.now() < this.link.lockedUntil || this.link.board[row][col] == null) return;
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
    this.link.bestCombo = Math.max(this.link.bestCombo, this.link.combo);
    this.link.matchedPairs += 1;
    this.link.rewardPairs += 1;
    this.link.score += 100 + this.link.combo * 18;
    const comboBonus = this.link.combo > 0 && this.link.combo % 4 === 0;
    if (comboBonus) this.link.rewardPairs += 1;
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
    } else {
      const moves = this.applyLinkFlow(startedAt);
      if (moves.length) this.link.lockedUntil = Math.max(this.link.lockedUntil, startedAt + 500);
      if (!this.findLinkMove()) this.link.pendingShuffle = true;
    }
    if (this.link.rewardPairs >= 8) {
      const result = Core.claimMiniMilestone(this.state, "link");
      this.link.rewardPairs -= 8;
      this.link.rewards += result.reward.amount;
      this.showToast(
        `配对里程碑：种子券 +${result.reward.amount}${this.miniGiftLabel(result.bonus)}`,
        "good",
        result.bonus ? 2600 : 1800
      );
    } else if (comboBonus) {
      this.showToast("四连击：种子券进度 +1", "good", 1200);
    }
    this.advanceFestival("link", 1);
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

  completeLinkBoard() {
    if (!this.link) return;
    const carry = {
      score: this.link.score + 260,
      rewards: this.link.rewards,
      clearedBoards: this.link.clearedBoards + 1,
      matchedPairs: this.link.matchedPairs,
      rewardPairs: this.link.rewardPairs,
      bestCombo: this.link.bestCombo
    };
    this.startLinkRound(carry);
    const mode = LINK_FLOW_MODES.find((entry) => entry.id === this.link.flowMode);
    this.showToast(`盘面清空：进入${mode.name}，规则已变化`, "good", 2200);
  }

  drawLinkSymbol(symbol, x, y) {
    const kind = symbol % LINK_SYMBOLS.length;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = C.ink;
    ctx.lineWidth = 2;

    if (kind === 0) {
      ctx.fillStyle = "#ef7655";
      ctx.beginPath();
      ctx.moveTo(-9, -6);
      ctx.lineTo(9, -6);
      ctx.lineTo(1, 12);
      ctx.lineTo(-4, 12);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      this.line(-4, -7, -8, -14, C.greenDark, 3);
      this.line(0, -7, 0, -15, C.greenDark, 3);
      this.line(4, -7, 9, -13, C.greenDark, 3);
    } else if (kind === 1) {
      this.circle(-6, 1, 9, "#75bf6d", C.ink, 2);
      this.circle(6, 1, 9, "#75bf6d", C.ink, 2);
      this.circle(0, -4, 10, "#a9d98c", C.ink, 2);
      this.line(0, -9, 0, 10, "#4f8d55", 2);
      this.line(-7, -2, 0, 4, "#4f8d55", 2);
      this.line(7, -2, 0, 4, "#4f8d55", 2);
    } else if (kind === 2) {
      ctx.fillStyle = "#c88c52";
      ctx.beginPath();
      ctx.ellipse(0, 1, 13, 10, -0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this.circle(-5, -2, 1.5, "#805638");
      this.circle(4, 4, 1.5, "#805638");
      this.circle(6, -4, 1.2, "#805638");
    } else if (kind === 3) {
      this.circle(0, 2, 12, "#eb5d55", C.ink, 2);
      ctx.fillStyle = C.greenDark;
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? 3 : 8;
        ctx.lineTo(Math.cos(angle) * radius, -8 + Math.sin(angle) * radius * 0.55);
      }
      ctx.closePath();
      ctx.fill();
    } else if (kind === 4) {
      this.rounded(-8, -13, 16, 25, 7, "#f1cb4f", C.ink, 2);
      this.line(-3, -10, -3, 8, "#c7982f", 1);
      this.line(3, -10, 3, 8, "#c7982f", 1);
      this.line(-7, -4, 7, -4, "#c7982f", 1);
      this.line(-7, 3, 7, 3, "#c7982f", 1);
      ctx.fillStyle = "#5aa264";
      ctx.beginPath();
      ctx.moveTo(-8, 8);
      ctx.lineTo(-14, 0);
      ctx.lineTo(-9, 13);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.moveTo(8, 8);
      ctx.lineTo(14, 0);
      ctx.lineTo(9, 13);
      ctx.closePath();
      ctx.fill();
    } else if (kind === 5) {
      ctx.fillStyle = "#dc4362";
      ctx.beginPath();
      ctx.moveTo(0, 13);
      ctx.bezierCurveTo(-4, 8, -13, 0, -10, -7);
      ctx.bezierCurveTo(-7, -13, -2, -10, 0, -6);
      ctx.bezierCurveTo(2, -10, 7, -13, 10, -7);
      ctx.bezierCurveTo(13, 0, 4, 8, 0, 13);
      ctx.fill();
      ctx.stroke();
      this.circle(-5, 0, 1.2, C.yellow);
      this.circle(4, 2, 1.2, C.yellow);
      this.circle(0, 7, 1.2, C.yellow);
      this.line(-6, -9, 0, -5, C.greenDark, 3);
      this.line(6, -9, 0, -5, C.greenDark, 3);
    } else if (kind === 6) {
      ctx.save();
      ctx.rotate(0.42);
      ctx.fillStyle = "#8758a8";
      ctx.beginPath();
      ctx.ellipse(1, 2, 10, 14, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
      ctx.fillStyle = "#5a9b5c";
      ctx.beginPath();
      ctx.moveTo(-7, -9);
      ctx.lineTo(2, -13);
      ctx.lineTo(7, -7);
      ctx.lineTo(0, -5);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (kind === 7) {
      this.circle(-6, 2, 10, "#e98a3e", C.ink, 2);
      this.circle(6, 2, 10, "#e98a3e", C.ink, 2);
      this.circle(0, 2, 11, "#f2a14d", C.ink, 2);
      this.rect(-2, -13, 4, 7, C.greenDark, C.ink, 1);
      this.line(0, -6, 0, 11, "#bd6631", 1);
    } else if (kind === 8) {
      ctx.fillStyle = "#d9787e";
      ctx.beginPath();
      ctx.arc(0, -2, 13, Math.PI, 0);
      ctx.lineTo(13, 2);
      ctx.lineTo(-13, 2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      this.rounded(-5, 1, 10, 13, 3, "#f4ddbf", C.ink, 2);
      this.circle(-6, -6, 2, C.paper);
      this.circle(4, -8, 1.7, C.paper);
    } else {
      ctx.save();
      ctx.rotate(-0.42);
      this.rounded(-15, -7, 30, 14, 7, "#58a86c", C.ink, 2);
      this.circle(-7, 0, 3.5, "#b9dda0", C.greenDark, 1);
      this.circle(0, 0, 3.5, "#b9dda0", C.greenDark, 1);
      this.circle(7, 0, 3.5, "#b9dda0", C.greenDark, 1);
      ctx.restore();
    }
    ctx.restore();
  }

  drawLinkTile(symbol, x, y, w, h, selected, hinted, options = {}) {
    const style = LINK_SYMBOLS[symbol % LINK_SYMBOLS.length];
    const scale = options.scale ?? 1;
    const alpha = options.alpha ?? 1;
    const offsetX = options.offsetX ?? 0;
    const offsetY = options.offsetY ?? 0;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(x + w / 2 + offsetX, y + h / 2 + offsetY);
    ctx.scale(scale, scale);
    this.rounded(-w / 2 + 2, -h / 2 + 3, w, h, 6, "rgba(52,70,74,0.14)");
    if (options.glow) {
      ctx.shadowColor = options.glow;
      ctx.shadowBlur = 12;
    }
    this.rounded(-w / 2, -h / 2, w, h, 6, selected ? C.yellow : hinted ? C.greenSoft : style.background, C.ink, selected ? 3 : 2);
    this.drawLinkSymbol(symbol, 0, -5);
    this.rounded(-20, 13, 40, 12, 3, "rgba(255,255,255,0.72)");
    this.text(style.name, 0, 19, 9, style.accent, "center", 900);
    ctx.restore();
  }

  drawLink() {
    if (!this.link) this.startLinkRound();
    const flow = LINK_FLOW_MODES.find((entry) => entry.id === this.link.flowMode);
    this.text("田园连连看", 22, 151, 18, C.ink, "left", 900);
    this.text(`${flow.name} · ${flow.description}`, 142, 151, 10, C.greenDark, "left", 700);
    this.rounded(20, 169, 920, 43, 6, C.paper, C.ink, 2);
    this.text(`得分 ${this.link.score}`, 42, 191, 13, C.ink, "left", 900);
    this.text(`连击 ×${this.link.combo}`, 170, 191, 12, C.coralDark, "left", 800);
    this.text(`地形 ${flow.name}`, 286, 191, 11, C.ink, "left", 800);
    this.text(`种子券 ${this.link.rewardPairs}/8 对`, 420, 191, 11, C.greenDark, "left", 800);
    this.button("提示 ☀1", 708, 175, 98, 30, "link-hint", {}, { fill: C.greenSoft, size: 11 });
    this.button("重排 ☀1", 818, 175, 104, 30, "link-shuffle", {}, { fill: C.yellowSoft, size: 11 });

    const shift = this.link.shiftAnimation?.until > this.frameNow ? this.link.shiftAnimation : null;
    const movingTargets = new Set(
      (shift?.moves || []).map((entry) => `${entry.toRow},${entry.toCol}`)
    );
    for (let row = 0; row < this.link.rows; row += 1) {
      for (let col = 0; col < this.link.cols; col += 1) {
        const value = this.link.board[row][col];
        if (value == null) continue;
        if (movingTargets.has(`${row},${col}`)) continue;
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
    if (shift) {
      const progress = easeInOut((this.frameNow - shift.startedAt) / (shift.until - shift.startedAt));
      shift.moves.forEach((entry) => {
        const from = this.linkCellCenter(entry.row, entry.col);
        const to = this.linkCellCenter(entry.toRow, entry.toCol);
        const centerX = from.x + (to.x - from.x) * progress;
        const centerY = from.y + (to.y - from.y) * progress;
        this.drawLinkTile(entry.value, centerX - 33, centerY - 28, 66, 56, false, false, {
          scale: 1 + Math.sin(progress * Math.PI) * 0.04,
          glow: "rgba(116,191,112,0.45)"
        });
      });
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
    const festivalProgress = this.state.festival.link
      ? "已完成"
      : `${this.state.festivalProgress.link}/${this.state.festivalGoals.link} 对`;
    this.text(
      `每配对 8 组领种子券 · 礼袋 ${this.state.miniGiftProgress}/3 · 庆典 ${festivalProgress}`,
      WIDTH / 2,
      595,
      10,
      C.inkSoft,
      "center",
      700
    );
  }

  drawMobileLink() {
    if (!this.link) this.startLinkRound();
    const flow = LINK_FLOW_MODES.find((entry) => entry.id === this.link.flowMode);
    this.drawMobileTitle("田园连连看", `${flow.name} · ${flow.description}`);
    this.rounded(18, 151, 604, 45, 6, C.paper, C.ink, 2);
    this.text(`得分 ${this.link.score}`, 34, 174, 11, C.ink, "left", 900);
    this.text(`连击 ×${this.link.combo}`, 163, 174, 10, C.coralDark, "left", 800);
    this.text(`种子券 ${this.link.rewardPairs}/8 对`, 292, 174, 10, C.greenDark, "left", 800);
    this.text(`礼袋 ${this.state.miniGiftProgress}/3`, 486, 174, 10, C.ink, "left", 800);
    this.button("提示 ☀1", 18, 204, 294, 40, "link-hint", {}, { fill: C.greenSoft, size: 10 });
    this.button("重排 ☀1", 328, 204, 294, 40, "link-shuffle", {}, { fill: C.yellowSoft, size: 10 });

    const shift = this.link.shiftAnimation?.until > this.frameNow ? this.link.shiftAnimation : null;
    const movingTargets = new Set((shift?.moves || []).map((entry) => `${entry.toRow},${entry.toCol}`));
    for (let row = 0; row < this.link.rows; row += 1) {
      for (let col = 0; col < this.link.cols; col += 1) {
        const value = this.link.board[row][col];
        if (value == null || movingTargets.has(`${row},${col}`)) continue;
        const x = 20 + col * 75;
        const y = 244 + row * 82;
        const selected = this.link.selected?.row === row && this.link.selected?.col === col;
        const hinted = this.link.hint?.some((cell) => cell.row === row && cell.col === col);
        const invalid = this.link.invalidMatch?.until > this.frameNow
          && this.link.invalidMatch.cells.some((entry) => entry.row === row && entry.col === col);
        const shakeProgress = invalid ? clamp01((this.frameNow - this.link.invalidMatch.startedAt) / 360) : 0;
        this.addHit("link-cell", x, y, 68, 72, { row, col });
        this.drawLinkTile(value, x, y, 68, 72, selected, hinted, {
          scale: selected ? 1 + Math.sin((this.frameNow - this.link.selectedAt) / 115) * 0.035 : 1,
          offsetX: invalid ? Math.sin(shakeProgress * Math.PI * 7) * 7 * (1 - shakeProgress) : 0,
          glow: selected ? "rgba(243,201,85,0.7)" : null
        });
      }
    }
    if (shift) {
      const progress = easeInOut((this.frameNow - shift.startedAt) / (shift.until - shift.startedAt));
      shift.moves.forEach((entry) => {
        const from = this.linkCellCenter(entry.row, entry.col);
        const to = this.linkCellCenter(entry.toRow, entry.toCol);
        this.drawLinkTile(
          entry.value,
          from.x + (to.x - from.x) * progress - 34,
          from.y + (to.y - from.y) * progress - 36,
          68,
          72,
          false,
          false,
          { scale: 1 + Math.sin(progress * Math.PI) * 0.04, glow: "rgba(116,191,112,0.45)" }
        );
      });
    }
    if (this.link.lastPath && this.link.lastPath.until > this.frameNow) {
      const progress = clamp01((this.frameNow - this.link.lastPath.startedAt) / (this.link.lastPath.until - this.link.lastPath.startedAt));
      const points = this.link.lastPath.path.map((point) => {
        const row = point.row - 1;
        const col = point.col - 1;
        if (row >= 0 && row < this.link.rows && col >= 0 && col < this.link.cols) return this.linkCellCenter(row, col);
        return {
          x: col < 0 ? 12 : col >= this.link.cols ? 628 : 54 + col * 75,
          y: row < 0 ? 236 : row >= this.link.rows ? 657 : 280 + row * 82
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
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
    if (this.link.lastMatch && this.link.lastMatch.until > this.frameNow) {
      const progress = clamp01((this.frameNow - this.link.lastMatch.startedAt) / (this.link.lastMatch.until - this.link.lastMatch.startedAt));
      this.link.lastMatch.cells.forEach((entry) => {
        const center = this.linkCellCenter(entry.row, entry.col);
        this.drawLinkTile(entry.value, center.x - 34, center.y - 36, 68, 72, false, false, {
          scale: 1 + Math.sin(progress * Math.PI) * 0.2,
          alpha: 1 - easeInOut(progress),
          offsetY: -progress * 10,
          glow: C.yellow
        });
      });
    }

    this.rounded(18, 669, 604, 91, 7, C.paper, C.ink, 2);
    this.text("循环奖励", 34, 690, 12, C.ink, "left", 900);
    this.text(`再配对 ${8 - this.link.rewardPairs} 组获得种子券`, 34, 718, 10, C.greenDark, "left", 800);
    this.text(
      `庆典：${this.state.festival.link ? "本轮已完成" : `${this.state.festivalProgress.link}/${this.state.festivalGoals.link} 对`}`,
      34,
      744,
      10,
      C.coralDark,
      "left",
      800
    );
    this.rounded(18, 770, 604, 103, 7, C.cream, C.ink, 2);
    this.text("地形规则", 34, 792, 12, C.ink, "left", 900);
    LINK_FLOW_MODES.forEach((entry, index) => {
      const active = entry.id === this.link.flowMode;
      this.rounded(34 + index * 144, 811, 134, 43, 5, active ? C.greenSoft : C.paper, C.ink, active ? 2 : 1);
      this.text(entry.name, 101 + index * 144, 825, 10, active ? C.greenDark : C.ink, "center", 900);
      this.text(entry.description.replace("配对后", ""), 101 + index * 144, 845, 8, C.inkSoft, "center", 700);
    });
  }


  matchPaletteForMilestone(milestone = 0) {
    return [...MATCH_PALETTES[Math.max(0, milestone) % MATCH_PALETTES.length]];
  }

  randomMatchTile(palette = this.match3?.palette || MATCH_PALETTES[0]) {
    return palette[Math.floor(Math.random() * palette.length)];
  }

  createMatchBoard(palette = this.match3?.palette || MATCH_PALETTES[0]) {
    const rows = 7;
    const cols = 7;
    const board = Array.from({ length: rows }, () => Array(cols).fill(0));
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        let value;
        do {
          value = this.randomMatchTile(palette);
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

  startMatch3Round() {
    const palette = this.matchPaletteForMilestone(0);
    let board;
    do board = this.createMatchBoard(palette);
    while (!this.findValidMatchSwap(board));
    this.match3 = {
      board,
      palette,
      selected: null,
      score: 0,
      targetColor: palette[Math.floor(Math.random() * palette.length)],
      target: 10,
      collected: 0,
      combo: 0,
      bestCombo: 0,
      milestones: 0,
      rewards: 0,
      selectedAt: 0,
      animation: null,
      lockedUntil: 0,
      pendingMilestone: false,
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
        const color = this.randomMatchTile();
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
      this.advanceFestival("match3", removed.length);
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
    if (chain > 1) this.match3.collected += chain - 1;
    this.match3.combo = chain;
    this.match3.bestCombo = Math.max(this.match3.bestCombo, chain);
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
    this.resolveMatchBoard({ beforeSwap, first, second: { row, col }, swappedBoard });
    if (this.match3.collected >= this.match3.target) this.match3.pendingMilestone = true;
    if (!this.findValidMatchSwap(this.match3.board)) {
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

  completeMatchMilestone() {
    const previousTarget = this.match3.targetColor;
    const result = Core.claimMiniMilestone(this.state, "match3");
    this.match3.rewards += result.reward.amount;
    this.match3.milestones += 1;
    this.match3.collected = Math.max(0, this.match3.collected - this.match3.target);
    this.match3.target = [10, 11, 12, 10][this.match3.milestones % 4];
    this.match3.palette = this.matchPaletteForMilestone(this.match3.milestones);
    do this.match3.targetColor = this.randomMatchTile();
    while (this.match3.targetColor === previousTarget);
    const before = this.cloneMatchBoard(this.match3.board);
    do this.match3.board = this.createMatchBoard();
    while (!this.findValidMatchSwap(this.match3.board));
    this.match3.pendingShuffle = false;
    this.startMatchShuffleAnimation(before);
    this.showToast(
      `装箱完成：订单印章 +${result.reward.amount}${this.miniGiftLabel(result.bonus)}，新品类已上架`,
      "good",
      result.bonus ? 3000 : 2400
    );
  }

  drawGem(value, x, y, size, selected = false, options = {}) {
    if (value == null) return;
    const tile = MATCH_TILES[value % MATCH_TILES.length];
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = options.alpha ?? 1;
    ctx.translate(x, y);
    const scale = options.scale ?? 1;
    ctx.scale(scale, scale);
    ctx.rotate(options.rotation ?? 0);
    if (options.glow) {
      ctx.shadowColor = options.glow;
      ctx.shadowBlur = 8;
    } else {
      ctx.shadowColor = "rgba(52,70,74,0.2)";
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 3;
      ctx.shadowBlur = 0;
    }
    if (selected) {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.58, 0, Math.PI * 2);
      ctx.strokeStyle = C.yellow;
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.fillStyle = tile.color;
    ctx.strokeStyle = tile.ink;
    ctx.lineWidth = 2;
    if (tile.shape === "round") {
      ctx.beginPath();
      ctx.arc(0, 1, size * 0.43, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      this.line(0, -size * 0.42, 7, -size * 0.55, C.greenDark, 4);
    } else if (tile.shape === "square") {
      this.rounded(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8, 5, tile.color, tile.ink, 2);
    } else if (tile.shape === "hex") {
      ctx.beginPath();
      for (let point = 0; point < 6; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 3;
        const px = Math.cos(angle) * size * 0.45;
        const py = Math.sin(angle) * size * 0.45;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tile.shape === "diamond") {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.44, 0);
      ctx.lineTo(0, size * 0.5);
      ctx.lineTo(-size * 0.44, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tile.shape === "capsule") {
      this.rounded(-size * 0.29, -size * 0.49, size * 0.58, size * 0.98, size * 0.28, tile.color, tile.ink, 2);
      this.line(-size * 0.14, -size * 0.22, size * 0.14, -size * 0.22, tile.ink, 2);
      this.line(-size * 0.14, 0, size * 0.14, 0, tile.ink, 2);
      this.line(-size * 0.14, size * 0.22, size * 0.14, size * 0.22, tile.ink, 2);
    } else if (tile.shape === "flower") {
      for (let petal = 0; petal < 6; petal += 1) {
        const angle = petal * Math.PI / 3;
        ctx.beginPath();
        ctx.arc(Math.cos(angle) * size * 0.22, Math.sin(angle) * size * 0.22, size * 0.23, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.22, 0, Math.PI * 2);
      ctx.fillStyle = C.cream;
      ctx.fill();
      ctx.stroke();
    } else if (tile.shape === "star") {
      ctx.beginPath();
      for (let point = 0; point < 10; point += 1) {
        const angle = -Math.PI / 2 + point * Math.PI / 5;
        const radius = point % 2 ? size * 0.23 : size * 0.5;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (point === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.52);
      ctx.bezierCurveTo(size * 0.42, -size * 0.12, size * 0.44, size * 0.32, 0, size * 0.5);
      ctx.bezierCurveTo(-size * 0.44, size * 0.32, -size * 0.42, -size * 0.12, 0, -size * 0.52);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      this.circle(size * 0.12, size * 0.14, size * 0.08, C.cream);
    }
    ctx.shadowColor = "transparent";
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = 0;
    this.text(
      tile.label,
      0,
      1,
      Math.max(11, size * 0.36),
      tile.shape === "capsule" || tile.shape === "flower" || tile.shape === "star" ? tile.ink : C.white,
      "center",
      900
    );
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

  drawStaticMatchBoard(board, startX, startY, cell, excluded = [], selected = null, gemSize = 38) {
    for (let row = 0; row < 7; row += 1) {
      for (let col = 0; col < 7; col += 1) {
        if (excluded.some((entry) => entry.row === row && entry.col === col)) continue;
        const isSelected = selected?.row === row && selected?.col === col;
        const pulse = isSelected ? 1 + Math.sin((this.frameNow - this.match3.selectedAt) / 110) * 0.055 : 1;
        this.drawGem(board[row][col], startX + col * cell + cell / 2, startY + row * cell + cell / 2, gemSize, isSelected, {
          scale: pulse,
          glow: isSelected ? C.yellow : null
        });
      }
    }
  }

  drawMatchAnimation(startX, startY, cell, gemSize = 38) {
    const segment = this.activeMatchSegment();
    if (!segment) {
      this.drawStaticMatchBoard(this.match3.board, startX, startY, cell, [], this.match3.selected, gemSize);
      return;
    }
    const progress = clamp01((this.frameNow - segment.startedAt) / segment.duration);
    if (segment.type === "swap" || segment.type === "invalid") {
      const { first, second, board } = segment;
      this.drawStaticMatchBoard(board, startX, startY, cell, [first, second], null, gemSize);
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
      this.drawGem(board[first.row][first.col], firstX, firstY, gemSize, false, { scale: bump, glow: C.yellow });
      this.drawGem(board[second.row][second.col], secondX, secondY, gemSize, false, { scale: bump, glow: C.yellow });
      return;
    }
    if (segment.type === "pop") {
      const removedKeys = new Set(segment.removed.map((entry) => `${entry.row},${entry.col}`));
      for (let row = 0; row < 7; row += 1) {
        for (let col = 0; col < 7; col += 1) {
          const removed = removedKeys.has(`${row},${col}`);
          const burst = Math.sin(progress * Math.PI);
          this.drawGem(segment.before[row][col], startX + col * cell + cell / 2, startY + row * cell + cell / 2, gemSize, false, {
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
        startX + cell * 3.5,
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
          this.drawGem(entry.color, startX + entry.col * cell + cell / 2, startY + trailRow * cell + cell / 2, gemSize, false, {
            alpha: 0.16 * (1 - progress),
            scale: 0.92
          });
        }
        this.drawGem(entry.color, startX + entry.col * cell + cell / 2, startY + row * cell + cell / 2, gemSize, false, {
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
            this.drawGem(segment.before[row][col], startX + col * cell + cell / 2 + direction * fade * 18, startY + row * cell + cell / 2, gemSize, false, {
              alpha: 1 - fade,
              scale: 1 - fade * 0.3
            });
          }
        }
      } else {
        const appear = easeOut((progress - 0.5) * 2);
        for (let row = 0; row < 7; row += 1) {
          for (let col = 0; col < 7; col += 1) {
            this.drawGem(segment.after[row][col], startX + col * cell + cell / 2, startY + row * cell + cell / 2, gemSize, false, {
              alpha: appear,
              scale: 0.65 + appear * 0.35
            });
          }
        }
      }
    }
  }

  spawnMergeTile(board = this.merge.board) {
    const empty = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (board[row][col] == null) empty.push({ row, col });
      }
    }
    if (!empty.length) return null;
    const cell = empty[Math.floor(Math.random() * empty.length)];
    board[cell.row][cell.col] = Math.random() < 0.88 ? 1 : 2;
    return { ...cell, value: board[cell.row][cell.col] };
  }

  startMergeGame() {
    this.merge = {
      board: Array.from({ length: 4 }, () => Array(4).fill(null)),
      score: 0,
      maxValue: 1,
      merges: 0,
      rewardMerges: 0,
      rewards: 0,
      animation: null,
      lockedUntil: 0
    };
    this.spawnMergeTile();
    this.spawnMergeTile();
  }

  mergeLineCoordinates(direction, line) {
    if (direction === "left") return Array.from({ length: 4 }, (_, col) => ({ row: line, col }));
    if (direction === "right") return Array.from({ length: 4 }, (_, index) => ({ row: line, col: 3 - index }));
    if (direction === "up") return Array.from({ length: 4 }, (_, row) => ({ row, col: line }));
    return Array.from({ length: 4 }, (_, index) => ({ row: 3 - index, col: line }));
  }

  hasMergeMove(board = this.merge.board) {
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (board[row][col] == null) return true;
        if (row < 3 && board[row][col] === board[row + 1][col]) return true;
        if (col < 3 && board[row][col] === board[row][col + 1]) return true;
      }
    }
    return false;
  }

  rescueMergeBoard() {
    const cells = [];
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        if (this.merge.board[row][col] != null) {
          cells.push({ row, col, value: this.merge.board[row][col] });
        }
      }
    }
    cells.sort((a, b) => a.value - b.value);
    cells.slice(0, 4).forEach((cell) => {
      this.merge.board[cell.row][cell.col] = null;
    });
    this.spawnMergeTile();
    this.spawnMergeTile();
    this.showToast("菜篮已自动腾出低级格子，可以继续合成", "normal", 1800);
  }

  moveMerge(direction) {
    if (!this.merge || this.now() < this.merge.lockedUntil) return;
    const before = this.merge.board.map((row) => [...row]);
    const after = Array.from({ length: 4 }, () => Array(4).fill(null));
    const movements = [];
    const mergeEvents = [];
    let gained = 0;

    for (let line = 0; line < 4; line += 1) {
      const coordinates = this.mergeLineCoordinates(direction, line);
      const entries = coordinates
        .map((cell) => ({ ...cell, value: before[cell.row][cell.col] }))
        .filter((cell) => cell.value != null);
      let writeIndex = 0;
      for (let index = 0; index < entries.length; index += 1) {
        const current = entries[index];
        const target = coordinates[writeIndex];
        if (entries[index + 1]?.value === current.value) {
          const next = entries[index + 1];
          const value = current.value + 1;
          after[target.row][target.col] = value;
          movements.push({ ...current, toRow: target.row, toCol: target.col, merged: true });
          movements.push({ ...next, toRow: target.row, toCol: target.col, merged: true });
          mergeEvents.push({ row: target.row, col: target.col, value });
          gained += 2 ** value;
          index += 1;
        } else {
          after[target.row][target.col] = current.value;
          movements.push({ ...current, toRow: target.row, toCol: target.col, merged: false });
        }
        writeIndex += 1;
      }
    }

    const changed = before.some((row, rowIndex) => row.some((value, colIndex) => value !== after[rowIndex][colIndex]));
    if (!changed) {
      this.showToast("这个方向已经没有可合并的格子", "normal", 900);
      return;
    }

    this.merge.board = after;
    this.merge.score += gained;
    this.merge.merges += mergeEvents.length;
    this.merge.rewardMerges += mergeEvents.length + (mergeEvents.length >= 2 ? 1 : 0);
    this.merge.maxValue = Math.max(
      this.merge.maxValue,
      ...after.flat().filter((value) => value != null)
    );
    const spawned = this.spawnMergeTile();
    const startedAt = this.now();
    this.merge.animation = {
      before,
      after: this.merge.board.map((row) => [...row]),
      movements,
      mergeEvents,
      spawned,
      startedAt,
      until: startedAt + 300
    };
    this.merge.lockedUntil = startedAt + 300;

    while (this.merge.rewardMerges >= 8) {
      const result = Core.claimMiniMilestone(this.state, "match3");
      this.merge.rewardMerges -= 8;
      this.merge.rewards += result.reward.amount;
      this.showToast(
        `合成里程碑：订单印章 +${result.reward.amount}${this.miniGiftLabel(result.bonus)}`,
        "good",
        result.bonus ? 2600 : 1800
      );
    }
    if (mergeEvents.length) this.advanceFestival("match3", mergeEvents.length * 3);
    if (!this.hasMergeMove()) this.rescueMergeBoard();
    this.save(true);
    this.render();
  }

  drawMergeTile(value, x, y, size, options = {}) {
    if (value == null) return;
    const style = MERGE_TILES[Math.min(MERGE_TILES.length - 1, value - 1)];
    this.ctx.save();
    this.ctx.globalAlpha = options.alpha ?? 1;
    this.ctx.translate(x, y);
    const scale = options.scale ?? 1;
    this.ctx.scale(scale, scale);
    if (options.glow) {
      this.ctx.shadowColor = options.glow;
      this.ctx.shadowBlur = 10;
    }
    this.rounded(-size / 2 + 3, -size / 2 + 4, size, size, 7, "rgba(52,70,74,0.16)");
    this.rounded(-size / 2, -size / 2, size, size, 7, style.color, C.ink, 2);
    this.rounded(-size / 2 + 5, -size / 2 + 5, size - 10, 8, 3, "rgba(255,255,255,0.32)");
    this.text(style.label, 0, -13, 18, style.ink, "center", 900);
    this.text(String(2 ** value), 0, 10, 15, C.white, "center", 900);
    this.text(style.name, 0, 27, 9, style.ink, "center", 800);
    this.ctx.restore();
  }

  drawMergeBoard(startX, startY, cell) {
    const animation = this.merge.animation?.until > this.frameNow ? this.merge.animation : null;
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        this.rounded(startX + col * cell + 3, startY + row * cell + 3, cell - 6, cell - 6, 6, "#f8efca", C.paper2, 1);
      }
    }
    if (!animation) {
      for (let row = 0; row < 4; row += 1) {
        for (let col = 0; col < 4; col += 1) {
          this.drawMergeTile(
            this.merge.board[row][col],
            startX + col * cell + cell / 2,
            startY + row * cell + cell / 2,
            cell - 16
          );
        }
      }
      return;
    }

    const progress = clamp01((this.frameNow - animation.startedAt) / (animation.until - animation.startedAt));
    if (progress < 0.62) {
      const travel = easeInOut(progress / 0.62);
      animation.movements.forEach((entry) => {
        const x = startX + (entry.col + (entry.toCol - entry.col) * travel) * cell + cell / 2;
        const y = startY + (entry.row + (entry.toRow - entry.row) * travel) * cell + cell / 2;
        this.drawMergeTile(entry.value, x, y, cell - 16, {
          scale: entry.merged ? 1 - travel * 0.08 : 1
        });
      });
      return;
    }

    const appear = easeOut((progress - 0.62) / 0.38);
    for (let row = 0; row < 4; row += 1) {
      for (let col = 0; col < 4; col += 1) {
        const merged = animation.mergeEvents.some((entry) => entry.row === row && entry.col === col);
        const spawned = animation.spawned?.row === row && animation.spawned?.col === col;
        this.drawMergeTile(
          this.merge.board[row][col],
          startX + col * cell + cell / 2,
          startY + row * cell + cell / 2,
          cell - 16,
          {
            scale: merged ? 0.72 + appear * 0.38 : spawned ? appear : 1,
            glow: merged ? C.yellow : null
          }
        );
      }
    }
  }

  drawMergeGame() {
    if (!this.merge) this.startMergeGame();
    this.text("田园合成", 22, 151, 18, C.ink, "left", 900);
    this.drawPuzzleTabs();
    this.rounded(20, 169, 920, 43, 6, C.paper, C.ink, 2);
    this.text(`得分 ${this.merge.score}`, 42, 191, 13, C.ink, "left", 900);
    this.text(`最高 ${2 ** this.merge.maxValue}`, 178, 191, 12, C.coralDark, "left", 800);
    this.text(`印章 ${this.merge.rewardMerges}/8 次`, 306, 191, 11, C.greenDark, "left", 800);
    this.text(`礼袋 ${this.state.miniGiftProgress}/3`, 470, 191, 11, C.ink, "left", 800);

    const startX = 58;
    const startY = 225;
    const cell = 88;
    this.rounded(startX - 12, startY - 12, cell * 4 + 24, cell * 4 + 24, 7, C.paper2, C.ink, 3);
    this.drawMergeBoard(startX, startY, cell);

    this.rounded(442, 223, 498, 378, 7, C.cream, C.ink, 2);
    this.text("成长图谱", 466, 251, 15, C.ink, "left", 900);
    for (let index = 0; index < 6; index += 1) {
      const x = 474 + index * 72;
      this.drawMergeTile(index + 1, x, 292, 54, { alpha: index + 1 <= this.merge.maxValue + 1 ? 1 : 0.4 });
      if (index < 5) this.text("›", x + 36, 292, 17, C.inkSoft, "center", 900);
    }
    this.line(464, 334, 918, 334, C.paper2, 2);
    this.text("滑动方向", 466, 359, 13, C.ink, "left", 900);
    this.button("↑", 740, 348, 56, 45, "merge-move", { direction: "up" }, { fill: C.greenSoft, size: 20 });
    this.button("←", 676, 399, 56, 45, "merge-move", { direction: "left" }, { fill: C.paper, size: 20 });
    this.button("↓", 740, 399, 56, 45, "merge-move", { direction: "down" }, { fill: C.greenSoft, size: 20 });
    this.button("→", 804, 399, 56, 45, "merge-move", { direction: "right" }, { fill: C.paper, size: 20 });
    this.rounded(464, 470, 454, 104, 6, C.paper, C.ink, 1);
    this.text("循环奖励", 482, 492, 12, C.ink, "left", 900);
    this.text(`再合成 ${8 - this.merge.rewardMerges} 次：订单印章`, 482, 518, 11, C.greenDark, "left", 800);
    this.text(
      `庆典益智：${this.state.festival.match3 ? "本轮已完成" : `${this.state.festivalProgress.match3}/${this.state.festivalGoals.match3} 格`}`,
      482,
      543,
      11,
      C.coralDark,
      "left",
      800
    );
    this.text(`本次已领取印章 ${this.merge.rewards}`, 482, 563, 9, C.inkSoft, "left", 700);
  }

  drawPuzzleTabs() {
    this.button("消消乐", 730, 137, 92, 27, "puzzle-mode", { mode: "match3" }, {
      fill: this.puzzleMode === "match3" ? C.coral : C.paper,
      color: this.puzzleMode === "match3" ? C.white : C.ink,
      size: 10
    });
    this.button("田园合成", 830, 137, 102, 27, "puzzle-mode", { mode: "merge" }, {
      fill: this.puzzleMode === "merge" ? C.coral : C.paper,
      color: this.puzzleMode === "merge" ? C.white : C.ink,
      size: 10
    });
  }

  drawMatch3() {
    if (!this.match3) this.startMatch3Round();
    const targetTile = MATCH_TILES[this.match3.targetColor];
    this.text("订单消消乐", 22, 151, 18, C.ink, "left", 900);
    this.drawPuzzleTabs();
    this.rounded(20, 169, 920, 43, 6, C.paper, C.ink, 2);
    this.text(`得分 ${this.match3.score}`, 42, 191, 13, C.ink, "left", 900);
    this.text(`连锁 ×${this.match3.combo}`, 178, 191, 12, C.coralDark, "left", 800);
    this.text(`装箱 ${this.match3.collected}/${this.match3.target}`, 306, 191, 11, C.ink, "left", 800);
    this.text(`礼袋 ${this.state.miniGiftProgress}/3`, 446, 191, 11, C.greenDark, "left", 800);
    this.button("重排 ☀2", 818, 175, 104, 30, "match-shuffle", {}, { fill: C.yellowSoft, size: 11 });

    const startX = 58;
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
    this.rounded(476, 223, 466, 378, 7, C.cream, C.ink, 2);
    this.text("当前装箱里程碑", 498, 250, 15, C.ink, "left", 900);
    this.rounded(498, 270, 422, 112, 6, C.paper, C.ink, 1);
    this.drawGem(this.match3.targetColor, 548, 327, 58);
    this.text(targetTile.name, 602, 298, 15, C.ink, "left", 900);
    this.text("集满后立即获得订单印章", 602, 320, 10, C.greenDark, "left", 800);
    this.rect(602, 341, 290, 14, C.paper2, C.ink, 1);
    this.rect(602, 341, 290 * Math.min(1, this.match3.collected / this.match3.target), 14, C.green);
    this.text(`${this.match3.collected} / ${this.match3.target}`, 747, 370, 11, C.ink, "center", 900);
    this.text(
      `庆典进度：${this.state.festival.match3 ? "本轮已完成" : `${this.state.festivalProgress.match3}/${this.state.festivalGoals.match3} 格`}`,
      498,
      397,
      10,
      C.greenDark,
      "left",
      800
    );
    this.line(498, 409, 920, 409, C.paper2, 2);
    this.text("八种棋子图鉴 · 每轮上场七种", 498, 430, 12, C.ink, "left", 900);
    MATCH_TILES.forEach((tile, index) => {
      const col = index % 4;
      const row = Math.floor(index / 4);
      const x = 500 + col * 104;
      const y = 445 + row * 65;
      const active = this.match3.palette.includes(index);
      this.rounded(x, y, 96, 52, 5, active ? (row % 2 ? C.paper : C.paper2) : "#e4e1cf", C.ink, 1);
      this.drawGem(index, x + 25, y + 26, 32, false, { alpha: active ? 1 : 0.45 });
      this.text(tile.name, x + 46, y + 26, 9, active ? C.ink : C.lock, "left", 800);
    });
  }

  drawMobilePuzzleTabs() {
    this.button("消消乐", 18, 151, 294, 40, "puzzle-mode", { mode: "match3" }, {
      fill: this.puzzleMode === "match3" ? C.coral : C.paper,
      color: this.puzzleMode === "match3" ? C.white : C.ink,
      size: 11
    });
    this.button("田园合成", 328, 151, 294, 40, "puzzle-mode", { mode: "merge" }, {
      fill: this.puzzleMode === "merge" ? C.coral : C.paper,
      color: this.puzzleMode === "merge" ? C.white : C.ink,
      size: 11
    });
  }

  drawMobileMatch3() {
    if (!this.match3) this.startMatch3Round();
    const targetTile = MATCH_TILES[this.match3.targetColor];
    this.drawMobileTitle("益智屋", "无步数限制，随时继续");
    this.drawMobilePuzzleTabs();
    this.rounded(18, 200, 604, 52, 6, C.paper, C.ink, 2);
    this.drawGem(this.match3.targetColor, 48, 226, 34);
    this.text(`${targetTile.name} ${this.match3.collected}/${this.match3.target}`, 74, 216, 11, C.ink, "left", 900);
    this.text(`得分 ${this.match3.score} · 连锁 ×${this.match3.combo}`, 74, 238, 9, C.greenDark, "left", 800);
    this.text(`印章里程碑 · 礼袋 ${this.state.miniGiftProgress}/3`, 342, 226, 9, C.coralDark, "center", 800);
    this.button("重排 ☀2", 512, 208, 98, 36, "match-shuffle", {}, { fill: C.yellowSoft, size: 9 });

    const startX = 47;
    const startY = 264;
    const cell = 78;
    this.rounded(startX - 11, startY - 11, cell * 7 + 22, cell * 7 + 22, 7, C.paper2, C.ink, 3);
    this.drawMatchBoardCells(startX, startY, cell);
    this.ctx.save();
    this.ctx.beginPath();
    this.ctx.rect(startX, startY, cell * 7, cell * 7);
    this.ctx.clip();
    this.drawMatchAnimation(startX, startY, cell, 54);
    this.ctx.restore();

    this.rounded(18, 824, 604, 54, 6, C.cream, C.ink, 2);
    this.text(
      `庆典益智 ${this.state.festival.match3 ? "本轮已完成" : `${this.state.festivalProgress.match3}/${this.state.festivalGoals.match3} 格`}`,
      34,
      851,
      10,
      C.greenDark,
      "left",
      900
    );
    this.text("集满目标立即获得订单印章", 606, 851, 9, C.inkSoft, "right", 700);
  }

  drawMobileMerge() {
    if (!this.merge) this.startMergeGame();
    this.drawMobileTitle("益智屋", "滑动或点击方向，持续合成");
    this.drawMobilePuzzleTabs();
    this.rounded(18, 200, 604, 52, 6, C.paper, C.ink, 2);
    this.text(`得分 ${this.merge.score}`, 34, 226, 11, C.ink, "left", 900);
    this.text(`最高 ${2 ** this.merge.maxValue}`, 174, 226, 10, C.coralDark, "left", 800);
    this.text(`印章 ${this.merge.rewardMerges}/8 次`, 318, 226, 10, C.greenDark, "left", 800);
    this.text(`礼袋 ${this.state.miniGiftProgress}/3`, 500, 226, 10, C.ink, "left", 800);

    const startX = 68;
    const startY = 266;
    const cell = 126;
    this.rounded(startX - 12, startY - 12, cell * 4 + 24, cell * 4 + 24, 7, C.paper2, C.ink, 3);
    this.drawMergeBoard(startX, startY, cell);

    const controls = [
      ["←", "left", C.paper],
      ["↑", "up", C.greenSoft],
      ["↓", "down", C.greenSoft],
      ["→", "right", C.paper]
    ];
    controls.forEach(([label, direction, fill], index) => {
      this.button(label, 18 + index * 152, 786, 142, 44, "merge-move", { direction }, { fill, size: 20 });
    });
    this.rounded(18, 839, 604, 39, 6, C.cream, C.ink, 2);
    this.text(
      `庆典益智 ${this.state.festival.match3 ? "本轮已完成" : `${this.state.festivalProgress.match3}/${this.state.festivalGoals.match3} 格`}`,
      34,
      859,
      10,
      C.greenDark,
      "left",
      900
    );
    this.text("每合成 8 次获得订单印章", 606, 859, 9, C.inkSoft, "right", 700);
  }

  async togglePin() {
    this.state.alwaysOnTop = !this.state.alwaysOnTop;
    if (window.desktop) this.state.alwaysOnTop = await window.desktop.setAlwaysOnTop(this.state.alwaysOnTop);
    this.showToast(this.state.alwaysOnTop ? "窗口已置顶" : "已取消置顶", this.state.alwaysOnTop ? "good" : "normal");
  }

  handlePointer(x, y, rightButton = false) {
    const hit = [...this.hits].reverse().find((entry) => x >= entry.x && x <= entry.x + entry.w && y >= entry.y && y <= entry.y + entry.h);
    if (hit && !hit.disabled) {
      if (!["plot", "link-cell", "match-cell", "nav"].includes(hit.type)) {
        this.addActionEffect("button-ripple", {
          x: hit.x,
          y: hit.y,
          w: hit.w,
          h: hit.h,
          view: this.state.view
        }, 300);
      }
      if (hit.type === "nav") this.switchView(hit.view);
      else if (hit.type === "pin") this.togglePin();
      else if (hit.type === "plot") this.usePlot(hit.index);
      else if (hit.type === "market-tab") {
        this.marketTab = hit.tab;
        this.mobileMarketPage = 0;
      }
      else if (hit.type === "auto-toggle") {
        const type = hit.itemId;
        const enabled = !this.state.automationEnabled[type];
        this.state.automationEnabled[type] = enabled;
        if (!enabled) this.robotJobs = this.robotJobs.filter((job) => job.type !== type);
        else {
          this.lastRobotScan = 0;
          this.scanAutomation(true);
        }
        this.addActionEffect("ui-success", {
          x: hit.x + hit.w / 2,
          y: hit.y + hit.h / 2,
          color: enabled ? C.green : C.lock,
          view: "farm"
        }, 620);
        this.showToast(`${type === "sprinkler" ? "自动浇水" : "自动收菜"}已${enabled ? "开启" : "暂停"}，格子布置已保留`, enabled ? "good" : "normal");
      }
      else if (hit.type === "unlock-pets") {
        const coinsBefore = this.state.coins;
        const result = Core.unlockPetGarden(this.state, this.now());
        if (result.ok) {
          this.addActionEffect("ui-success", { x: MOBILE_LAYOUT ? x : 875, y: MOBILE_LAYOUT ? y : 211, color: C.coral, view: "market" }, 900);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(result.ok ? "暖阳宠物园已解锁，欢迎领养第一只宠物" : result.reason, result.ok ? "good" : "bad", 2400);
      } else if (hit.type === "pet-tab") {
        this.petShopTab = hit.tab;
        this.mobilePetPage = 0;
      } else if (hit.type === "mobile-page") {
        if (hit.target === "market") this.mobileMarketPage = Math.max(0, this.mobileMarketPage + hit.delta);
        if (hit.target === "pets") this.mobilePetPage = Math.max(0, this.mobilePetPage + hit.delta);
      } else if (hit.type === "pet-select") {
        if (this.state.petGarden.pets[hit.petId]?.owned) {
          this.state.petGarden.selectedPet = hit.petId;
          this.addActionEffect("ui-success", { x, y, color: C.yellow, view: "pets" }, 480);
        }
      } else if (hit.type === "pet-buy") {
        const coinsBefore = this.state.coins;
        const result = Core.buyPet(this.state, hit.petId, this.now());
        if (result.ok) {
          this.addActionEffect("ui-success", { x, y, color: C.coral, view: "pets" }, 900);
          this.addActionEffect("pet-action", { action: "pet", petId: hit.petId, view: "pets" }, 420);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(result.ok ? `${result.pet.name}来到宠物园了` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "pet-facility-buy") {
        const coinsBefore = this.state.coins;
        const result = Core.buyPetFacility(this.state, hit.itemId, this.now());
        if (result.ok) {
          this.addActionEffect("ui-success", { x, y, color: result.item.kind === "decoration" ? C.coral : C.yellow, view: "pets" }, 820);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(
          result.ok
            ? result.item.kind === "consumable"
              ? `${result.item.name}加工完成，消耗农场蔬菜 ${Core.PET_FOOD_PRODUCE_COST} 份`
              : `${result.item.name}购买完成`
            : result.reason,
          result.ok ? "good" : "bad"
        );
      } else if (hit.type === "pet-action") {
        const result = Core.interactPet(this.state, hit.action, this.now());
        if (result.ok) this.addActionEffect("pet-action", { action: hit.action, petId: result.pet.id, view: "pets" }, 1800);
        const actionName = { feed: "喂食", pet: "抚摸", play: "玩耍", bathe: "洗澡", groom: "梳毛" }[hit.action];
        this.showToast(result.ok ? `${result.pet.name}开始${actionName}，心情 ${result.mood}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "pet-claim") {
        const coinsBefore = this.state.coins;
        const result = Core.claimPetIncome(this.state, this.now());
        if (result.ok) {
          this.addActionEffect("ui-success", { x, y, color: C.yellow, view: "pets" }, 780);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(
          result.ok
            ? `领取 ￥${result.amount}${result.compost ? `，回收堆肥 +${result.compost}` : ""}`
            : result.reason,
          result.ok ? "good" : "normal"
        );
      }
      else if (hit.type === "deliver") {
        const orderIndex = this.state.orders.findIndex((order) => order.id === hit.orderId);
        const coinsBefore = this.state.coins;
        const sealsBefore = this.state.orderSeals;
        const result = Core.deliverOrder(this.state, hit.orderId);
        if (result.ok) {
          this.addActionEffect("order-deliver", { orderIndex: Math.max(0, orderIndex), view: "farm" }, 950);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
          this.addResourceEffect("orderSeals", this.state.orderSeals - sealsBefore);
        }
        this.showToast(result.ok ? `订单完成，获得 ￥${result.coins}${result.sealUsed ? "（印章加成）" : ""}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "seed-select") {
        const crop = Core.cropById(hit.cropId);
        if (crop.level <= this.state.level) this.state.selected = { type: "seed", id: crop.id };
        else this.showToast(`农场 ${crop.level} 级解锁`, "bad");
      } else if (hit.type === "seed-buy") {
        const coinsBefore = this.state.coins;
        const result = Core.buySeeds(this.state, hit.cropId, 3);
        if (result.ok) {
          const cropIndex = Core.CROPS.findIndex((crop) => crop.id === hit.cropId);
          this.addActionEffect("ui-success", {
            x: MOBILE_LAYOUT ? x : 884,
            y: MOBILE_LAYOUT ? y : 183 + cropIndex * 47,
            color: C.green,
            view: "farm"
          }, 650);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(result.ok ? `补充 ${Core.cropById(hit.cropId).name}种子 ×3` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "tool") {
        if (hit.tool === "seed") {
          this.state.selected = { type: "seed", id: Core.cropById(this.state.selected.id)?.id || "radish" };
        }
        else this.state.selected = { type: hit.tool };
      } else if (hit.type === "sell") {
        const coinsBefore = this.state.coins;
        const result = Core.sellAll(this.state);
        if (result.ok) {
          this.addActionEffect("warehouse-sell", { value: result.value, view: "farm" }, 1150);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(result.ok ? `全部出售，收入 ￥${result.value}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "buy-shop") {
        const coinsBefore = this.state.coins;
        const result = Core.buyShopItem(this.state, hit.itemId);
        if (result.ok) {
          this.addActionEffect("ui-success", { x, y, color: C.yellow, view: "market" }, 720);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(result.ok ? `${result.item.name}购买成功` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "place-auto") {
        if (Core.unplacedAutomation(this.state, hit.itemId) > 0 || this.state.automationSlots[hit.itemId].length > 0) {
          this.state.selected = { type: "automation", id: hit.itemId };
          this.switchView("farm");
        } else this.showToast("请先购买一台设备", "bad");
      } else if (hit.type === "exchange") {
        const ticketsBefore = this.state.seedTickets;
        const result = Core.exchangeSeedTicket(this.state);
        if (result.ok) {
          this.addActionEffect("ui-success", { x: MOBILE_LAYOUT ? x : 884, y: MOBILE_LAYOUT ? y : 201, color: C.coral, view: "market" }, 720);
          this.addResourceEffect("seedTickets", this.state.seedTickets - ticketsBefore);
        }
        this.showToast(result.ok ? `兑换到 ${result.crop.name}种子 ×${result.amount}` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "unlock-land") {
        const plotIndex = this.state.unlockedPlots;
        const coinsBefore = this.state.coins;
        const result = Core.unlockNextPlot(this.state);
        if (result.ok) {
          this.addActionEffect("ui-success", { x: MOBILE_LAYOUT ? x : 866, y: MOBILE_LAYOUT ? y : 302, color: C.green, view: "market" }, 760);
          this.addActionEffect("plot-unlock", { plotIndex, view: "farm" }, 950);
          this.addResourceEffect("coins", this.state.coins - coinsBefore);
        }
        this.showToast(result.ok ? "新土地已解锁" : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "research") {
        const starsBefore = this.state.stars;
        const result = Core.buyResearch(this.state, hit.researchId);
        if (result.ok) {
          this.addActionEffect("ui-success", { x, y, color: C.yellow, view: "market" }, 760);
          this.addResourceEffect("stars", this.state.stars - starsBefore);
        }
        this.showToast(result.ok ? `${result.entry.name}升级完成` : result.reason, result.ok ? "good" : "bad");
      } else if (hit.type === "link-cell") this.clickLinkCell(hit.row, hit.col);
      else if (hit.type === "link-hint") this.hintLink();
      else if (hit.type === "link-shuffle") this.shuffleLink(true);
      else if (hit.type === "puzzle-mode") {
        this.puzzleMode = hit.mode;
        this.toast = null;
      }
      else if (hit.type === "merge-move") this.moveMerge(hit.direction);
      else if (hit.type === "match-cell") this.clickMatchCell(hit.row, hit.col);
      else if (hit.type === "match-shuffle") this.shuffleMatch3();
      this.save(true);
      this.render();
      return;
    }
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
        fertilized: plot.crop.fertilized,
        rotationBonus: plot.crop.rotationBonus
      } : null
    }));
    const payload = {
      coordinateSystem: `${WIDTH}x${HEIGHT}，原点左上，x向右，y向下`,
      layout: MOBILE_LAYOUT ? "mobile-portrait" : "desktop-landscape",
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
        automationEnabled: this.state.automationEnabled,
        plots: visiblePlots,
        seeds: Object.fromEntries(Core.CROPS.map((crop) => [crop.id, this.state.seeds[crop.id]])),
        produce: Object.fromEntries(Core.CROPS.map((crop) => [crop.id, this.state.produce[crop.id]])),
        orders: this.state.orders.map((order) => ({ ...order, stocked: this.state.produce[order.cropId] }))
      },
      festival: this.state.festival,
      festivalRound: {
        number: this.state.festivalCount + 1,
        progress: this.state.festivalProgress,
        goals: this.state.festivalGoals,
        giftProgress: this.state.miniGiftProgress
      },
      selected: this.state.selected,
      activeEffects: this.actionEffects.map((effect) => effect.type)
    };
    if (this.state.view === "link" && this.link) {
      payload.link = {
        score: this.link.score,
        remaining: this.link.board.flat().filter((value) => value != null).length,
        clearedBoards: this.link.clearedBoards,
        flowMode: this.link.flowMode,
        matchedPairs: this.link.matchedPairs,
        rewardPairs: this.link.rewardPairs,
        rewards: this.link.rewards,
        selected: this.link.selected,
        animating: this.now() < this.link.lockedUntil
      };
    }
    if (this.state.view === "match3" && this.match3) {
      payload.match3 = {
        mode: this.puzzleMode,
        score: this.match3.score,
        objective: `${this.match3.collected}/${this.match3.target}`,
        milestones: this.match3.milestones,
        rewards: this.match3.rewards,
        selected: this.match3.selected,
        animation: this.activeMatchSegment()?.type || null
      };
      if (this.puzzleMode === "merge" && this.merge) {
        payload.merge = {
          board: this.merge.board,
          score: this.merge.score,
          maxValue: this.merge.maxValue,
          merges: this.merge.merges,
          rewardMerges: this.merge.rewardMerges,
          rewards: this.merge.rewards,
          animating: this.now() < this.merge.lockedUntil
        };
      }
    }
    if (this.state.view === "pets") {
      const garden = this.state.petGarden;
      payload.pets = {
        selectedPet: garden.selectedPet,
        food: garden.food,
        farmProduceAvailable: Core.availableProduce(this.state),
        visitorCoins: garden.visitorCoins,
        facilities: garden.facilities,
        owned: Object.fromEntries(Core.PET_TYPES.map((pet) => [pet.id, garden.pets[pet.id].owned])),
        status: garden.pets[garden.selectedPet],
        action: [...this.actionEffects].reverse().find((effect) => (
          effect.type === "pet-action"
          && effect.petId === garden.selectedPet
          && effect.until >= this.frameNow
        ))?.action || null,
        actors: Core.PET_TYPES
          .filter((pet) => garden.pets[pet.id].owned)
          .map((pet) => ({ id: pet.id, ...this.petActorPosition(pet.id) }))
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
        appInstance.match3 = null;
        appInstance.merge = null;
        appInstance.puzzleMode = "match3";
        appInstance.actionEffects = [];
        appInstance.maturePlots = new Set();
        appInstance.switchView("farm");
        appInstance.save(true);
      },
      setView: (view) => appInstance.switchView(view),
      completeMini: (type) => Core.completeMiniGame(appInstance.state, type),
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
