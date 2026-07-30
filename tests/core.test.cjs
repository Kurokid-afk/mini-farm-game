const assert = require("node:assert/strict");
const Core = require("../game-core.js");

function testFarmLoop() {
  const now = 1_000_000;
  const state = Core.createDefaultState(now);
  assert.equal(Core.plant(state, 0, "radish", now).ok, true);
  assert.equal(Core.water(state, 0, now + 1000).ok, true);
  assert.equal(Core.fertilize(state, 0, now + 2000).ok, true);
  const harvest = Core.harvest(state, 0, state.plots[0].crop.finishAt + 1);
  assert.equal(harvest.ok, true);
  assert.ok(harvest.quality > 1.2);
  assert.equal(state.produce.radish, 1);
  assert.ok(state.sun > 3);
  const sold = Core.sellAll(state);
  assert.equal(sold.ok, true);
  assert.ok(sold.value >= Core.cropById("radish").sellPrice);
}

function testOrderEconomy() {
  for (let level = 1; level <= 8; level += 1) {
    for (let serial = 0; serial < 30; serial += 1) {
      const order = Core.createOrder(level, serial);
      assert.ok(order.coins >= Math.ceil(order.estimatedCost * 1.9));
      assert.ok(order.coins >= Math.ceil(Core.maxOrderCost(level + 1) * 1.15));
    }
  }
  const state = Core.createDefaultState();
  const order = state.orders[0];
  state.produce[order.cropId] = order.amount;
  state.qualityStock[order.cropId] = order.amount;
  state.orderSeals = 1;
  const delivered = Core.deliverOrder(state, order.id);
  assert.equal(delivered.ok, true);
  assert.equal(delivered.sealUsed, true);
  assert.ok(delivered.coins > order.coins);
}

function testLinkedRewardsAndFestival() {
  const state = Core.createDefaultState();
  const before = {
    tickets: state.seedTickets,
    seals: state.orderSeals,
    coins: state.coins
  };
  const linkReward = Core.claimMiniMilestone(state, "link");
  const matchReward = Core.claimMiniMilestone(state, "match3");
  assert.equal(linkReward.ok, true);
  assert.equal(matchReward.ok, true);
  assert.ok(state.seedTickets > before.tickets);
  assert.ok(state.orderSeals > before.seals);
  assert.equal(state.miniGiftProgress, 2);

  const firstGoals = { ...state.festivalGoals };
  assert.equal(Core.advanceFestival(state, "link", firstGoals.link).completed, true);
  const firstFestival = Core.advanceFestival(state, "match3", firstGoals.match3).festival;
  assert.equal(firstFestival.stars, 1);
  assert.equal(state.stars, 1);
  assert.ok(state.coins > before.coins);
  assert.deepEqual(state.festival, { link: false, match3: false });
  assert.notDeepEqual(state.festivalGoals, firstGoals);

  const secondGoals = { ...state.festivalGoals };
  Core.advanceFestival(state, "link", secondGoals.link);
  const secondFestival = Core.advanceFestival(state, "match3", secondGoals.match3).festival;
  assert.equal(secondFestival.count, 2);
  assert.equal(state.stars, 2);
  assert.equal(state.festivalCount, 2);
  assert.ok(Math.max(...Object.values(secondGoals)) / Math.max(...Object.values(firstGoals)) < 1.2);
}

function testMergeScoreRewards() {
  assert.deepEqual(Core.mergeRewardForScore(0), {
    minimum: 0,
    coins: 20,
    orderSeals: 0,
    sun: 0,
    festival: 1
  });
  assert.equal(Core.mergeRewardForScore(399).coins, 20);
  assert.equal(Core.mergeRewardForScore(400).orderSeals, 1);
  assert.equal(Core.mergeRewardForScore(3000).sun, 1);
  assert.equal(Core.mergeRewardForScore(15000).orderSeals, 6);

  const state = Core.createDefaultState();
  const before = {
    coins: state.coins,
    seals: state.orderSeals,
    sun: state.sun,
    festival: state.festivalProgress.match3
  };
  const result = Core.claimMergeScoreReward(state, 3200);
  assert.equal(result.ok, true);
  assert.equal(state.coins - before.coins, 180);
  assert.equal(state.orderSeals - before.seals, 3);
  assert.equal(state.sun - before.sun, 1);
  assert.equal(state.festivalProgress.match3 - before.festival, 6);
}

function testLinkOrphanRepair() {
  const single = Array.from({ length: 5 }, () => Array(8).fill(null));
  single[2][3] = 4;
  const repairedSingle = Core.repairPairedBoard(single, 10);
  assert.equal(repairedSingle.repaired, true);
  assert.equal(repairedSingle.added, 1);
  assert.equal(repairedSingle.removed, 0);
  assert.equal(repairedSingle.remaining, 2);
  assert.equal(repairedSingle.board.flat().filter((value) => value === 4).length, 2);

  const full = Array.from({ length: 5 }, () => Array(8).fill(1));
  full[0][0] = 0;
  const repairedFull = Core.repairPairedBoard(full, 10);
  assert.equal(repairedFull.repaired, true);
  assert.equal(repairedFull.added, 0);
  assert.equal(repairedFull.removed, 2);
  assert.equal(repairedFull.remaining, 38);
  for (let value = 0; value < 10; value += 1) {
    const count = repairedFull.board.flat().filter((cell) => cell === value).length;
    assert.equal(count % 2, 0);
  }

  const valid = Array.from({ length: 5 }, () => Array(8).fill(null));
  valid[0][0] = 2;
  valid[0][1] = 2;
  const untouched = Core.repairPairedBoard(valid, 10);
  assert.equal(untouched.repaired, false);
  assert.deepEqual(untouched.board, valid);
}

