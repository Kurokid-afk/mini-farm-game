const assert = require("node:assert/strict");
const Core = require("../game-core.js");

function testFarmLoop() {
  const now = 1_000_000;
  const state = Core.createDefaultState(now);
  assert.equal(Core.plant(state, 0, "radish", now).ok, true);
  assert.equal(Core.water(state, 0, now + 1000).ok, true);
  assert.equal(Core.fertilize(state, 0, now + 2000).ok, true);
  const harvest = Core.harvest(state, 0, now + 60_000);
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
    compost: state.compost,
    seals: state.orderSeals,
    coins: state.coins
  };
  assert.equal(Core.completeMiniGame(state, "link", 1000, true).ok, true);
  assert.equal(Core.completeMiniGame(state, "zuma", 1000, true).ok, true);
  const final = Core.completeMiniGame(state, "match3", 1200, true);
  assert.ok(state.seedTickets > before.tickets);
  assert.ok(state.compost > before.compost);
  assert.ok(state.orderSeals > before.seals);
  assert.equal(final.festival.stars, 1);
  assert.equal(state.stars, 1);
  assert.ok(state.coins > before.coins);
  assert.deepEqual(state.festival, { link: false, zuma: false, match3: false });
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
  const loaded = Core.normalizeState(JSON.parse(JSON.stringify(state)), now + 300_000);
  assert.equal(Core.cropProgress(loaded.plots[0], now + 300_000), 1);
  assert.equal(Core.harvest(loaded, 0, now + 300_000).ok, true);
}

testFarmLoop();
testOrderEconomy();
testLinkedRewardsAndFestival();
testPerPlotAutomationAndSoil();
testOfflineSaveMigration();
console.log("core economy, farming, automation, and linked rewards passed");
