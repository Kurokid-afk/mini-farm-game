(function initCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.UUHarvestCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore() {
  "use strict";

  const VERSION = 1;
  const PLOT_COUNT = 12;
  const FERTILIZER_COIN_COST = 4;

  const CROPS = [
    { id: "radish", name: "萝卜", level: 1, duration: 45_000, seedPrice: 5, sellPrice: 9, yield: 1, color: "#f4c8c4" },
    { id: "cabbage", name: "白菜", level: 1, duration: 90_000, seedPrice: 8, sellPrice: 15, yield: 1, color: "#78c978" },
    { id: "potato", name: "土豆", level: 2, duration: 180_000, seedPrice: 13, sellPrice: 10, yield: 2, color: "#d5a96e" },
    { id: "tomato", name: "番茄", level: 3, duration: 300_000, seedPrice: 22, sellPrice: 14, yield: 2, color: "#ef6b62" },
    { id: "corn", name: "玉米", level: 4, duration: 600_000, seedPrice: 38, sellPrice: 23, yield: 2, color: "#efcf55" },
    { id: "strawberry", name: "草莓", level: 5, duration: 900_000, seedPrice: 65, sellPrice: 26, yield: 3, color: "#df4560" }
  ];

  const LAND_COSTS = [100, 160, 250, 380, 560, 800];
  const SHOP_ITEMS = [
    { id: "watering", name: "精致水壶", description: "浇水加速再提高 5%", max: 4, costs: [140, 280, 520, 900], kind: "upgrade" },
    { id: "basket", name: "丰收菜篮", description: "每次收获数量 +1", max: 3, costs: [240, 560, 1100], kind: "upgrade" },
    { id: "greenhouse", name: "玻璃温室", description: "全部作物成长加快 5%", max: 5, costs: [300, 650, 1100, 1750, 2600], kind: "upgrade" },
    { id: "market", name: "集市摊位", description: "出售价格提高 6%", max: 5, costs: [260, 600, 1050, 1700, 2500], kind: "upgrade" },
    {
      id: "sprinkler",
      name: "自动洒水器",
      description: "每台只照顾一块土地",
      max: 12,
      costs: [180, 240, 320, 420, 540, 680, 850, 1050, 1300, 1600, 1950, 2350],
      kind: "automation"
    },
    {
      id: "harvester",
      name: "收菜助手",
      description: "每台只收一块土地",
      max: 12,
      costs: [320, 440, 580, 740, 920, 1150, 1400, 1700, 2050, 2450, 2900, 3400],
      kind: "automation"
    },
    { id: "soilKit", name: "沃土改良包", description: "指定土地永久提质", max: 99, costs: [120], kind: "consumable" },
    { id: "windmill", name: "彩色风车", description: "成长速度额外提高 3%", max: 1, costs: [760], kind: "landmark" },
    { id: "scarecrow", name: "稻草人", description: "高品质收获概率提高", max: 1, costs: [420], kind: "landmark" }
  ];

  const RESEARCH = [
    { id: "growth", name: "四季栽培", description: "永久成长速度 +4%", max: 5 },
    { id: "mini", name: "游园手艺", description: "小游戏奖励永久增加", max: 5 },
    { id: "orders", name: "熟客名册", description: "订单奖励永久 +6%", max: 5 }
  ];

  function cropById(id) {
    return CROPS.find((crop) => crop.id === id);
  }

  function xpNeeded(level) {
    return 55 + level * 25;
  }

  function addXp(state, amount) {
    state.xp += Math.max(0, amount);
    let levels = 0;
    while (state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level += 1;
      levels += 1;
    }
    return levels;
  }

  function unlockedCrops(level) {
    return CROPS.filter((crop) => crop.level <= level);
  }

  function maxOrderCost(level) {
    return Math.max(...unlockedCrops(level).map((crop) => Math.ceil(7 / crop.yield) * crop.seedPrice));
  }

  function createOrder(level, serial) {
    const choices = unlockedCrops(level);
    const crop = choices[Math.abs(serial * 5 + level * 3) % choices.length];
    const amount = 3 + Math.abs(serial + level) % 5;
    const estimatedCost = Math.ceil(amount / crop.yield) * crop.seedPrice;
    const reserve = maxOrderCost(level + 1);
    return {
      id: `order-${serial}`,
      cropId: crop.id,
      amount,
      estimatedCost,
      coins: Math.ceil(Math.max(estimatedCost * 1.9, crop.sellPrice * amount * 1.45, reserve * 1.15)),
      xp: 10 + crop.level * 4 + amount
    };
  }

  function blankPlot() {
    return { crop: null, soil: 0 };
  }

  function createDefaultState(now = Date.now()) {
    const state = {
      version: VERSION,
      coins: 150,
      level: 1,
      xp: 0,
      totalEarned: 0,
      seedTickets: 2,
      compost: 3,
      orderSeals: 0,
      sun: 3,
      stars: 0,
      festivalCount: 0,
      festival: { link: false, zuma: false, match3: false },
      research: { growth: 0, mini: 0, orders: 0 },
      upgrades: Object.fromEntries(SHOP_ITEMS.filter((item) => item.kind !== "consumable").map((item) => [item.id, 0])),
      inventory: { soilKit: 0 },
      automationSlots: { sprinkler: [], harvester: [] },
      seeds: Object.fromEntries(CROPS.map((crop) => [crop.id, 0])),
      produce: Object.fromEntries(CROPS.map((crop) => [crop.id, 0])),
      qualityStock: Object.fromEntries(CROPS.map((crop) => [crop.id, 0])),
      mastery: Object.fromEntries(CROPS.map((crop) => [crop.id, { xp: 0, level: 0 }])),
      plots: Array.from({ length: PLOT_COUNT }, blankPlot),
      unlockedPlots: 6,
      selected: { type: "seed", id: "radish" },
      orders: [],
      orderSerial: 3,
      exchangeSerial: 0,
      pestBlessing: 0,
      lastAutoAt: now,
      stats: {
        planted: 0,
        harvested: 0,
        orders: 0,
        linkRounds: 0,
        zumaRounds: 0,
        match3Rounds: 0
      },
      alwaysOnTop: false,
      view: "farm",
      lastSeen: now
    };
    state.seeds.radish = 4;
    state.seeds.cabbage = 3;
    state.orders = [createOrder(1, 0), createOrder(1, 1), createOrder(1, 2)];
    return state;
  }

  function clampNumber(value, fallback, min = 0) {
    const number = Number(value);
    return Number.isFinite(number) ? Math.max(min, number) : fallback;
  }

  function normalizeState(raw, now = Date.now()) {
    const fallback = createDefaultState(now);
    if (!raw || typeof raw !== "object") return fallback;
    const state = { ...fallback, ...raw };
    state.coins = clampNumber(raw.coins, fallback.coins);
    state.level = Math.max(1, Math.floor(clampNumber(raw.level, 1, 1)));
    state.xp = clampNumber(raw.xp, 0);
    for (const key of ["seedTickets", "compost", "orderSeals", "sun", "stars", "festivalCount", "pestBlessing"]) {
      state[key] = Math.floor(clampNumber(raw[key], fallback[key]));
    }
    state.festival = { ...fallback.festival, ...(raw.festival || {}) };
    state.research = { ...fallback.research, ...(raw.research || {}) };
    state.upgrades = { ...fallback.upgrades, ...(raw.upgrades || {}) };
    state.inventory = { ...fallback.inventory, ...(raw.inventory || {}) };
    state.seeds = { ...fallback.seeds, ...(raw.seeds || {}) };
    state.produce = { ...fallback.produce, ...(raw.produce || {}) };
    state.qualityStock = { ...fallback.qualityStock, ...(raw.qualityStock || {}) };
    state.stats = { ...fallback.stats, ...(raw.stats || {}) };
    state.mastery = Object.fromEntries(CROPS.map((crop) => {
      const entry = raw.mastery?.[crop.id] || fallback.mastery[crop.id];
      return [crop.id, { xp: clampNumber(entry.xp, 0), level: Math.floor(clampNumber(entry.level, 0)) }];
    }));
    state.automationSlots = {
      sprinkler: [...new Set((raw.automationSlots?.sprinkler || []).map(Number))].filter((index) => index >= 0 && index < PLOT_COUNT),
      harvester: [...new Set((raw.automationSlots?.harvester || []).map(Number))].filter((index) => index >= 0 && index < PLOT_COUNT)
    };
    state.upgrades.sprinkler = Math.max(state.upgrades.sprinkler || 0, state.automationSlots.sprinkler.length);
    state.upgrades.harvester = Math.max(state.upgrades.harvester || 0, state.automationSlots.harvester.length);
    state.plots = Array.from({ length: PLOT_COUNT }, (_, index) => {
      const source = raw.plots?.[index];
      if (!source) return blankPlot();
      const crop = source.crop && cropById(source.crop.cropId)
        ? {
            cropId: source.crop.cropId,
            plantedAt: clampNumber(source.crop.plantedAt, now),
            finishAt: clampNumber(source.crop.finishAt, now),
            watered: Boolean(source.crop.watered),
            fertilized: Boolean(source.crop.fertilized)
          }
        : null;
      return { crop, soil: Math.min(3, Math.floor(clampNumber(source.soil, 0))) };
    });
    const occupied = state.plots.reduce((highest, plot, index) => plot.crop ? index + 1 : highest, 0);
    const assigned = Math.max(0, ...state.automationSlots.sprinkler.map((index) => index + 1), ...state.automationSlots.harvester.map((index) => index + 1));
    state.unlockedPlots = Math.min(PLOT_COUNT, Math.max(6, Math.floor(clampNumber(raw.unlockedPlots, Math.max(6, occupied, assigned)))));
    state.orders = Array.isArray(raw.orders)
      ? raw.orders.filter((order) => cropById(order.cropId)).slice(0, 3).map((order) => {
          const crop = cropById(order.cropId);
          const amount = Math.max(1, Math.floor(clampNumber(order.amount, 3, 1)));
          const estimatedCost = Math.ceil(amount / crop.yield) * crop.seedPrice;
          return {
            ...order,
            amount,
            estimatedCost,
            coins: Math.max(clampNumber(order.coins, 0), Math.ceil(estimatedCost * 1.9))
          };
        })
      : [];
    state.orderSerial = Math.max(3, Math.floor(clampNumber(raw.orderSerial, 3)));
    while (state.orders.length < 3) state.orders.push(createOrder(state.level, state.orderSerial++));
    const allowedViews = ["farm", "link", "zuma", "match3", "market"];
    state.view = allowedViews.includes(raw.view) ? raw.view : "farm";
    state.selected = raw.selected && ["seed", "water", "fertilizer", "hand", "automation", "soil"].includes(raw.selected.type)
      ? raw.selected
      : fallback.selected;
    state.lastAutoAt = clampNumber(raw.lastAutoAt, now);
    state.lastSeen = now;
    return state;
  }

  function growthMultiplier(state) {
    const greenhouse = Math.pow(0.95, state.upgrades.greenhouse || 0);
    const research = Math.pow(0.96, state.research.growth || 0);
    const windmill = state.upgrades.windmill ? 0.97 : 1;
    return greenhouse * research * windmill;
  }

  function cropProgress(plot, now = Date.now()) {
    if (!plot?.crop) return 0;
    const crop = plot.crop;
    const total = Math.max(1, crop.finishAt - crop.plantedAt);
    return Math.max(0, Math.min(1, (now - crop.plantedAt) / total));
  }

  function plant(state, plotIndex, cropId, now = Date.now()) {
    const crop = cropById(cropId);
    const plot = state.plots[plotIndex];
    if (!crop) return { ok: false, reason: "没有这种种子" };
    if (!plot || plotIndex >= state.unlockedPlots) return { ok: false, reason: "土地还没解锁" };
    if (crop.level > state.level) return { ok: false, reason: `农场 ${crop.level} 级解锁` };
    if (plot.crop) return { ok: false, reason: "这块地已经种了东西" };
    if ((state.seeds[cropId] || 0) < 1) return { ok: false, reason: "种子不够，可购买或玩连连看" };
    state.seeds[cropId] -= 1;
    const autoWatered = state.automationSlots.sprinkler.includes(plotIndex);
    const duration = crop.duration * growthMultiplier(state);
    const waterBoost = 0.15 + (state.upgrades.watering || 0) * 0.05;
    plot.crop = {
      cropId,
      plantedAt: now,
      finishAt: now + duration * (autoWatered ? 1 - waterBoost : 1),
      watered: autoWatered,
      fertilized: false
    };
    state.stats.planted += 1;
    addXp(state, 2);
    return { ok: true, crop };
  }

  function water(state, plotIndex, now = Date.now()) {
    const plot = state.plots[plotIndex];
    if (!plot?.crop) return { ok: false, reason: "这里还没有作物" };
    if (cropProgress(plot, now) >= 1) return { ok: false, reason: "已经成熟" };
    if (plot.crop.watered) return { ok: false, reason: "已经浇过水" };
    const crop = cropById(plot.crop.cropId);
    plot.crop.watered = true;
    plot.crop.finishAt = Math.max(now, plot.crop.finishAt - crop.duration * (0.15 + (state.upgrades.watering || 0) * 0.05));
    return { ok: true };
  }

  function fertilize(state, plotIndex, now = Date.now()) {
    const plot = state.plots[plotIndex];
    if (!plot?.crop) return { ok: false, reason: "这里还没有作物" };
    if (cropProgress(plot, now) >= 1) return { ok: false, reason: "已经成熟" };
    if (plot.crop.fertilized) return { ok: false, reason: "已经施过肥" };
    if (state.compost < 1 && state.coins < FERTILIZER_COIN_COST) return { ok: false, reason: "堆肥和金币都不够" };
    if (state.compost > 0) state.compost -= 1;
    else state.coins -= FERTILIZER_COIN_COST;
    const crop = cropById(plot.crop.cropId);
    plot.crop.fertilized = true;
    plot.crop.finishAt = Math.max(now, plot.crop.finishAt - crop.duration * 0.24);
    return { ok: true };
  }

  function masteryNeeded(level) {
    return 8 + level * 5;
  }

  function addMastery(state, cropId, amount) {
    const mastery = state.mastery[cropId];
    mastery.xp += amount;
    while (mastery.xp >= masteryNeeded(mastery.level)) {
      mastery.xp -= masteryNeeded(mastery.level);
      mastery.level += 1;
    }
  }

  function harvest(state, plotIndex, now = Date.now()) {
    const plot = state.plots[plotIndex];
    if (!plot?.crop) return { ok: false, reason: "这里没有作物" };
    if (cropProgress(plot, now) < 1) return { ok: false, reason: "还没成熟" };
    const crop = cropById(plot.crop.cropId);
    const amount = crop.yield + (state.upgrades.basket || 0);
    let quality = 1 + plot.soil * 0.07;
    if (plot.crop.watered) quality += 0.08;
    if (plot.crop.fertilized) quality += 0.18;
    if (state.upgrades.scarecrow) quality += 0.05;
    if (state.pestBlessing > 0) {
      quality += 0.12;
      state.pestBlessing -= 1;
    }
    quality += Math.min(0.2, state.mastery[crop.id].level * 0.02);
    state.produce[crop.id] += amount;
    state.qualityStock[crop.id] += amount * quality;
    state.sun += Math.max(1, Math.floor(amount / 2));
    state.stats.harvested += amount;
    addMastery(state, crop.id, amount);
    const levels = addXp(state, 4 + crop.level * 2);
    plot.crop = null;
    return { ok: true, crop, amount, quality, levels };
  }

  function buySeeds(state, cropId, amount = 3) {
    const crop = cropById(cropId);
    if (!crop) return { ok: false, reason: "没有这种种子" };
    if (crop.level > state.level) return { ok: false, reason: `农场 ${crop.level} 级解锁` };
    const cost = crop.seedPrice * amount;
    if (state.coins < cost) return { ok: false, reason: "金币不够" };
    state.coins -= cost;
    state.seeds[cropId] += amount;
    return { ok: true, cost, amount };
  }

  function exchangeSeedTicket(state) {
    if (state.seedTickets < 1) return { ok: false, reason: "种子券不够，去玩连连看吧" };
    state.seedTickets -= 1;
    const choices = unlockedCrops(state.level);
    const crop = choices[state.exchangeSerial % choices.length];
    state.exchangeSerial += 1;
    const amount = 2 + Math.floor((state.research.mini || 0) / 2);
    state.seeds[crop.id] += amount;
    return { ok: true, crop, amount };
  }

  function produceValue(state) {
    const marketBonus = 1 + (state.upgrades.market || 0) * 0.06;
    return CROPS.reduce((total, crop) => {
      const quality = state.qualityStock[crop.id] || 0;
      return total + crop.sellPrice * quality * marketBonus;
    }, 0);
  }

  function sellAll(state) {
    const value = Math.floor(produceValue(state));
    if (value <= 0) return { ok: false, reason: "仓库里还没有蔬菜" };
    for (const crop of CROPS) {
      state.produce[crop.id] = 0;
      state.qualityStock[crop.id] = 0;
    }
    state.coins += value;
    state.totalEarned += value;
    addXp(state, Math.max(1, Math.floor(value / 18)));
    return { ok: true, value };
  }

  function deliverOrder(state, orderId) {
    const index = state.orders.findIndex((order) => order.id === orderId);
    if (index < 0) return { ok: false, reason: "订单不存在" };
    const order = state.orders[index];
    if ((state.produce[order.cropId] || 0) < order.amount) return { ok: false, reason: "仓库数量还不够" };
    const countBefore = state.produce[order.cropId];
    const averageQuality = countBefore ? state.qualityStock[order.cropId] / countBefore : 1;
    state.produce[order.cropId] -= order.amount;
    state.qualityStock[order.cropId] = Math.max(0, state.qualityStock[order.cropId] - averageQuality * order.amount);
    const sealUsed = state.orderSeals > 0;
    if (sealUsed) state.orderSeals -= 1;
    const multiplier = (1 + (state.research.orders || 0) * 0.06) * (sealUsed ? 1.25 : 1);
    const coins = Math.ceil(order.coins * multiplier);
    state.coins += coins;
    state.totalEarned += coins;
    state.stats.orders += 1;
    const levels = addXp(state, order.xp);
    state.orders[index] = createOrder(state.level, state.orderSerial++);
    return { ok: true, order, coins, sealUsed, levels };
  }

  function nextLandCost(state) {
    return state.unlockedPlots >= PLOT_COUNT ? null : LAND_COSTS[state.unlockedPlots - 6];
  }

  function unlockNextPlot(state) {
    const cost = nextLandCost(state);
    if (cost == null) return { ok: false, reason: "土地已经全部解锁" };
    if (state.coins < cost) return { ok: false, reason: "金币不够" };
    state.coins -= cost;
    state.unlockedPlots += 1;
    return { ok: true, cost };
  }

  function shopItem(id) {
    return SHOP_ITEMS.find((item) => item.id === id);
  }

  function itemLevel(state, item) {
    return item.kind === "consumable" ? state.inventory.soilKit : state.upgrades[item.id] || 0;
  }

  function itemCost(state, item) {
    const level = itemLevel(state, item);
    if (item.kind === "consumable") return item.costs[0] + state.plots.reduce((total, plot) => total + plot.soil, 0) * 20;
    return item.costs[Math.min(level, item.costs.length - 1)];
  }

  function buyShopItem(state, id) {
    const item = shopItem(id);
    if (!item) return { ok: false, reason: "商品不存在" };
    const level = itemLevel(state, item);
    if (level >= item.max) return { ok: false, reason: "已经达到最高级" };
    const cost = itemCost(state, item);
    if (state.coins < cost) return { ok: false, reason: "金币不够" };
    state.coins -= cost;
    if (item.kind === "consumable") state.inventory.soilKit += 1;
    else state.upgrades[id] = level + 1;
    return { ok: true, item, cost, level: level + 1 };
  }

  function unplacedAutomation(state, type) {
    if (!["sprinkler", "harvester"].includes(type)) return 0;
    return Math.max(0, (state.upgrades[type] || 0) - state.automationSlots[type].length);
  }

  function toggleAutomation(state, type, plotIndex) {
    if (!["sprinkler", "harvester"].includes(type)) return { ok: false, reason: "未知设备" };
    if (plotIndex < 0 || plotIndex >= state.unlockedPlots) return { ok: false, reason: "土地还没解锁" };
    const slots = state.automationSlots[type];
    const existing = slots.indexOf(plotIndex);
    if (existing >= 0) {
      slots.splice(existing, 1);
      return { ok: true, action: "removed" };
    }
    if (unplacedAutomation(state, type) < 1) return { ok: false, reason: "没有空闲设备" };
    slots.push(plotIndex);
    slots.sort((a, b) => a - b);
    return { ok: true, action: "placed" };
  }

  function applySoilKit(state, plotIndex) {
    if (plotIndex < 0 || plotIndex >= state.unlockedPlots) return { ok: false, reason: "土地还没解锁" };
    if (state.inventory.soilKit < 1) return { ok: false, reason: "没有沃土改良包" };
    if (state.plots[plotIndex].soil >= 3) return { ok: false, reason: "这块土地已经是最高品质" };
    state.inventory.soilKit -= 1;
    state.plots[plotIndex].soil += 1;
    return { ok: true, soil: state.plots[plotIndex].soil };
  }

  function runAutomation(state, now = Date.now(), force = false) {
    if (!force && now - state.lastAutoAt < 15_000) return { ok: false, count: 0, reason: "设备巡查中" };
    state.lastAutoAt = now;
    let count = 0;
    let plots = 0;
    for (const index of state.automationSlots.harvester) {
      const result = harvest(state, index, now);
      if (result.ok) {
        count += result.amount;
        plots += 1;
      }
    }
    return { ok: count > 0, count, plots, reason: count ? "" : "没有成熟作物" };
  }

  function researchCost(state, id) {
    const level = state.research[id] || 0;
    return level >= 5 ? null : level + 1;
  }

  function buyResearch(state, id) {
    const entry = RESEARCH.find((item) => item.id === id);
    if (!entry) return { ok: false, reason: "研究不存在" };
    const cost = researchCost(state, id);
    if (cost == null) return { ok: false, reason: "研究已经完成" };
    if (state.stars < cost) return { ok: false, reason: "丰收星不够" };
    state.stars -= cost;
    state.research[id] += 1;
    return { ok: true, entry, cost };
  }

  function completeMiniGame(state, type, score, success = true) {
    const safeScore = Math.max(0, Math.floor(score));
    const rewardLevel = state.research.mini || 0;
    let reward;
    if (type === "link") {
      const amount = 2 + Math.floor(safeScore / 700) + Math.floor(rewardLevel / 2);
      state.seedTickets += amount;
      state.stats.linkRounds += 1;
      reward = { resource: "seedTickets", amount };
    } else if (type === "zuma") {
      const amount = 2 + Math.floor(safeScore / 900) + Math.floor(rewardLevel / 2);
      state.compost += amount;
      state.pestBlessing += 2 + Math.floor(rewardLevel / 2);
      state.stats.zumaRounds += 1;
      reward = { resource: "compost", amount, blessing: 2 + Math.floor(rewardLevel / 2) };
    } else if (type === "match3") {
      const amount = 1 + Math.floor(safeScore / 1200) + Math.floor(rewardLevel / 3);
      state.orderSeals += amount;
      state.stats.match3Rounds += 1;
      reward = { resource: "orderSeals", amount };
    } else {
      return { ok: false, reason: "未知小游戏" };
    }
    let festival = null;
    if (success) state.festival[type] = true;
    if (state.festival.link && state.festival.zuma && state.festival.match3) {
      const coins = 120 + state.level * 25 + state.festivalCount * 10;
      state.festival = { link: false, zuma: false, match3: false };
      state.festivalCount += 1;
      state.stars += 1;
      state.coins += coins;
      festival = { coins, stars: 1, count: state.festivalCount };
    }
    return { ok: true, reward, festival };
  }

  function spendSun(state, amount) {
    if (state.sun < amount) return { ok: false, reason: "阳光不够，去农场收菜吧" };
    state.sun -= amount;
    return { ok: true };
  }

  function formatDuration(milliseconds) {
    const seconds = Math.max(0, Math.ceil(milliseconds / 1000));
    if (seconds < 60) return `${seconds}秒`;
    const minutes = Math.floor(seconds / 60);
    const rest = seconds % 60;
    return rest ? `${minutes}分${rest}秒` : `${minutes}分钟`;
  }

  return {
    VERSION,
    PLOT_COUNT,
    CROPS,
    LAND_COSTS,
    SHOP_ITEMS,
    RESEARCH,
    FERTILIZER_COIN_COST,
    cropById,
    xpNeeded,
    addXp,
    unlockedCrops,
    maxOrderCost,
    createOrder,
    createDefaultState,
    normalizeState,
    growthMultiplier,
    cropProgress,
    plant,
    water,
    fertilize,
    harvest,
    buySeeds,
    exchangeSeedTicket,
    produceValue,
    sellAll,
    deliverOrder,
    nextLandCost,
    unlockNextPlot,
    shopItem,
    itemLevel,
    itemCost,
    buyShopItem,
    unplacedAutomation,
    toggleAutomation,
    applySoilKit,
    runAutomation,
    researchCost,
    buyResearch,
    completeMiniGame,
    spendSun,
    formatDuration
  };
});
