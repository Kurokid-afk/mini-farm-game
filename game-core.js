(function initCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.UUHarvestCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function createCore() {
  "use strict";

  const VERSION = 4;
  const PLOT_COUNT = 12;
  const FERTILIZER_COIN_COST = 4;
  const PET_FOOD_PRODUCE_COST = 2;
  const FESTIVAL_GOAL_PATTERNS = [
    { link: 6, match3: 24 },
    { link: 7, match3: 27 },
    { link: 8, match3: 24 },
    { link: 6, match3: 30 }
  ];
  const MERGE_REWARD_TIERS = [
    { minimum: 0, coins: 20, orderSeals: 0, sun: 0, festival: 1 },
    { minimum: 400, coins: 50, orderSeals: 1, sun: 0, festival: 2 },
    { minimum: 1200, coins: 100, orderSeals: 2, sun: 0, festival: 4 },
    { minimum: 3000, coins: 180, orderSeals: 3, sun: 1, festival: 6 },
    { minimum: 7000, coins: 300, orderSeals: 4, sun: 2, festival: 9 },
    { minimum: 15000, coins: 500, orderSeals: 6, sun: 3, festival: 12 }
  ];

  const CROPS = [
    { id: "radish", name: "萝卜", level: 1, duration: 120_000, seedPrice: 5, sellPrice: 9, yield: 1, color: "#f4c8c4" },
    { id: "cabbage", name: "白菜", level: 1, duration: 240_000, seedPrice: 8, sellPrice: 15, yield: 1, color: "#78c978" },
    { id: "potato", name: "土豆", level: 2, duration: 420_000, seedPrice: 13, sellPrice: 10, yield: 2, color: "#d5a96e" },
    { id: "tomato", name: "番茄", level: 3, duration: 720_000, seedPrice: 22, sellPrice: 14, yield: 2, color: "#ef6b62" },
    { id: "corn", name: "玉米", level: 4, duration: 1_200_000, seedPrice: 38, sellPrice: 23, yield: 2, color: "#efcf55" },
    { id: "strawberry", name: "草莓", level: 5, duration: 1_800_000, seedPrice: 65, sellPrice: 26, yield: 3, color: "#df4560" }
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
    { id: "scarecrow", name: "稻草人", description: "高品质收获概率提高", max: 1, costs: [420], kind: "landmark" },
    { id: "compostBin", name: "发酵肥箱", description: "每级让施肥再加速 4%", max: 3, costs: [360, 760, 1380], kind: "upgrade" },
    { id: "orderBell", name: "熟客铜铃", description: "每级让订单奖励提高 5%", max: 3, costs: [480, 980, 1760], kind: "upgrade" },
    { id: "coldStorage", name: "保鲜冷柜", description: "每级让出售价格提高 5%", max: 3, costs: [520, 1080, 1950], kind: "upgrade" }
  ];

  const PET_GARDEN_COST = 520;
  const PET_TYPES = [
    { id: "dog", name: "小麦犬", description: "热情，会吸引附近上班族", cost: 360, income: 0.35, level: 1, portrait: 0 },
    { id: "cat", name: "橘子猫", description: "安静，心情下降得更慢", cost: 680, income: 0.5, level: 2, portrait: 1 },
    { id: "rabbit", name: "云朵兔", description: "爱玩，玩耍收益更高", cost: 960, income: 0.7, level: 3, portrait: 2 },
    { id: "chick", name: "团子鸡", description: "活泼，带来更多访客", cost: 1320, income: 0.95, level: 4, portrait: 3 }
  ];

  const PET_FACILITIES = [
    { id: "food", name: "田园宠物粮", description: "用 2 份农场蔬菜加工 5 份", kind: "consumable", max: 99, costs: [15], icon: "food" },
    { id: "kennel", name: "舒适小屋", description: "减慢饥饿并提高收益", kind: "facility", max: 3, costs: [280, 620, 1120], icon: "kennel" },
    { id: "pond", name: "浅水嬉戏池", description: "解锁洗澡并提高洁净", kind: "facility", max: 1, costs: [480], icon: "pond" },
    { id: "autoFeeder", name: "自动喂食机", description: "离线时自动消耗口粮", kind: "facility", max: 3, costs: [760, 1380, 2280], icon: "feeder" },
    { id: "toyBox", name: "玩具收纳箱", description: "每级提高玩耍效果", kind: "facility", max: 3, costs: [360, 780, 1420], icon: "toy" },
    { id: "grooming", name: "宠物护理台", description: "解锁梳毛并提高收益", kind: "facility", max: 1, costs: [690], icon: "groom" },
    { id: "flowerArch", name: "迎客花架", description: "每级提高访客收益 6%", kind: "decoration", max: 3, costs: [240, 540, 980], icon: "flower" },
    { id: "nightLamp", name: "萤火夜灯", description: "夜间也能持续吸引访客", kind: "decoration", max: 1, costs: [430], icon: "lamp" },
    { id: "picnic", name: "野餐小桌", description: "抚摸和玩耍效果提高", kind: "decoration", max: 1, costs: [590], icon: "picnic" },
    { id: "birdBath", name: "小鸟饮水台", description: "洁净下降更慢并吸引访客", kind: "decoration", max: 1, costs: [380], icon: "birdbath" },
    { id: "pebblePath", name: "彩石小径", description: "每级提高访客收益 3%", kind: "decoration", max: 3, costs: [180, 390, 720], icon: "path" },
    { id: "musicBox", name: "手摇音乐盒", description: "宠物开心下降更慢", kind: "decoration", max: 1, costs: [820], icon: "music" }
  ];

  const RESEARCH = [
    { id: "growth", name: "四季栽培", description: "永久成长速度 +4%", max: 5 },
    { id: "mini", name: "游园手艺", description: "小游戏里程碑奖励增加", max: 5 },
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
    return { crop: null, soil: 0, lastCropId: null };
  }

  function festivalGoalsForRound(completedRounds = 0) {
    const index = Math.max(0, Math.floor(completedRounds)) % FESTIVAL_GOAL_PATTERNS.length;
    return { ...FESTIVAL_GOAL_PATTERNS[index] };
  }

  function createPetGarden(now = Date.now()) {
    return {
      unlocked: false,
      selectedPet: "dog",
      food: 2,
      visitorCoins: 0,
      incomeRemainder: 0,
      lastUpdate: now,
      pets: Object.fromEntries(PET_TYPES.map((pet) => [pet.id, {
        owned: false,
        hunger: 78,
        happiness: 74,
        cleanliness: 82
      }])),
      facilities: Object.fromEntries(PET_FACILITIES.filter((item) => item.kind !== "consumable").map((item) => [item.id, 0]))
    };
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
      miniGiftProgress: 0,
      miniGiftCount: 0,
      festivalCount: 0,
      festival: { link: false, match3: false },
      festivalProgress: { link: 0, match3: 0 },
      festivalGoals: festivalGoalsForRound(0),
      research: { growth: 0, mini: 0, orders: 0 },
      upgrades: Object.fromEntries(SHOP_ITEMS.filter((item) => item.kind !== "consumable").map((item) => [item.id, 0])),
      inventory: { soilKit: 0 },
      automationSlots: { sprinkler: [], harvester: [] },
      automationEnabled: { sprinkler: true, harvester: true },
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
      petGarden: createPetGarden(now),
      lastAutoAt: now,
      stats: {
        planted: 0,
        harvested: 0,
        orders: 0,
        linkRounds: 0,
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
    for (const key of [
      "seedTickets",
      "compost",
      "orderSeals",
      "sun",
      "stars",
      "miniGiftProgress",
      "miniGiftCount",
      "festivalCount",
      "pestBlessing"
    ]) {
      state[key] = Math.floor(clampNumber(raw[key], fallback[key]));
    }
    state.miniGiftProgress %= 3;
    state.festival = Object.fromEntries(
      ["link", "match3"].map((type) => [type, Boolean(raw.festival?.[type])])
    );
    const defaultFestivalGoals = festivalGoalsForRound(state.festivalCount);
    state.festivalGoals = Object.fromEntries(
      ["link", "match3"].map((type) => [
        type,
        Math.max(1, Math.floor(clampNumber(raw.festivalGoals?.[type], defaultFestivalGoals[type], 1)))
      ])
    );
    state.festivalProgress = Object.fromEntries(
      ["link", "match3"].map((type) => {
        const migratedProgress = state.festival[type] ? state.festivalGoals[type] : 0;
        const progress = Math.floor(clampNumber(raw.festivalProgress?.[type], migratedProgress));
        return [type, Math.min(state.festivalGoals[type], progress)];
      })
    );
    state.research = { ...fallback.research, ...(raw.research || {}) };
    state.upgrades = { ...fallback.upgrades, ...(raw.upgrades || {}) };
    state.inventory = { ...fallback.inventory, ...(raw.inventory || {}) };
    state.seeds = { ...fallback.seeds, ...(raw.seeds || {}) };
    state.produce = { ...fallback.produce, ...(raw.produce || {}) };
    state.qualityStock = { ...fallback.qualityStock, ...(raw.qualityStock || {}) };
    state.stats = Object.fromEntries(
      Object.keys(fallback.stats).map((key) => [key, Math.floor(clampNumber(raw.stats?.[key], fallback.stats[key]))])
    );
    const rawGarden = raw.petGarden || {};
    state.petGarden = {
      ...fallback.petGarden,
      ...rawGarden,
      unlocked: Boolean(rawGarden.unlocked),
      selectedPet: PET_TYPES.some((pet) => pet.id === rawGarden.selectedPet) ? rawGarden.selectedPet : "dog",
      food: Math.floor(clampNumber(rawGarden.food, fallback.petGarden.food)),
      visitorCoins: Math.floor(clampNumber(rawGarden.visitorCoins, 0)),
      incomeRemainder: clampNumber(rawGarden.incomeRemainder, 0),
      lastUpdate: clampNumber(rawGarden.lastUpdate, now),
      pets: Object.fromEntries(PET_TYPES.map((pet) => {
        const entry = rawGarden.pets?.[pet.id] || fallback.petGarden.pets[pet.id];
        return [pet.id, {
          owned: Boolean(entry.owned),
          hunger: Math.min(100, clampNumber(entry.hunger, 78)),
          happiness: Math.min(100, clampNumber(entry.happiness, 74)),
          cleanliness: Math.min(100, clampNumber(entry.cleanliness, 82))
        }];
      })),
      facilities: {
        ...fallback.petGarden.facilities,
        ...(rawGarden.facilities || {})
      }
    };
    for (const item of PET_FACILITIES.filter((entry) => entry.kind !== "consumable")) {
      state.petGarden.facilities[item.id] = Math.min(item.max, Math.floor(clampNumber(state.petGarden.facilities[item.id], 0)));
    }
    state.mastery = Object.fromEntries(CROPS.map((crop) => {
      const entry = raw.mastery?.[crop.id] || fallback.mastery[crop.id];
      return [crop.id, { xp: clampNumber(entry.xp, 0), level: Math.floor(clampNumber(entry.level, 0)) }];
    }));
    state.automationSlots = {
      sprinkler: [...new Set((raw.automationSlots?.sprinkler || []).map(Number))].filter((index) => index >= 0 && index < PLOT_COUNT),
      harvester: [...new Set((raw.automationSlots?.harvester || []).map(Number))].filter((index) => index >= 0 && index < PLOT_COUNT)
    };
    state.automationEnabled = {
      sprinkler: raw.automationEnabled?.sprinkler !== false,
      harvester: raw.automationEnabled?.harvester !== false
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
            fertilized: Boolean(source.crop.fertilized),
            rotationBonus: Boolean(source.crop.rotationBonus)
          }
        : null;
      return {
        crop,
        soil: Math.min(3, Math.floor(clampNumber(source.soil, 0))),
        lastCropId: cropById(source.lastCropId) ? source.lastCropId : null
      };
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
    const allowedViews = ["farm", "link", "match3", "market", "pets"];
    state.view = allowedViews.includes(raw.view) ? raw.view : "farm";
    if (state.view === "pets" && !state.petGarden.unlocked) state.view = "market";
    state.selected = raw.selected && ["seed", "water", "fertilizer", "hand", "automation", "soil"].includes(raw.selected.type)
      ? raw.selected
      : fallback.selected;
    state.lastAutoAt = clampNumber(raw.lastAutoAt, now);
    syncPetGarden(state, now);
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
    const autoWatered = state.automationEnabled.sprinkler && state.automationSlots.sprinkler.includes(plotIndex);
    const rotationBonus = Boolean(plot.lastCropId && plot.lastCropId !== cropId);
    const duration = crop.duration * growthMultiplier(state) * (rotationBonus ? 0.9 : 1);
    const waterBoost = 0.15 + (state.upgrades.watering || 0) * 0.05;
    plot.crop = {
      cropId,
      plantedAt: now,
      finishAt: now + duration * (autoWatered ? 1 - waterBoost : 1),
      watered: autoWatered,
      fertilized: false,
      rotationBonus
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
    plot.crop.finishAt = Math.max(now, plot.crop.finishAt - crop.duration * (0.24 + (state.upgrades.compostBin || 0) * 0.04));
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
    if (plot.crop.rotationBonus) quality += 0.08;
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
    const rotationBonus = Boolean(plot.crop.rotationBonus);
    plot.lastCropId = crop.id;
    plot.crop = null;
    return { ok: true, crop, amount, quality, levels, rotationBonus };
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
    const marketBonus = 1 + (state.upgrades.market || 0) * 0.06 + (state.upgrades.coldStorage || 0) * 0.05;
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
    const multiplier = (
      1
      + (state.research.orders || 0) * 0.06
      + (state.upgrades.orderBell || 0) * 0.05
    ) * (sealUsed ? 1.25 : 1);
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
    if (!state.automationEnabled.harvester) return { ok: false, count, plots, reason: "自动收菜已暂停" };
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

  function petType(id) {
    return PET_TYPES.find((pet) => pet.id === id);
  }

  function petFacility(id) {
    return PET_FACILITIES.find((item) => item.id === id);
  }

  function petFacilityCost(state, id) {
    const item = petFacility(id);
    if (!item) return null;
    if (item.kind === "consumable") return item.costs[0];
    const level = state.petGarden.facilities[id] || 0;
    return level >= item.max ? null : item.costs[level];
  }

  function petMood(entry) {
    if (!entry?.owned) return 0;
    return Math.round((entry.hunger + entry.happiness + entry.cleanliness) / 3);
  }

  function availableProduce(state) {
    return CROPS.reduce((total, crop) => total + Math.floor(state.produce[crop.id] || 0), 0);
  }

  function consumeProduce(state, amount) {
    let remaining = Math.max(0, Math.floor(amount));
    const used = [];
    const crops = [...CROPS].sort((a, b) => a.sellPrice - b.sellPrice);
    for (const crop of crops) {
      if (remaining <= 0) break;
      const stock = Math.floor(state.produce[crop.id] || 0);
      const take = Math.min(stock, remaining);
      if (take <= 0) continue;
      const averageQuality = stock ? (state.qualityStock[crop.id] || 0) / stock : 1;
      state.produce[crop.id] -= take;
      state.qualityStock[crop.id] = Math.max(0, (state.qualityStock[crop.id] || 0) - averageQuality * take);
      used.push({ cropId: crop.id, amount: take });
      remaining -= take;
    }
    return used;
  }

  function syncPetGarden(state, now = Date.now()) {
    const garden = state.petGarden;
    if (!garden?.unlocked) {
      if (garden) garden.lastUpdate = now;
      return { elapsedMinutes: 0, income: 0, autoFeeds: 0 };
    }
    const elapsedMs = Math.max(0, Math.min(8 * 60 * 60 * 1000, now - garden.lastUpdate));
    if (elapsedMs < 1000) return { elapsedMinutes: elapsedMs / 60_000, income: 0, autoFeeds: 0 };
    const minutes = elapsedMs / 60_000;
    const kennel = garden.facilities.kennel || 0;
    const toyBox = garden.facilities.toyBox || 0;
    const pond = garden.facilities.pond || 0;
    const autoFeeder = garden.facilities.autoFeeder || 0;
    let autoFeeds = 0;
    let baseIncome = 0;
    for (const type of PET_TYPES) {
      const pet = garden.pets[type.id];
      if (!pet.owned) continue;
      pet.hunger = Math.max(0, pet.hunger - minutes * Math.max(0.04, 0.12 - kennel * 0.02));
      pet.happiness = Math.max(0, pet.happiness - minutes * Math.max(0.015, 0.045 - toyBox * 0.008));
      const birdBath = garden.facilities.birdBath || 0;
      const musicBox = garden.facilities.musicBox || 0;
      pet.happiness = Math.min(100, pet.happiness + minutes * musicBox * 0.012);
      pet.cleanliness = Math.max(0, pet.cleanliness - minutes * (pond || birdBath ? 0.018 : 0.035));
      if (autoFeeder > 0 && garden.food > 0 && pet.hunger < 68) {
        const desired = Math.min(autoFeeder, Math.ceil((72 - pet.hunger) / 28), garden.food);
        pet.hunger = Math.min(100, pet.hunger + desired * 28);
        garden.food -= desired;
        autoFeeds += desired;
      }
      baseIncome += type.income * minutes * (petMood(pet) / 100) * (pet.hunger / 100);
    }
    const facilityBonus = 1
      + kennel * 0.04
      + (garden.facilities.grooming || 0) * 0.08
      + (garden.facilities.flowerArch || 0) * 0.06
      + (garden.facilities.nightLamp || 0) * 0.05
      + (garden.facilities.picnic || 0) * 0.05
      + (garden.facilities.birdBath || 0) * 0.04
      + (garden.facilities.pebblePath || 0) * 0.03;
    const earnedExact = baseIncome * facilityBonus + garden.incomeRemainder;
    const income = Math.floor(earnedExact);
    garden.incomeRemainder = earnedExact - income;
    garden.visitorCoins += income;
    garden.lastUpdate = now;
    return { elapsedMinutes: minutes, income, autoFeeds };
  }

  function unlockPetGarden(state, now = Date.now()) {
    if (state.petGarden.unlocked) return { ok: false, reason: "宠物园已经解锁" };
    if (state.coins < PET_GARDEN_COST) return { ok: false, reason: "金币不够" };
    state.coins -= PET_GARDEN_COST;
    state.petGarden.unlocked = true;
    state.petGarden.food += 3;
    state.petGarden.lastUpdate = now;
    return { ok: true, cost: PET_GARDEN_COST };
  }

  function buyPet(state, id, now = Date.now()) {
    syncPetGarden(state, now);
    if (!state.petGarden.unlocked) return { ok: false, reason: "请先解锁宠物园" };
    const type = petType(id);
    if (!type) return { ok: false, reason: "没有这种宠物" };
    if (state.level < type.level) return { ok: false, reason: `农场 ${type.level} 级解锁` };
    const entry = state.petGarden.pets[id];
    if (entry.owned) return { ok: false, reason: "已经领养了" };
    if (state.coins < type.cost) return { ok: false, reason: "金币不够" };
    state.coins -= type.cost;
    entry.owned = true;
    entry.hunger = 82;
    entry.happiness = 88;
    entry.cleanliness = 86;
    state.petGarden.selectedPet = id;
    return { ok: true, pet: type, cost: type.cost };
  }

  function buyPetFacility(state, id, now = Date.now()) {
    syncPetGarden(state, now);
    if (!state.petGarden.unlocked) return { ok: false, reason: "请先解锁宠物园" };
    const item = petFacility(id);
    if (!item) return { ok: false, reason: "商品不存在" };
    const cost = petFacilityCost(state, id);
    if (cost == null) return { ok: false, reason: "已经达到最高级" };
    if (state.coins < cost) return { ok: false, reason: "金币不够" };
    if (item.kind === "consumable" && availableProduce(state) < PET_FOOD_PRODUCE_COST) {
      return { ok: false, reason: `农场仓库至少需要 ${PET_FOOD_PRODUCE_COST} 份蔬菜` };
    }
    state.coins -= cost;
    const cropsUsed = item.kind === "consumable" ? consumeProduce(state, PET_FOOD_PRODUCE_COST) : [];
    if (item.kind === "consumable") state.petGarden.food += 5;
    else state.petGarden.facilities[id] += 1;
    return {
      ok: true,
      item,
      cost,
      cropsUsed,
      level: item.kind === "consumable" ? state.petGarden.food : state.petGarden.facilities[id]
    };
  }

  function interactPet(state, action, now = Date.now()) {
    syncPetGarden(state, now);
    const garden = state.petGarden;
    const type = petType(garden.selectedPet);
    const pet = garden.pets[garden.selectedPet];
    if (!type || !pet?.owned) return { ok: false, reason: "先领养一只宠物吧" };
    if (action === "feed") {
      if (garden.food < 1) return { ok: false, reason: "宠物粮不够" };
      if (pet.hunger >= 98) return { ok: false, reason: "它现在吃得很饱" };
      garden.food -= 1;
      pet.hunger = Math.min(100, pet.hunger + 34);
    } else if (action === "pet") {
      pet.happiness = Math.min(100, pet.happiness + 16 + (garden.facilities.picnic || 0) * 4);
    } else if (action === "play") {
      pet.happiness = Math.min(100, pet.happiness + 22 + (garden.facilities.toyBox || 0) * 7);
      pet.hunger = Math.max(0, pet.hunger - 4);
    } else if (action === "bathe") {
      if (!garden.facilities.pond) return { ok: false, reason: "先修建浅水嬉戏池" };
      pet.cleanliness = Math.min(100, pet.cleanliness + 48);
      pet.happiness = Math.min(100, pet.happiness + 4);
    } else if (action === "groom") {
      if (!garden.facilities.grooming) return { ok: false, reason: "先购买宠物护理台" };
      pet.cleanliness = Math.min(100, pet.cleanliness + 30);
      pet.happiness = Math.min(100, pet.happiness + 10);
    } else {
      return { ok: false, reason: "未知互动" };
    }
    return { ok: true, action, pet: type, mood: petMood(pet) };
  }

  function claimPetIncome(state, now = Date.now()) {
    syncPetGarden(state, now);
    const amount = Math.floor(state.petGarden.visitorCoins);
    if (amount < 1) return { ok: false, reason: "访客收益还在积累" };
    state.petGarden.visitorCoins = 0;
    state.coins += amount;
    state.totalEarned += amount;
    const compost = Math.floor(amount / 120);
    state.compost += compost;
    return { ok: true, amount, compost };
  }

  function claimMiniMilestone(state, type) {
    const rewardLevel = state.research.mini || 0;
    let reward;
    if (type === "link") {
      const amount = 2 + Math.floor(rewardLevel / 2);
      state.seedTickets += amount;
      state.stats.linkRounds += 1;
      reward = { resource: "seedTickets", amount };
    } else if (type === "match3") {
      const amount = 1 + Math.floor(rewardLevel / 3);
      state.orderSeals += amount;
      state.stats.match3Rounds += 1;
      reward = { resource: "orderSeals", amount };
    } else {
      return { ok: false, reason: "未知小游戏" };
    }
    state.miniGiftProgress += 1;
    let bonus = null;
    if (state.miniGiftProgress >= 3) {
      state.miniGiftProgress = 0;
      state.miniGiftCount += 1;
      const giftType = (state.miniGiftCount - 1) % 3;
      if (giftType === 0) {
        const amount = 45 + state.level * 8;
        state.coins += amount;
        state.totalEarned += amount;
        bonus = { type: "coins", amount };
      } else if (giftType === 1) {
        state.sun += 2;
        bonus = { type: "sun", amount: 2 };
      } else {
        state.seedTickets += 1;
        state.compost += 1;
        state.orderSeals += 1;
        bonus = { type: "supplies", amount: 1 };
      }
    }
    return { ok: true, reward, bonus, festival: null };
  }

  function advanceFestival(state, type, amount = 1) {
    if (!["link", "match3"].includes(type)) {
      return { ok: false, reason: "未知庆典项目" };
    }
    const goal = Math.max(1, state.festivalGoals[type]);
    if (state.festival[type]) {
      return { ok: true, completed: false, progress: goal, goal, festival: null };
    }
    state.festivalProgress[type] = Math.min(
      goal,
      state.festivalProgress[type] + Math.max(0, Math.floor(amount))
    );
    const completed = state.festivalProgress[type] >= goal;
    if (completed) state.festival[type] = true;

    let festival = null;
    if (state.festival.link && state.festival.match3) {
      const coins = 140 + state.level * 25 + state.festivalCount * 15;
      state.festivalCount += 1;
      state.stars += 1;
      state.coins += coins;
      state.festival = { link: false, match3: false };
      state.festivalProgress = { link: 0, match3: 0 };
      state.festivalGoals = festivalGoalsForRound(state.festivalCount);
      festival = {
        coins,
        stars: 1,
        count: state.festivalCount,
        nextGoals: { ...state.festivalGoals }
      };
    }
    return {
      ok: true,
      completed,
      progress: completed ? goal : state.festivalProgress[type],
      goal,
      festival
    };
  }

  function mergeRewardForScore(score) {
    const safeScore = Math.max(0, Math.floor(Number(score) || 0));
    let tier = MERGE_REWARD_TIERS[0];
    for (const candidate of MERGE_REWARD_TIERS) {
      if (safeScore < candidate.minimum) break;
      tier = candidate;
    }
    return { ...tier };
  }

  function claimMergeScoreReward(state, score) {
    const reward = mergeRewardForScore(score);
    state.coins += reward.coins;
    state.totalEarned += reward.coins;
    state.orderSeals += reward.orderSeals;
    state.sun += reward.sun;
    state.stats.match3Rounds += 1;
    const festivalResult = advanceFestival(state, "match3", reward.festival);
    return {
      ok: true,
      reward,
      festival: festivalResult.festival,
      festivalCompleted: festivalResult.completed
    };
  }

  function completeMiniGame(state, type) {
    const result = claimMiniMilestone(state, type);
    if (!result.ok) return result;
    const festivalResult = advanceFestival(state, type, state.festivalGoals[type]);
    return { ...result, festival: festivalResult.festival };
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
    PET_GARDEN_COST,
    PET_TYPES,
    PET_FACILITIES,
    RESEARCH,
    FERTILIZER_COIN_COST,
    PET_FOOD_PRODUCE_COST,
    FESTIVAL_GOAL_PATTERNS,
    MERGE_REWARD_TIERS,
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
    petType,
    petFacility,
    petFacilityCost,
    petMood,
    availableProduce,
    syncPetGarden,
    unlockPetGarden,
    buyPet,
    buyPetFacility,
    interactPet,
    claimPetIncome,
    claimMiniMilestone,
    advanceFestival,
    mergeRewardForScore,
    claimMergeScoreReward,
    completeMiniGame,
    spendSun,
    formatDuration
  };
});
