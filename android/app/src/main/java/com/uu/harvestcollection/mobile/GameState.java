package com.uu.harvestcollection.mobile;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

import java.util.ArrayList;
import java.util.List;
import java.util.Random;

final class GameState {
    private static final String PREFS = "uu_native_farm";
    private static final String SAVE = "state_v1";

    int coins = 150;
    int level = 1;
    int xp = 0;
    int totalEarned = 0;
    int seedTickets = 2;
    int compost = 3;
    int orderSeals = 0;
    int sun = 3;
    int stars = 0;
    int unlockedPlots = 6;
    int selectedCrop = 0;
    int selectedTool = 0;
    int orderSerial = 3;
    int festivalRound = 0;
    int festivalLink = 0;
    int festivalMatch = 0;
    boolean festivalLinkDone = false;
    boolean festivalMatchDone = false;
    int miniGiftProgress = 0;
    int miniGiftCount = 0;
    int linkRewardPairs = 0;
    int matchRewardPieces = 0;
    int matchTarget = 10;
    int sprinklerBought = 0;
    int harvesterBought = 0;
    boolean sprinklerEnabled = true;
    boolean harvesterEnabled = true;
    int wateringLevel = 0;
    int basketLevel = 0;
    int greenhouseLevel = 0;
    int marketLevel = 0;
    int growthResearch = 0;
    int miniResearch = 0;
    int orderResearch = 0;
    boolean petGardenUnlocked = false;
    int petFood = 2;
    int selectedPet = 0;
    float visitorCoins = 0f;
    long lastSeen = System.currentTimeMillis();
    Session session = new Session();

    final int[] seeds = new int[GameData.CROPS.length];
    final int[] produce = new int[GameData.CROPS.length];
    final int[] quality = new int[GameData.CROPS.length];
    final Plot[] plots = new Plot[GameData.PLOT_COUNT];
    final boolean[] sprinklerPlots = new boolean[GameData.PLOT_COUNT];
    final boolean[] harvesterPlots = new boolean[GameData.PLOT_COUNT];
    final List<Order> orders = new ArrayList<>();
    final boolean[] petOwned = new boolean[4];
    final float[] petHunger = {78f, 78f, 78f, 78f};
    final float[] petHappy = {74f, 74f, 74f, 74f};
    final float[] petClean = {82f, 82f, 82f, 82f};
    final int[] facilities = new int[GameData.FACILITY_NAMES.length];

    GameState() {
        seeds[0] = 4;
        seeds[1] = 3;
        for (int i = 0; i < plots.length; i++) plots[i] = new Plot();
        for (int i = 0; i < 3; i++) orders.add(createOrder());
    }