function testBalancedCropDurations() {
  assert.deepEqual(Core.CROPS.map((crop) => crop.duration / 60_000), [2, 4, 7, 12, 20, 30]);
}

function testPerPlotAutomationAndSoil() {
  const now = 2_000_000;
  const state = Core.createDefaultState(now);
  state.coins = 10_000;
  assert.equal(Core.buyShopItem(state, "sprinkler").ok, true);
  assert.equal(Core.buyShopItem(state, "harvester").ok, true);
  assert.equal(Core.toggleAutomation(state, "sprinkler", 1).action, "placed");
  assert.equal(Core.toggleAutomation(state, "harvester", 1).action, "placed");
  state.seeds.radish = 3;
  Core.plant(state, 0, "radish", now);
  Core.plant(state, 1, "radish", now);
  assert.equal(state.plots[0].crop.watered, false);
  assert.equal(state.plots[1].crop.watered, true);
  state.plots[1].crop.finishAt = now;
  state.automationEnabled.harvester = false;
  const paused = Core.runAutomation(state, now + 60_000, true);
  assert.equal(paused.ok, false);
  assert.equal(paused.reason, "自动收菜已暂停");
  state.automationEnabled.harvester = true;
  const harvested = Core.runAutomation(state, now + 60_000, true);
  assert.equal(harvested.plots, 1);
  assert.ok(state.plots[0].crop);
  assert.equal(state.plots[1].crop, null);
  assert.equal(Core.buyShopItem(state, "soilKit").ok, true);
  assert.equal(Core.applySoilKit(state, 2).soil, 1);
}

function testOfflineSaveMigration() {
  const now = 3_000_000;
  const state = Core.createDefaultState(now);
  Core.plant(state, 0, "cabbage", now);
  const loaded = Core.normalizeState(JSON.parse(JSON.stringify(state)), now + 600_000);
  assert.equal(Core.cropProgress(loaded.plots[0], now + 600_000), 1);
  assert.equal(Core.harvest(loaded, 0, now + 600_000).ok, true);
}

function testPetGardenLoop() {
  const now = 4_000_000;
  const state = Core.createDefaultState(now);
  state.coins = 20_000;
  assert.equal(Core.unlockPetGarden(state, now).ok, true);
  assert.equal(Core.buyPet(state, "dog", now).ok, true);
  assert.equal(Core.buyPetFacility(state, "kennel", now).ok, true);
  assert.equal(Core.buyPetFacility(state, "pond", now).ok, true);
  assert.equal(Core.buyPetFacility(state, "autoFeeder", now).ok, true);
  state.produce.radish = 4;
  state.qualityStock.radish = 4;
  assert.equal(Core.buyPetFacility(state, "food", now).ok, true);
  assert.equal(state.produce.radish, 2);
  state.petGarden.pets.dog.hunger = 50;
  const foodBefore = state.petGarden.food;
  const offline = Core.syncPetGarden(state, now + 10 * 60_000);
  assert.ok(offline.income > 0);
  assert.ok(offline.autoFeeds > 0);
  assert.ok(state.petGarden.food < foodBefore);
  assert.equal(Core.interactPet(state, "bathe", now + 10 * 60_000).ok, true);
  const claimed = Core.claimPetIncome(state, now + 10 * 60_000);
  assert.equal(claimed.ok, true);
  assert.ok(claimed.amount > 0);
  const loaded = Core.normalizeState(JSON.parse(JSON.stringify(state)), now + 12 * 60_000);
  assert.equal(loaded.petGarden.unlocked, true);
  assert.equal(loaded.petGarden.pets.dog.owned, true);
}

function testCropRotationDepth() {
  const now = 5_000_000;
  const state = Core.createDefaultState(now);
  state.seeds.cabbage = 2;
  assert.equal(Core.plant(state, 0, "radish", now).ok, true);
  state.plots[0].crop.plantedAt = now - 2;
  state.plots[0].crop.finishAt = now - 1;
  assert.equal(Core.harvest(state, 0, now).ok, true);
  const planted = Core.plant(state, 0, "cabbage", now);
  assert.equal(planted.ok, true);
  assert.equal(state.plots[0].crop.rotationBonus, true);
  assert.equal(state.plots[0].crop.finishAt - now, Core.CROPS[1].duration * 0.9);
  state.plots[0].crop.plantedAt = now - 2;
  state.plots[0].crop.finishAt = now - 1;
  const harvested = Core.harvest(state, 0, now);
  assert.equal(harvested.rotationBonus, true);
  assert.ok(harvested.quality >= 1.08);
}

testFarmLoop();
testOrderEconomy();
testLinkedRewardsAndFestival();
testMergeScoreRewards();
testLinkOrphanRepair();
testBalancedCropDurations();
testPerPlotAutomationAndSoil();
testOfflineSaveMigration();
testPetGardenLoop();
testCropRotationDepth();
console.log("core economy, farming, pets, automation, merge score rewards, and linked rewards passed");