    static GameState load(Context context) {
        String saved = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).getString(SAVE, null);
        if (saved == null || saved.isEmpty()) return new GameState();
        try {
            return fromJson(new JSONObject(saved));
        } catch (Exception ignored) {
            return new GameState();
        }
    }

    void save(Context context) {
        lastSeen = System.currentTimeMillis();
        SharedPreferences.Editor editor = context.getSharedPreferences(PREFS, Context.MODE_PRIVATE).edit();
        editor.putString(SAVE, toJson().toString()).commit();
    }

    int linkGoal() {
        return GameData.FESTIVAL_GOALS[festivalRound % GameData.FESTIVAL_GOALS.length][0];
    }

    int matchGoal() {
        return GameData.FESTIVAL_GOALS[festivalRound % GameData.FESTIVAL_GOALS.length][1];
    }

    float cropProgress(int plotIndex, long now) {
        Plot plot = plots[plotIndex];
        if (plot.crop < 0) return 0f;
        return Math.max(0f, Math.min(1f, (float) (now - plot.plantedAt) / Math.max(1L, plot.finishAt - plot.plantedAt)));
    }

    Result plant(int plotIndex, long now) {
        if (plotIndex < 0 || plotIndex >= unlockedPlots) return Result.fail("土地还没解锁");
        Plot plot = plots[plotIndex];
        GameData.Crop crop = GameData.crop(selectedCrop);
        if (plot.crop >= 0) return Result.fail("这块地已经种了东西");
        if (crop.level > level) return Result.fail("农场 " + crop.level + " 级解锁");
        if (seeds[selectedCrop] < 1) return Result.fail("种子不够，可去集市购买");
        seeds[selectedCrop]--;
        boolean rotation = plot.lastCrop >= 0 && plot.lastCrop != selectedCrop;
        double speed = Math.pow(0.95, greenhouseLevel) * Math.pow(0.96, growthResearch) * (rotation ? 0.9 : 1.0);
        boolean autoWater = sprinklerEnabled && sprinklerPlots[plotIndex];
        double waterBoost = 0.15 + wateringLevel * 0.05;
        plot.crop = selectedCrop;
        plot.plantedAt = now;
        plot.finishAt = now + Math.round(crop.duration * speed * (autoWater ? 1.0 - waterBoost : 1.0));
        plot.watered = autoWater;
        plot.fertilized = false;
        plot.rotation = rotation;
        addXp(2);
        return Result.ok(autoWater ? "已播种，洒水机器人开始工作" : "已播种 " + crop.name);
    }

    Result water(int plotIndex, long now) {
        Plot plot = plots[plotIndex];
        if (plot.crop < 0) return Result.fail("空土地不用浇水");
        if (plot.watered) return Result.fail("这块地已经浇过水");
        long remaining = Math.max(0L, plot.finishAt - now);
        plot.finishAt = now + Math.round(remaining * (0.85 - wateringLevel * 0.05));
        plot.watered = true;
        return Result.ok("浇水完成，成长加快");
    }

    Result fertilize(int plotIndex, long now) {
        Plot plot = plots[plotIndex];
        if (plot.crop < 0) return Result.fail("先播种再施肥");
        if (plot.fertilized) return Result.fail("这块地已经施肥");
        if (compost < 1 && coins < 4) return Result.fail("堆肥和金币都不够");
        if (compost > 0) compost--; else coins -= 4;
        long remaining = Math.max(0L, plot.finishAt - now);
        plot.finishAt = now + Math.round(remaining * 0.78);
        plot.fertilized = true;
        return Result.ok("施肥完成，品质与速度提高");
    }

    Result harvest(int plotIndex, long now, boolean automatic) {
        Plot plot = plots[plotIndex];
        if (plot.crop < 0) return Result.fail("这里还没有作物");
        if (cropProgress(plotIndex, now) < 1f) return Result.fail("作物还没有成熟");
        int cropIndex = plot.crop;
        GameData.Crop crop = GameData.crop(cropIndex);
        int amount = crop.yield + basketLevel;
        if (plot.fertilized || plot.rotation) quality[cropIndex]++;
        produce[cropIndex] += amount;
        sun++;
        plot.lastCrop = cropIndex;
        plot.clearCrop();
        addXp(5 + crop.level * 2);
        return Result.ok((automatic ? "机器人收获 " : "收获 ") + crop.name + " ×" + amount);
    }

    Result buySeeds(int cropIndex) {
        GameData.Crop crop = GameData.crop(cropIndex);
        if (crop.level > level) return Result.fail("农场 " + crop.level + " 级解锁");
        int cost = crop.seedPrice * 3;
        if (coins < cost) return Result.fail("金币不足");
        coins -= cost;
        seeds[cropIndex] += 3;
        return Result.ok(crop.name + "种子 +3");
    }

    Result sellAll() {
        int count = 0;
        int value = 0;
        double multiplier = 1.0 + marketLevel * 0.06;
        for (int i = 0; i < produce.length; i++) {
            count += produce[i];
            value += Math.round(produce[i] * GameData.crop(i).sellPrice * multiplier);
            value += Math.round(quality[i] * GameData.crop(i).sellPrice * 0.5f);
            produce[i] = 0;
            quality[i] = 0;
        }
        if (count == 0) return Result.fail("仓库里还没有蔬菜");
        coins += value;
        totalEarned += value;
        return Result.ok("出售 " + count + " 份蔬菜，收入 ￥" + value);
    }

    Result deliverOrder(int index) {
        if (index < 0 || index >= orders.size()) return Result.fail("订单不存在");
        Order order = orders.get(index);
        if (produce[order.crop] < order.amount) return Result.fail("仓库数量不足");
        produce[order.crop] -= order.amount;
        int reward = order.coins;
        if (orderSeals > 0) {
            orderSeals--;
            reward = Math.round(reward * 1.25f);
        }
        reward = Math.round(reward * (1f + orderResearch * 0.06f));
        coins += reward;
        totalEarned += reward;
        addXp(order.xp);
        orders.set(index, createOrder());
        return Result.ok("订单交付，收入 ￥" + reward);
    }

    Result exchangeTicket() {
        if (seedTickets < 1) return Result.fail("种子券不足");
        seedTickets--;
        int max = 1;
        for (int i = 0; i < GameData.CROPS.length; i++) if (GameData.CROPS[i].level <= level) max = i + 1;
        int crop = Math.abs(orderSerial * 3 + level) % max;
        seeds[crop] += 3;
        return Result.ok("兑换 " + GameData.crop(crop).name + "种子 ×3");
    }

    Result unlockLand() {
        if (unlockedPlots >= GameData.PLOT_COUNT) return Result.fail("土地已经全部解锁");
        int cost = GameData.LAND_COSTS[unlockedPlots - 6];
        if (coins < cost) return Result.fail("金币不足");
        coins -= cost;
        unlockedPlots++;
        return Result.ok("新土地已解锁");
    }

    Result buyAutomation(boolean sprinkler) {
        int count = sprinkler ? sprinklerBought : harvesterBought;
        int[] costs = sprinkler ? GameData.SPRINKLER_COSTS : GameData.HARVESTER_COSTS;
        if (count >= costs.length) return Result.fail("设备已达到上限");
        if (coins < costs[count]) return Result.fail("金币不足");
        coins -= costs[count];
        if (sprinkler) sprinklerBought++; else harvesterBought++;
        return Result.ok(sprinkler ? "购买自动洒水器，可选择一块土地布置" : "购买收菜机器人，可选择一块土地布置");
    }

    Result assignAutomation(boolean sprinkler, int plotIndex) {
        if (plotIndex < 0 || plotIndex >= unlockedPlots) return Result.fail("只能布置在已解锁土地");
        boolean[] slots = sprinkler ? sprinklerPlots : harvesterPlots;
        int bought = sprinkler ? sprinklerBought : harvesterBought;
        int used = count(slots);
        if (slots[plotIndex]) {
            slots[plotIndex] = false;
            return Result.ok("设备已从这块土地收回");
        }
        if (used >= bought) return Result.fail("没有空闲设备，请先购买或收回");
        slots[plotIndex] = true;
        return Result.ok(sprinkler ? "洒水器已布置" : "收菜机器人已布置");
    }

    Result buyUpgrade(int type) {
        int current;
        int max;
        int base;
        String name;
        if (type == 0) { current = wateringLevel; max = 4; base = 140; name = "精致水壶"; }
        else if (type == 1) { current = basketLevel; max = 3; base = 240; name = "丰收菜篮"; }
        else if (type == 2) { current = greenhouseLevel; max = 5; base = 300; name = "玻璃温室"; }
        else { current = marketLevel; max = 5; base = 260; name = "集市摊位"; }
        if (current >= max) return Result.fail("已经升到满级");
        int cost = Math.round(base * (float) Math.pow(1.8, current));
        if (coins < cost) return Result.fail("金币不足");
        coins -= cost;
        if (type == 0) wateringLevel++;
        else if (type == 1) basketLevel++;
        else if (type == 2) greenhouseLevel++;
        else marketLevel++;
        return Result.ok(name + "升级完成");
    }

    Result buyResearch(int type) {
        int current = type == 0 ? growthResearch : type == 1 ? miniResearch : orderResearch;
        if (current >= 5) return Result.fail("研究已经满级");
        int cost = current + 1;
        if (stars < cost) return Result.fail("丰收星不足");
        stars -= cost;
        if (type == 0) growthResearch++;
        else if (type == 1) miniResearch++;
        else orderResearch++;
        return Result.ok("永久研究升级完成");
    }

    Result unlockPetGarden() {
        if (petGardenUnlocked) return Result.fail("宠物园已经开放");
        if (coins < 520) return Result.fail("需要 ￥520 才能修建宠物园");
        coins -= 520;
        petGardenUnlocked = true;
        return Result.ok("暖阳宠物园开放了");
    }

    Result adoptPet(int pet) {
        if (!petGardenUnlocked) return Result.fail("先修建宠物园");
        if (petOwned[pet]) {
            selectedPet = pet;
            return Result.ok("已切换到" + GameData.PET_NAMES[pet]);
        }
        if (level < pet + 1) return Result.fail("农场 " + (pet + 1) + " 级解锁");
        if (coins < GameData.PET_COSTS[pet]) return Result.fail("金币不足");
        coins -= GameData.PET_COSTS[pet];
        petOwned[pet] = true;
        selectedPet = pet;
        return Result.ok("领养了" + GameData.PET_NAMES[pet]);
    }

    Result makePetFood() {
        if (coins < 15) return Result.fail("加工需要 ￥15");
        if (produceCount() < 2) return Result.fail("需要仓库里的 2 份蔬菜");
        int needed = 2;
        for (int i = 0; i < produce.length && needed > 0; i++) {
            int use = Math.min(needed, produce[i]);
            produce[i] -= use;
            needed -= use;
        }
        coins -= 15;
        petFood += 5;
        return Result.ok("加工宠物粮 ×5");
    }

    Result interactPet(int action) {
        if (!petOwned[selectedPet]) return Result.fail("先领养一只宠物");
        if (action == 0) {
            if (petFood < 1) return Result.fail("宠物粮不足");
            if (petHunger[selectedPet] >= 98f) return Result.fail("它现在吃得很饱");
            petFood--;
            petHunger[selectedPet] = Math.min(100f, petHunger[selectedPet] + 34f);
        } else if (action == 1) {
            petHappy[selectedPet] = Math.min(100f, petHappy[selectedPet] + 16f + facilities[7] * 4f);
        } else if (action == 2) {
            petHappy[selectedPet] = Math.min(100f, petHappy[selectedPet] + 22f + facilities[3] * 7f);
            petHunger[selectedPet] = Math.max(0f, petHunger[selectedPet] - 4f);
        } else if (action == 3) {
            if (facilities[1] < 1) return Result.fail("先修建浅水嬉戏池");
            petClean[selectedPet] = Math.min(100f, petClean[selectedPet] + 48f);
        } else {
            if (facilities[4] < 1) return Result.fail("先购买宠物护理台");
            petClean[selectedPet] = Math.min(100f, petClean[selectedPet] + 30f);
            petHappy[selectedPet] = Math.min(100f, petHappy[selectedPet] + 10f);
        }
        return Result.ok(new String[]{"喂食", "抚摸", "玩耍", "洗澡", "梳毛"}[action] + "完成");
    }

    Result buyFacility(int index) {
        int levelNow = facilities[index];
        int[] costs = GameData.FACILITY_COSTS[index];
        if (levelNow >= costs.length) return Result.fail("已经升到满级");
        int cost = costs[levelNow];
        if (coins < cost) return Result.fail("金币不足");
        coins -= cost;
        facilities[index]++;
        return Result.ok(GameData.FACILITY_NAMES[index] + "建设完成");
    }

    Result claimVisitorCoins() {
        int amount = (int) visitorCoins;
        if (amount < 1) return Result.fail("访客收益还在积累");
        visitorCoins -= amount;
        coins += amount;
        totalEarned += amount;
        int compostGain = amount / 120;
        compost += compostGain;
        return Result.ok("领取 ￥" + amount + (compostGain > 0 ? "，回收堆肥 +" + compostGain : ""));
    }

    void tick(long now) {
        long elapsed = Math.max(0L, Math.min(12L * 60L * 60L * 1000L, now - lastSeen));
        if (elapsed > 0L && petGardenUnlocked) updatePets(elapsed);
        if (sprinklerEnabled) {
            for (int i = 0; i < unlockedPlots; i++) {
                if (sprinklerPlots[i] && plots[i].crop >= 0 && !plots[i].watered) water(i, now);
            }
        }
        if (harvesterEnabled) {
            for (int i = 0; i < unlockedPlots; i++) {
                if (harvesterPlots[i] && plots[i].crop >= 0 && cropProgress(i, now) >= 1f) harvest(i, now, true);
            }
        }
        lastSeen = now;
    }

    void awardLinkPair() {
        festivalLink = Math.min(linkGoal(), festivalLink + 1);
        festivalLinkDone = festivalLink >= linkGoal();
        linkRewardPairs++;
        if (linkRewardPairs >= 8) {
            linkRewardPairs -= 8;
            seedTickets += 2 + miniResearch / 2;
            awardMiniGift();
        }
        finishFestivalIfReady();
    }

    void awardMatchPieces(int count) {
        festivalMatch = Math.min(matchGoal(), festivalMatch + count);
        festivalMatchDone = festivalMatch >= matchGoal();
        matchRewardPieces += count;
        while (matchRewardPieces >= matchTarget) {
            matchRewardPieces -= matchTarget;
            orderSeals += 1 + miniResearch / 3;
            matchTarget = new int[]{10, 11, 12, 10}[(festivalRound + miniGiftCount) % 4];
            awardMiniGift();
        }
        finishFestivalIfReady();
    }

    private void awardMiniGift() {
        miniGiftProgress++;
        if (miniGiftProgress < 3) return;
        miniGiftProgress = 0;
        int kind = miniGiftCount++ % 3;
        if (kind == 0) {
            int amount = 45 + level * 8;
            coins += amount;
            totalEarned += amount;
        } else if (kind == 1) {
            sun += 2;
        } else {
            seedTickets++;
            compost++;
            orderSeals++;
        }
    }

    private void finishFestivalIfReady() {
        if (!festivalLinkDone || !festivalMatchDone) return;
        int reward = 140 + level * 25 + festivalRound * 15;
        coins += reward;
        totalEarned += reward;
        stars++;
        festivalRound++;
        festivalLink = 0;
        festivalMatch = 0;
        festivalLinkDone = false;
        festivalMatchDone = false;
    }

    private void updatePets(long elapsed) {
        float seconds = elapsed / 1000f;
        int owned = 0;
        float rate = 0f;
        for (int i = 0; i < petOwned.length; i++) {
            if (!petOwned[i]) continue;
            owned++;
            petHunger[i] = Math.max(0f, petHunger[i] - seconds / (1300f + facilities[0] * 260f));
            petHappy[i] = Math.max(0f, petHappy[i] - seconds / (1700f + facilities[6] * 300f));
            petClean[i] = Math.max(0f, petClean[i] - seconds / 2200f);
            if (facilities[2] > 0 && petHunger[i] < 35f && petFood > 0) {
                petFood--;
                petHunger[i] = Math.min(100f, petHunger[i] + 34f);
            }
            float condition = (petHunger[i] + petHappy[i] + petClean[i]) / 300f;
            rate += GameData.PET_INCOME[i] * (0.45f + condition * 0.55f);
        }
        if (owned > 0) {
            float facilityBonus = 1f + facilities[0] * 0.05f + facilities[5] * 0.06f + facilities[6] * 0.04f;
            visitorCoins += seconds * rate * facilityBonus / 60f;
        }
    }

    private void addXp(int amount) {
        xp += Math.max(0, amount);
        while (xp >= GameData.xpNeeded(level)) {
            xp -= GameData.xpNeeded(level);
            level++;
        }
    }

    private int produceCount() {
        int count = 0;
        for (int value : produce) count += value;
        return count;
    }

    private Order createOrder() {
        int maxCrop = 1;
        for (int i = 0; i < GameData.CROPS.length; i++) if (GameData.CROPS[i].level <= level) maxCrop = i + 1;
        int cropIndex = Math.abs(orderSerial * 5 + level * 3) % maxCrop;
        int amount = 3 + Math.abs(orderSerial + level) % 5;
        GameData.Crop crop = GameData.crop(cropIndex);
        int estimatedCost = (int) Math.ceil((double) amount / crop.yield) * crop.seedPrice;
        int reserve = 0;
        for (GameData.Crop candidate : GameData.CROPS) {
            if (candidate.level <= level + 1) reserve = Math.max(reserve, (int) Math.ceil(7d / candidate.yield) * candidate.seedPrice);
        }
        int reward = Math.max(Math.round(estimatedCost * 1.9f), Math.max(Math.round(crop.sellPrice * amount * 1.45f), Math.round(reserve * 1.15f)));
        return new Order(orderSerial++, cropIndex, amount, reward, 10 + crop.level * 4 + amount);
    }

    private static int count(boolean[] values) {
        int count = 0;
        for (boolean value : values) if (value) count++;
        return count;
    }

    private JSONObject toJson() {
        JSONObject root = new JSONObject();
        try {
            root.put("coins", coins);
            root.put("level", level);
            root.put("xp", xp);
            root.put("totalEarned", totalEarned);
            root.put("seedTickets", seedTickets);
            root.put("compost", compost);
            root.put("orderSeals", orderSeals);
            root.put("sun", sun);
            root.put("stars", stars);
            root.put("unlockedPlots", unlockedPlots);
            root.put("selectedCrop", selectedCrop);
            root.put("selectedTool", selectedTool);
            root.put("orderSerial", orderSerial);
            root.put("festivalRound", festivalRound);
            root.put("festivalLink", festivalLink);
            root.put("festivalMatch", festivalMatch);
            root.put("festivalLinkDone", festivalLinkDone);
            root.put("festivalMatchDone", festivalMatchDone);
            root.put("miniGiftProgress", miniGiftProgress);
            root.put("miniGiftCount", miniGiftCount);
            root.put("linkRewardPairs", linkRewardPairs);
            root.put("matchRewardPieces", matchRewardPieces);
            root.put("matchTarget", matchTarget);
            root.put("sprinklerBought", sprinklerBought);
            root.put("harvesterBought", harvesterBought);
            root.put("sprinklerEnabled", sprinklerEnabled);
            root.put("harvesterEnabled", harvesterEnabled);
            root.put("wateringLevel", wateringLevel);
            root.put("basketLevel", basketLevel);
            root.put("greenhouseLevel", greenhouseLevel);
            root.put("marketLevel", marketLevel);
            root.put("growthResearch", growthResearch);
            root.put("miniResearch", miniResearch);
            root.put("orderResearch", orderResearch);
            root.put("petGardenUnlocked", petGardenUnlocked);
            root.put("petFood", petFood);
            root.put("selectedPet", selectedPet);
            root.put("visitorCoins", visitorCoins);
            root.put("lastSeen", lastSeen);
            root.put("session", session.toJson());
            root.put("seeds", intArray(seeds));
            root.put("produce", intArray(produce));
            root.put("quality", intArray(quality));
            root.put("sprinklerPlots", boolArray(sprinklerPlots));
            root.put("harvesterPlots", boolArray(harvesterPlots));
            root.put("petOwned", boolArray(petOwned));
            root.put("petHunger", floatArray(petHunger));
            root.put("petHappy", floatArray(petHappy));
            root.put("petClean", floatArray(petClean));
            root.put("facilities", intArray(facilities));
            JSONArray plotArray = new JSONArray();
            for (Plot plot : plots) plotArray.put(plot.toJson());
            root.put("plots", plotArray);
            JSONArray orderArray = new JSONArray();
            for (Order order : orders) orderArray.put(order.toJson());
            root.put("orders", orderArray);
        } catch (JSONException ignored) {
        }
        return root;
    }

    private static GameState fromJson(JSONObject root) throws JSONException {
        GameState state = new GameState();
        state.coins = root.optInt("coins", state.coins);
        state.level = Math.max(1, root.optInt("level", 1));
        state.xp = Math.max(0, root.optInt("xp", 0));
        state.totalEarned = Math.max(0, root.optInt("totalEarned", 0));
        state.seedTickets = Math.max(0, root.optInt("seedTickets", 2));
        state.compost = Math.max(0, root.optInt("compost", 3));
        state.orderSeals = Math.max(0, root.optInt("orderSeals", 0));
        state.sun = Math.max(0, root.optInt("sun", 3));
        state.stars = Math.max(0, root.optInt("stars", 0));
        state.unlockedPlots = Math.max(6, Math.min(GameData.PLOT_COUNT, root.optInt("unlockedPlots", 6)));
        state.selectedCrop = Math.max(0, Math.min(GameData.CROPS.length - 1, root.optInt("selectedCrop", 0)));
        state.selectedTool = Math.max(0, Math.min(4, root.optInt("selectedTool", 0)));
        state.orderSerial = Math.max(3, root.optInt("orderSerial", 3));
        state.festivalRound = Math.max(0, root.optInt("festivalRound", 0));
        state.festivalLink = Math.max(0, root.optInt("festivalLink", 0));
        state.festivalMatch = Math.max(0, root.optInt("festivalMatch", 0));
        state.festivalLinkDone = root.optBoolean("festivalLinkDone", false);
        state.festivalMatchDone = root.optBoolean("festivalMatchDone", false);
        state.miniGiftProgress = Math.max(0, root.optInt("miniGiftProgress", 0)) % 3;
        state.miniGiftCount = Math.max(0, root.optInt("miniGiftCount", 0));
        state.linkRewardPairs = Math.max(0, root.optInt("linkRewardPairs", 0)) % 8;
        state.matchRewardPieces = Math.max(0, root.optInt("matchRewardPieces", 0));
        state.matchTarget = Math.max(8, root.optInt("matchTarget", 10));
        state.sprinklerBought = Math.max(0, Math.min(12, root.optInt("sprinklerBought", 0)));
        state.harvesterBought = Math.max(0, Math.min(12, root.optInt("harvesterBought", 0)));
        state.sprinklerEnabled = root.optBoolean("sprinklerEnabled", true);
        state.harvesterEnabled = root.optBoolean("harvesterEnabled", true);
        state.wateringLevel = Math.max(0, Math.min(4, root.optInt("wateringLevel", 0)));
        state.basketLevel = Math.max(0, Math.min(3, root.optInt("basketLevel", 0)));
        state.greenhouseLevel = Math.max(0, Math.min(5, root.optInt("greenhouseLevel", 0)));
        state.marketLevel = Math.max(0, Math.min(5, root.optInt("marketLevel", 0)));
        state.growthResearch = Math.max(0, Math.min(5, root.optInt("growthResearch", 0)));
        state.miniResearch = Math.max(0, Math.min(5, root.optInt("miniResearch", 0)));
        state.orderResearch = Math.max(0, Math.min(5, root.optInt("orderResearch", 0)));
        state.petGardenUnlocked = root.optBoolean("petGardenUnlocked", false);
        state.petFood = Math.max(0, root.optInt("petFood", 2));
        state.selectedPet = Math.max(0, Math.min(3, root.optInt("selectedPet", 0)));
        state.visitorCoins = Math.max(0f, (float) root.optDouble("visitorCoins", 0d));
        state.lastSeen = root.optLong("lastSeen", System.currentTimeMillis());
        state.session = Session.fromJson(root.optJSONObject("session"));
        readInts(root.optJSONArray("seeds"), state.seeds);
        readInts(root.optJSONArray("produce"), state.produce);
        readInts(root.optJSONArray("quality"), state.quality);
        readBools(root.optJSONArray("sprinklerPlots"), state.sprinklerPlots);
        readBools(root.optJSONArray("harvesterPlots"), state.harvesterPlots);
        readBools(root.optJSONArray("petOwned"), state.petOwned);
        readFloats(root.optJSONArray("petHunger"), state.petHunger);
        readFloats(root.optJSONArray("petHappy"), state.petHappy);
        readFloats(root.optJSONArray("petClean"), state.petClean);
        readInts(root.optJSONArray("facilities"), state.facilities);
        JSONArray plotArray = root.optJSONArray("plots");
        if (plotArray != null) {
            for (int i = 0; i < Math.min(plotArray.length(), state.plots.length); i++) {
                state.plots[i] = Plot.fromJson(plotArray.optJSONObject(i));
            }
        }
        JSONArray orderArray = root.optJSONArray("orders");
        if (orderArray != null) {
            state.orders.clear();
            for (int i = 0; i < Math.min(3, orderArray.length()); i++) {
                Order order = Order.fromJson(orderArray.optJSONObject(i));
                if (order != null) state.orders.add(order);
            }
        }
        while (state.orders.size() < 3) state.orders.add(state.createOrder());
        state.tick(System.currentTimeMillis());
        return state;
    }

    private static JSONArray intArray(int[] source) {
        JSONArray result = new JSONArray();
        for (int value : source) result.put(value);
        return result;
    }

    private static JSONArray boolArray(boolean[] source) {
        JSONArray result = new JSONArray();
        for (boolean value : source) result.put(value);
        return result;
    }

    private static JSONArray floatArray(float[] source) {
        JSONArray result = new JSONArray();
        for (float value : source) result.put(Float.valueOf(value));
        return result;
    }

    private static JSONArray intMatrix(int[][] source) {
        JSONArray result = new JSONArray();
        if (source == null) return result;
        for (int[] row : source) result.put(intArray(row));
        return result;
    }

    private static int[][] readMatrix(JSONArray source, int rows, int columns, int minimum, int maximum) {
        if (source == null || source.length() != rows) return null;
        int[][] result = new int[rows][columns];
        for (int row = 0; row < rows; row++) {
            JSONArray values = source.optJSONArray(row);
            if (values == null || values.length() != columns) return null;
            for (int column = 0; column < columns; column++) {
                int value = values.optInt(column, minimum - 1);
                if (value < minimum || value > maximum) return null;
                result[row][column] = value;
            }
        }
        return result;
    }

    private static void readInts(JSONArray source, int[] target) {
        if (source == null) return;
        for (int i = 0; i < Math.min(source.length(), target.length); i++) target[i] = Math.max(0, source.optInt(i, target[i]));
    }

    private static void readBools(JSONArray source, boolean[] target) {
        if (source == null) return;
        for (int i = 0; i < Math.min(source.length(), target.length); i++) target[i] = source.optBoolean(i, target[i]);
    }

    private static void readFloats(JSONArray source, float[] target) {
        if (source == null) return;
        for (int i = 0; i < Math.min(source.length(), target.length); i++) {
            target[i] = Math.max(0f, Math.min(100f, (float) source.optDouble(i, target[i])));
        }
    }

    static final class Session {
        int version = 1;
        int view = 0;
        int marketTab = 0;
        int petPage = 0;
        int[][] linkBoard;
        int linkSelectedRow = -1;
        int linkSelectedColumn = -1;
        int linkScore = 0;
        int linkBoards = 0;
        int linkFlow = 0;
        int[][] matchBoard;
        int matchSelectedRow = -1;
        int matchSelectedColumn = -1;
        int matchScore = 0;
        boolean mergeMode = false;
        int[][] mergeBoard;
        int mergeScore = 0;

        JSONObject toJson() throws JSONException {
            JSONObject value = new JSONObject();
            value.put("version", version);
            value.put("view", view);
            value.put("marketTab", marketTab);
            value.put("petPage", petPage);
            value.put("linkBoard", intMatrix(linkBoard));
            value.put("linkSelectedRow", linkSelectedRow);
            value.put("linkSelectedColumn", linkSelectedColumn);
            value.put("linkScore", linkScore);
            value.put("linkBoards", linkBoards);
            value.put("linkFlow", linkFlow);
            value.put("matchBoard", intMatrix(matchBoard));
            value.put("matchSelectedRow", matchSelectedRow);
            value.put("matchSelectedColumn", matchSelectedColumn);
            value.put("matchScore", matchScore);
            value.put("mergeMode", mergeMode);
            value.put("mergeBoard", intMatrix(mergeBoard));
            value.put("mergeScore", mergeScore);
            return value;
        }

        static Session fromJson(JSONObject source) {
            Session session = new Session();
            if (source == null || source.optInt("version", 0) != 1) return session;
            session.view = Math.max(0, Math.min(4, source.optInt("view", 0)));
            session.marketTab = Math.max(0, Math.min(2, source.optInt("marketTab", 0)));
            session.petPage = Math.max(0, Math.min(2, source.optInt("petPage", 0)));
            session.linkBoard = readMatrix(source.optJSONArray("linkBoard"), 8, 6, -1, 9);
            session.linkSelectedRow = Math.max(-1, Math.min(7, source.optInt("linkSelectedRow", -1)));
            session.linkSelectedColumn = Math.max(-1, Math.min(5, source.optInt("linkSelectedColumn", -1)));
            session.linkScore = Math.max(0, source.optInt("linkScore", 0));
            session.linkBoards = Math.max(0, source.optInt("linkBoards", 0));
            session.linkFlow = Math.max(0, Math.min(3, source.optInt("linkFlow", 0)));
            session.matchBoard = readMatrix(source.optJSONArray("matchBoard"), 7, 7, 0, 7);
            session.matchSelectedRow = Math.max(-1, Math.min(6, source.optInt("matchSelectedRow", -1)));
            session.matchSelectedColumn = Math.max(-1, Math.min(6, source.optInt("matchSelectedColumn", -1)));
            session.matchScore = Math.max(0, source.optInt("matchScore", 0));
            session.mergeMode = source.optBoolean("mergeMode", false);
            session.mergeBoard = readMatrix(source.optJSONArray("mergeBoard"), 4, 4, 0, 30);
            session.mergeScore = Math.max(0, source.optInt("mergeScore", 0));
            return session;
        }
    }

    static final class Plot {
        int crop = -1;
        int lastCrop = -1;
        long plantedAt = 0L;
        long finishAt = 0L;
        boolean watered = false;
        boolean fertilized = false;
        boolean rotation = false;

        void clearCrop() {
            crop = -1;
            plantedAt = 0L;
            finishAt = 0L;
            watered = false;
            fertilized = false;
            rotation = false;
        }

        JSONObject toJson() throws JSONException {
            JSONObject value = new JSONObject();
            value.put("crop", crop);
            value.put("lastCrop", lastCrop);
            value.put("plantedAt", plantedAt);
            value.put("finishAt", finishAt);
            value.put("watered", watered);
            value.put("fertilized", fertilized);
            value.put("rotation", rotation);
            return value;
        }

        static Plot fromJson(JSONObject source) {
            Plot plot = new Plot();
            if (source == null) return plot;
            plot.crop = source.optInt("crop", -1);
            if (plot.crop < -1 || plot.crop >= GameData.CROPS.length) plot.crop = -1;
            plot.lastCrop = source.optInt("lastCrop", -1);
            plot.plantedAt = source.optLong("plantedAt", 0L);
            plot.finishAt = source.optLong("finishAt", 0L);
            plot.watered = source.optBoolean("watered", false);
            plot.fertilized = source.optBoolean("fertilized", false);
            plot.rotation = source.optBoolean("rotation", false);
            return plot;
        }
    }

    static final class Order {
        final int id;
        final int crop;
        final int amount;
        final int coins;
        final int xp;

        Order(int id, int crop, int amount, int coins, int xp) {
            this.id = id;
            this.crop = crop;
            this.amount = amount;
            this.coins = coins;
            this.xp = xp;
        }

        JSONObject toJson() throws JSONException {
            JSONObject value = new JSONObject();
            value.put("id", id);
            value.put("crop", crop);
            value.put("amount", amount);
            value.put("coins", coins);
            value.put("xp", xp);
            return value;
        }

        static Order fromJson(JSONObject source) {
            if (source == null) return null;
            int crop = source.optInt("crop", -1);
            if (crop < 0 || crop >= GameData.CROPS.length) return null;
            int amount = Math.max(1, source.optInt("amount", 3));
            GameData.Crop config = GameData.crop(crop);
            int cost = (int) Math.ceil((double) amount / config.yield) * config.seedPrice;
            int reward = Math.max(source.optInt("coins", 0), Math.round(cost * 1.9f));
            return new Order(source.optInt("id", 0), crop, amount, reward, Math.max(1, source.optInt("xp", 10)));
        }
    }

    static final class Result {
        final boolean ok;
        final String message;

        private Result(boolean ok, String message) {
            this.ok = ok;
            this.message = message;
        }

        static Result ok(String message) {
            return new Result(true, message);
        }

        static Result fail(String message) {
            return new Result(false, message);
        }
    }
}
