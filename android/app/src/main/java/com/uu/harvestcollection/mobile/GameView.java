package com.uu.harvestcollection.mobile;

import android.content.Context;
import android.graphics.Bitmap;
import android.graphics.Canvas;
import android.graphics.Color;
import android.graphics.Paint;
import android.graphics.Path;
import android.graphics.Point;
import android.graphics.Rect;
import android.graphics.RectF;
import android.os.SystemClock;
import android.view.MotionEvent;
import android.view.View;

import java.util.ArrayDeque;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.HashSet;
import java.util.List;
import java.util.Queue;
import java.util.Random;
import java.util.Set;

final class GameView extends View {
    private static final float W = 640f;
    private static final float H = 960f;

    private static final int INK = Color.rgb(52, 70, 74);
    private static final int INK_SOFT = Color.rgb(97, 112, 111);
    private static final int PAPER = Color.rgb(255, 248, 216);
    private static final int PAPER_2 = Color.rgb(243, 233, 189);
    private static final int CREAM = Color.rgb(255, 253, 240);
    private static final int GREEN = Color.rgb(116, 191, 112);
    private static final int GREEN_DARK = Color.rgb(62, 132, 86);
    private static final int GREEN_SOFT = Color.rgb(185, 221, 160);
    private static final int MINT = Color.rgb(155, 215, 207);
    private static final int CORAL = Color.rgb(238, 121, 107);
    private static final int CORAL_DARK = Color.rgb(189, 79, 74);
    private static final int YELLOW = Color.rgb(243, 201, 85);
    private static final int YELLOW_SOFT = Color.rgb(248, 231, 162);
    private static final int BLUE = Color.rgb(77, 147, 173);
    private static final int SKY = Color.rgb(125, 198, 216);
    private static final int SOIL = Color.rgb(168, 101, 73);
    private static final int SOIL_DARK = Color.rgb(117, 70, 60);
    private static final int PURPLE = Color.rgb(141, 99, 173);
    private static final int LOCK = Color.rgb(145, 163, 145);

    private static final String[] VIEW_NAMES = {"农场", "连连看", "消消乐", "集市", "宠物园"};
    private static final String[] TOOL_NAMES = {"种植", "浇水", "施肥", "收获", "设备"};
    private static final String[] LINK_NAMES = {"萝", "菜", "薯", "番", "玉", "莓", "茄", "南", "菇", "豆"};
    private static final int[] LINK_COLORS = {
        Color.rgb(235, 103, 89), Color.rgb(78, 157, 89), Color.rgb(177, 116, 61),
        Color.rgb(217, 71, 73), Color.rgb(218, 174, 43), Color.rgb(202, 62, 98),
        Color.rgb(119, 78, 166), Color.rgb(223, 132, 56), Color.rgb(183, 91, 103),
        Color.rgb(61, 145, 96)
    };
    private static final String[] MATCH_NAMES = {"萝", "菜", "薯", "番", "玉", "茄", "南", "蓝"};
    private static final int[] MATCH_COLORS = {
        Color.rgb(240, 111, 145), Color.rgb(77, 169, 96), Color.rgb(185, 122, 62),
        Color.rgb(223, 63, 67), Color.rgb(240, 198, 45), Color.rgb(118, 80, 168),
        Color.rgb(235, 132, 47), Color.rgb(63, 120, 197)
    };

    private static final int A_NAV = 1;
    private static final int A_ORDER = 2;
    private static final int A_PLOT = 3;
    private static final int A_TOOL = 4;
    private static final int A_SEED = 5;
    private static final int A_BUY_SEED = 6;
    private static final int A_SELL = 7;
    private static final int A_AUTO_TOGGLE = 8;
    private static final int A_MARKET_TAB = 10;
    private static final int A_UPGRADE = 11;
    private static final int A_BUY_AUTO = 12;
    private static final int A_PLACE_AUTO = 13;
    private static final int A_UNLOCK_LAND = 14;
    private static final int A_EXCHANGE = 15;
    private static final int A_RESEARCH = 16;
    private static final int A_LINK_CELL = 20;
    private static final int A_LINK_HINT = 21;
    private static final int A_LINK_SHUFFLE = 22;
    private static final int A_MATCH_CELL = 30;
    private static final int A_MATCH_SHUFFLE = 31;
    private static final int A_PUZZLE_MODE = 32;
    private static final int A_MERGE_MOVE = 33;
    private static final int A_PET_SELECT = 40;
    private static final int A_PET_ACTION = 41;
    private static final int A_PET_FOOD = 42;
    private static final int A_PET_CLAIM = 43;
    private static final int A_PET_FACILITY = 44;
    private static final int A_PET_PAGE = 45;
    private static final int A_UNLOCK_PET = 46;

    private final Paint paint = new Paint();
    private final Paint bitmapPaint = new Paint();
    private final Paint textPaint = new Paint(Paint.ANTI_ALIAS_FLAG);
    private final Random random = new Random();
    private final List<Hit> hits = new ArrayList<>();
    private final List<Effect> effects = new ArrayList<>();
    private final Context appContext;
    private final GameState state;
    private final PixelAssets assets;

    private int view = 0;
    private int marketTab = 0;
    private int petPage = 0;
    private int automationAssign = 0;
    private int[][] linkBoard = new int[8][6];
    private Point linkSelected;
    private List<Point> linkPath;
    private long linkPathUntil;
    private int linkScore;
    private int linkBoards;
    private int linkFlow;
    private int[][] matchBoard = new int[7][7];
    private Point matchSelected;
    private int matchScore;
    private boolean mergeMode = false;
    private int[][] mergeBoard = new int[4][4];
    private int mergeScore;
    private int petAction = -1;
    private long petActionUntil = 0L;
    private float downX;
    private float downY;
    private long lastSaveAt;
    private long toastUntil;
    private String toastText = "";
    private boolean toastGood;
    private float scale = 1f;
    private float offsetX;
    private float offsetY;
    private float viewportHeight = H;
    private float layoutExtra;
    private int insetLeft;
    private int insetTop;
    private int insetRight;
    private int insetBottom;

    GameView(Context context) {
        super(context);
        appContext = context.getApplicationContext();
        state = GameState.load(appContext);
        assets = new PixelAssets(getResources());
        paint.setAntiAlias(false);
        bitmapPaint.setAntiAlias(false);
        bitmapPaint.setFilterBitmap(false);
        textPaint.setTypeface(android.graphics.Typeface.create("sans", android.graphics.Typeface.NORMAL));
        setLayerType(View.LAYER_TYPE_SOFTWARE, null);
        startLinkBoard();
        startMatchBoard();
        addMergeTile();
        addMergeTile();
        setFocusable(true);
    }

    void saveNow() {
        state.save(appContext);
        lastSaveAt = SystemClock.uptimeMillis();
    }

    void setSystemInsets(int left, int top, int right, int bottom) {
        if (insetLeft == left && insetTop == top && insetRight == right && insetBottom == bottom) return;
        insetLeft = Math.max(0, left);
        insetTop = Math.max(0, top);
        insetRight = Math.max(0, right);
        insetBottom = Math.max(0, bottom);
        invalidate();
    }

    @Override
    protected void onAttachedToWindow() {
        super.onAttachedToWindow();
        postOnAnimation(frame);
    }

    @Override
    protected void onDetachedFromWindow() {
        saveNow();
        removeCallbacks(frame);
        super.onDetachedFromWindow();
    }

    private final Runnable frame = new Runnable() {
        @Override
        public void run() {
            long now = System.currentTimeMillis();
            int[] cropsBefore = new int[GameData.PLOT_COUNT];
            boolean[] wateredBefore = new boolean[GameData.PLOT_COUNT];
            for (int i = 0; i < GameData.PLOT_COUNT; i++) {
                cropsBefore[i] = state.plots[i].crop;
                wateredBefore[i] = state.plots[i].watered;
            }
            state.tick(now);
            if (view == 0) {
                for (int i = 0; i < GameData.PLOT_COUNT; i++) {
                    if (cropsBefore[i] >= 0 && state.plots[i].crop < 0 && state.harvesterPlots[i]) {
                        addEffect("harvest", plotCenterX(i), plotCenterY(i), GREEN_SOFT, "机器人收菜");
                    } else if (!wateredBefore[i] && state.plots[i].watered && state.sprinklerPlots[i]) {
                        addEffect("water", plotCenterX(i), plotCenterY(i), SKY, "自动浇水");
                    }
                }
            }
            effects.removeIf(effect -> now > effect.until);
            if (SystemClock.uptimeMillis() - lastSaveAt > 5000L) saveNow();
            invalidate();
            if (isAttachedToWindow()) postOnAnimation(this);
        }
    };

    @Override
    protected void onDraw(Canvas canvas) {
        super.onDraw(canvas);
        float availableWidth = Math.max(1f, getWidth() - insetLeft - insetRight);
        float availableHeight = Math.max(1f, getHeight() - insetTop - insetBottom);
        float widthScale = availableWidth / W;
        float heightScale = availableHeight / H;
        scale = widthScale * H <= availableHeight ? widthScale : heightScale;
        viewportHeight = availableHeight / scale;
        layoutExtra = Math.max(0f, viewportHeight - H);
        offsetX = insetLeft + (availableWidth - W * scale) / 2f;
        offsetY = insetTop;
        canvas.drawColor(MINT);
        canvas.save();
        canvas.translate(offsetX, offsetY);
        canvas.scale(scale, scale);
        hits.clear();
        drawBackground(canvas);
        drawHeader(canvas);
        if (view == 0) drawFarm(canvas);
        else if (view == 1) drawLink(canvas);
        else if (view == 2) drawPuzzle(canvas);
        else if (view == 3) drawMarket(canvas);
        else drawPets(canvas);
        drawEffects(canvas);
        drawNavigation(canvas);
        drawToast(canvas);
        canvas.restore();
    }

    private void drawBackground(Canvas canvas) {
        fill(canvas, 0, 0, W, viewportHeight, MINT);
        for (int y = 0; y < viewportHeight; y += 24) {
            for (int x = (y / 24) % 2 == 0 ? 0 : 12; x < W; x += 24) {
                fill(canvas, x, y, 2, 2, Color.argb(55, 255, 255, 255));
            }
        }
    }

    private void drawHeader(Canvas canvas) {
        card(canvas, 8, 8, 624, 104, PAPER, 3);
        card(canvas, 18, 20, 42, 43, Color.WHITE, 2);
        drawCrop(canvas, 0, 39, 42, 0.72f);
        text(canvas, "UU小园", 70, 30, 19, INK, Paint.Align.LEFT, true);
        text(canvas, "农场 Lv." + state.level, 70, 55, 11, CORAL_DARK, Paint.Align.LEFT, true);
        fill(canvas, 70, 72, 128, 8, PAPER_2);
        fill(canvas, 70, 72, 128f * Math.min(1f, state.xp / (float) GameData.xpNeeded(state.level)), 8, CORAL);
        String[] labels = {"金币", "种券", "堆肥", "印章", "阳光", "丰收星"};
        int[] values = {state.coins, state.seedTickets, state.compost, state.orderSeals, state.sun, state.stars};
        int[] colors = {YELLOW, CORAL, GREEN_SOFT, PURPLE, YELLOW, Color.rgb(245, 183, 42)};
        for (int i = 0; i < labels.length; i++) {
            int col = i % 3;
            int row = i / 3;
            float x = 246 + col * 126;
            float y = 35 + row * 43;
            drawResourceIcon(canvas, i, x, y, colors[i]);
            text(canvas, labels[i], x + 14, y - 8, 9, GREEN_DARK, Paint.Align.LEFT, false);
            text(canvas, String.valueOf(values[i]), x + 14, y + 10, 12, INK, Paint.Align.LEFT, true);
        }
    }

    private void drawNavigation(Canvas canvas) {
        float y = layoutY(888);
        fill(canvas, 0, y, W, 72, PAPER);
        stroke(canvas, 0, y, W, 72, INK, 2);
        for (int i = 0; i < VIEW_NAMES.length; i++) {
            float x = 4 + i * 127;
            boolean active = view == i;
            if (active) round(canvas, x + 4, y + 8, 119, 56, 6, CORAL, null, 0);
            addHit(A_NAV, i, x, y + 4, 127, 64);
            drawNavIcon(canvas, i, x + 63, y + 26, active ? Color.WHITE : INK);
            String name = i == 4 && !state.petGardenUnlocked ? "宠物·锁" : VIEW_NAMES[i];
            text(canvas, name, x + 63, y + 54, 10, active ? Color.WHITE : i == 4 && !state.petGardenUnlocked ? LOCK : INK, Paint.Align.CENTER, true);
            if (i == 1 || i == 2) {
                boolean done = i == 1 ? state.festivalLinkDone : state.festivalMatchDone;
                circle(canvas, x + 112, y + 15, 5, done ? YELLOW : PAPER_2, INK, 1);
            }
        }
    }

    private void drawFarm(Canvas canvas) {
        title(canvas, "农场", "订单、种植与逐格自动化");
        drawOrders(canvas);
        drawPlots(canvas);
        drawFarmTools(canvas);
        drawSeedShelf(canvas);
        drawFarmFooter(canvas);
    }

    private void drawOrders(Canvas canvas) {
        float y = layoutY(153);
        for (int i = 0; i < state.orders.size(); i++) {
            GameState.Order order = state.orders.get(i);
            GameData.Crop crop = GameData.crop(order.crop);
            float x = 18 + i * 207;
            boolean ready = state.produce[order.crop] >= order.amount;
            card(canvas, x, y, 197, 74, i % 2 == 0 ? PAPER : CREAM, 2);
            drawCrop(canvas, order.crop, x + 25, y + 37, 0.58f);
            text(canvas, crop.name + " ×" + order.amount, x + 48, y + 21, 10, INK, Paint.Align.LEFT, true);
            text(canvas, "￥" + order.coins + " · 库" + state.produce[order.crop], x + 48, y + 44, 10, ready ? GREEN_DARK : CORAL_DARK, Paint.Align.LEFT, true);
            button(canvas, ready ? "交付" : "备货", A_ORDER, i, x + 125, y + 48, 62, 20, ready ? GREEN_SOFT : PAPER_2, !ready);
        }
    }

    private void drawPlots(Canvas canvas) {
        long now = System.currentTimeMillis();
        for (int i = 0; i < GameData.PLOT_COUNT; i++) {
            int row = i / 3;
            int col = i % 3;
            float x = 18 + col * 207;
            float y = layoutY(237 + row * 94);
            boolean unlocked = i < state.unlockedPlots;
            int fill = unlocked ? SOIL : i == state.unlockedPlots ? GREEN_SOFT : Color.rgb(137, 167, 137);
            round(canvas, x, y, 197, 85, 5, fill, INK, 2);
            addHit(A_PLOT, i, x, y, 197, 85);
            if (!unlocked) {
                String label = i == state.unlockedPlots
                    ? "下一块 ￥" + GameData.LAND_COSTS[state.unlockedPlots - 6]
                    : "未解锁";
                text(canvas, label, x + 98, y + 43, 10, INK, Paint.Align.CENTER, true);
                continue;
            }
            fill(canvas, x + 10, y + 27, 177, 3, SOIL_DARK);
            fill(canvas, x + 10, y + 54, 177, 3, SOIL_DARK);
            GameState.Plot plot = state.plots[i];
            if (plot.crop < 0) {
                text(canvas, automationAssign > 0 ? "点此布置设备" : "空土地", x + 98, y + 43, 10, Color.argb(210, 255, 248, 216), Paint.Align.CENTER, true);
            } else {
                float progress = state.cropProgress(i, now);
                float bob = progress >= 1f ? (float) Math.sin(now / 150d + i) * 2f : 0f;
                drawCrop(canvas, plot.crop, x + 96, y + 41 + bob, 0.82f + progress * 0.12f);
                fill(canvas, x + 36, y + 72, 125, 6, PAPER_2);
                fill(canvas, x + 36, y + 72, 125 * progress, 6, progress >= 1f ? YELLOW : GREEN);
                text(canvas, progress >= 1f ? "成熟" : GameData.duration(plot.finishAt - now), x + 98, y + 64, 8, PAPER, Paint.Align.CENTER, true);
                if (plot.watered) drawDrop(canvas, x + 178, y + 14, BLUE);
                if (plot.fertilized) drawSpark(canvas, x + 18, y + 15, YELLOW, 1f);
                if (plot.rotation) text(canvas, "轮作", x + 35, y + 13, 8, YELLOW_SOFT, Paint.Align.LEFT, true);
            }
            if (state.sprinklerPlots[i]) drawRobot(canvas, x + 164, y + 52, false, state.sprinklerEnabled, i);
            if (state.harvesterPlots[i]) drawRobot(canvas, x + 31, y + 52, true, state.harvesterEnabled, i);
        }
    }

    private void drawFarmTools(Canvas canvas) {
        float y = layoutY(619);
        for (int i = 0; i < TOOL_NAMES.length; i++) {
            float x = 18 + i * 121;
            boolean selected = state.selectedTool == i && automationAssign == 0;
            button(canvas, TOOL_NAMES[i], A_TOOL, i, x, y, 111, 42, selected ? YELLOW : CREAM, false);
        }
    }

    private void drawSeedShelf(Canvas canvas) {
        float shelfY = layoutY(670);
        float actionY = layoutY(746);
        for (int i = 0; i < GameData.CROPS.length; i++) {
            GameData.Crop crop = GameData.crop(i);
            float x = 18 + i * 101;
            boolean locked = crop.level > state.level;
            boolean selected = state.selectedCrop == i;
            round(canvas, x, shelfY, 93, 67, 5, selected ? YELLOW_SOFT : i % 2 == 0 ? PAPER : CREAM, INK, selected ? 3 : 1);
            drawCrop(canvas, i, x + 24, shelfY + 30, 0.54f);
            text(canvas, crop.name, x + 48, shelfY + 17, 9, locked ? LOCK : INK, Paint.Align.LEFT, true);
            text(canvas, locked ? "Lv." + crop.level : "种 " + state.seeds[i], x + 48, shelfY + 40, 9, locked ? LOCK : GREEN_DARK, Paint.Align.LEFT, true);
            addHit(A_SEED, i, x, shelfY, 93, 67);
        }
        GameData.Crop selected = GameData.crop(state.selectedCrop);
        button(canvas, "补种 " + selected.name + " ×3 · ￥" + selected.seedPrice * 3, A_BUY_SEED, state.selectedCrop, 18, actionY, 230, 42, YELLOW_SOFT, selected.level > state.level);
        button(canvas, "洒水 " + (state.sprinklerEnabled ? "开" : "关"), A_AUTO_TOGGLE, 0, 258, actionY, 171, 42, state.sprinklerEnabled ? GREEN_SOFT : PAPER_2, false);
        button(canvas, "收菜 " + (state.harvesterEnabled ? "开" : "关"), A_AUTO_TOGGLE, 1, 439, actionY, 183, 42, state.harvesterEnabled ? GREEN_SOFT : PAPER_2, false);
    }

    private void drawFarmFooter(Canvas canvas) {
        int count = produceCount();
        int value = produceValue();
        float y = layoutY(797);
        card(canvas, 18, y, 294, 80, PAPER, 2);
        text(canvas, "仓库 " + count + " 份 · 约￥" + value, 32, y + 22, 11, INK, Paint.Align.LEFT, true);
        button(canvas, "全部出售", A_SELL, 0, 174, y + 35, 124, 34, count > 0 ? GREEN_SOFT : PAPER_2, count == 0);
        card(canvas, 322, y, 300, 80, CREAM, 2);
        text(canvas, "丰收庆典 · 第 " + (state.festivalRound + 1) + " 轮", 338, y + 20, 11, INK, Paint.Align.LEFT, true);
        String link = state.festivalLinkDone ? "完成" : state.festivalLink + "/" + state.linkGoal();
        String match = state.festivalMatchDone ? "完成" : state.festivalMatch + "/" + state.matchGoal();
        text(canvas, "连连看 " + link + "   益智 " + match, 338, y + 45, 9, GREEN_DARK, Paint.Align.LEFT, true);
        text(canvas, "游园礼袋 " + state.miniGiftProgress + "/3", 338, y + 67, 9, CORAL_DARK, Paint.Align.LEFT, true);
    }

    private void drawMarket(Canvas canvas) {
        title(canvas, "集市", "金币投入会反哺种田效率");
        String[] tabs = {"成长", "自动化", "研究"};
        for (int i = 0; i < tabs.length; i++) {
            button(canvas, tabs[i], A_MARKET_TAB, i, 18 + i * 207, 153, 197, 44, marketTab == i ? CORAL : CREAM, false);
        }
        if (marketTab == 0) drawGrowthMarket(canvas);
        else if (marketTab == 1) drawAutomationMarket(canvas);
        else drawResearchMarket(canvas);
    }

    private void drawGrowthMarket(Canvas canvas) {
        String[] names = {"精致水壶", "丰收菜篮", "玻璃温室", "集市摊位"};
        String[] desc = {"浇水加速提高 5%", "每次收获数量 +1", "全部作物成长加快 5%", "出售价格提高 6%"};
        int[] levels = {state.wateringLevel, state.basketLevel, state.greenhouseLevel, state.marketLevel};
        int[] max = {4, 3, 5, 5};
        int[] base = {140, 240, 300, 260};
        for (int i = 0; i < names.length; i++) {
            float y = layoutY(211 + i * 105);
            int cost = levels[i] >= max[i] ? 0 : Math.round(base[i] * (float) Math.pow(1.8, levels[i]));
            marketRow(canvas, names[i], desc[i], "Lv." + levels[i] + "/" + max[i], cost == 0 ? "满级" : "￥" + cost, A_UPGRADE, i, y, cost == 0);
        }
        marketRow(canvas, "种子券兑换", "随机获得当前等级种子 ×3", "持有 " + state.seedTickets, "兑换", A_EXCHANGE, 0, layoutY(641), state.seedTickets < 1);
        int landCost = state.unlockedPlots >= 12 ? 0 : GameData.LAND_COSTS[state.unlockedPlots - 6];
        marketRow(canvas, "扩建土地", "增加一块可种植土地", state.unlockedPlots + "/12", landCost == 0 ? "完成" : "￥" + landCost, A_UNLOCK_LAND, 0, layoutY(746), landCost == 0);
    }

    private void drawAutomationMarket(Canvas canvas) {
        int sprinklerCost = state.sprinklerBought >= 12 ? 0 : GameData.SPRINKLER_COSTS[state.sprinklerBought];
        int harvesterCost = state.harvesterBought >= 12 ? 0 : GameData.HARVESTER_COSTS[state.harvesterBought];
        automationCard(canvas, false, "自动洒水器", "自动浇水，每台照顾一块土地", state.sprinklerBought, sprinklerCost, layoutY(216));
        automationCard(canvas, true, "收菜机器人", "成熟后自动收获，每台照顾一块土地", state.harvesterBought, harvesterCost, layoutY(412));
        float rulesY = layoutY(620);
        card(canvas, 18, rulesY, 604, 164, PAPER, 2);
        text(canvas, "布置规则", 34, rulesY + 28, 14, INK, Paint.Align.LEFT, true);
        text(canvas, "购买后点“布置”，再点农田中的目标格。", 34, rulesY + 61, 11, INK_SOFT, Paint.Align.LEFT, false);
        text(canvas, "再次点击已布置的格子会收回设备。", 34, rulesY + 91, 11, INK_SOFT, Paint.Align.LEFT, false);
        text(canvas, "设备开关关闭后保留格子，随时可手动操作。", 34, rulesY + 121, 11, GREEN_DARK, Paint.Align.LEFT, true);
    }

    private void automationCard(Canvas canvas, boolean harvester, String name, String desc, int count, int cost, float y) {
        card(canvas, 18, y, 604, 172, harvester ? CREAM : PAPER, 2);
        drawRobot(canvas, 74, y + 79, harvester, harvester ? state.harvesterEnabled : state.sprinklerEnabled, harvester ? 3 : 1);
        text(canvas, name, 124, y + 33, 15, INK, Paint.Align.LEFT, true);
        text(canvas, desc, 124, y + 65, 10, INK_SOFT, Paint.Align.LEFT, false);
        text(canvas, "已购买 " + count + " · 已布置 " + count(harvester ? state.harvesterPlots : state.sprinklerPlots), 124, y + 96, 10, GREEN_DARK, Paint.Align.LEFT, true);
        button(canvas, cost == 0 ? "已满" : "购买 ￥" + cost, A_BUY_AUTO, harvester ? 1 : 0, 124, y + 117, 190, 38, YELLOW_SOFT, cost == 0);
        button(canvas, "布置", A_PLACE_AUTO, harvester ? 1 : 0, 328, y + 117, 126, 38, GREEN_SOFT, count == 0);
        boolean enabled = harvester ? state.harvesterEnabled : state.sprinklerEnabled;
        button(canvas, enabled ? "运行中" : "已暂停", A_AUTO_TOGGLE, harvester ? 1 : 0, 468, y + 117, 136, 38, enabled ? GREEN_SOFT : PAPER_2, false);
    }

    private void drawResearchMarket(Canvas canvas) {
        String[] names = {"四季栽培", "游园手艺", "熟客名册"};
        String[] descriptions = {"永久成长速度 +4%", "小游戏里程碑奖励增加", "订单奖励永久 +6%"};
        int[] levels = {state.growthResearch, state.miniResearch, state.orderResearch};
        for (int i = 0; i < names.length; i++) {
            int cost = levels[i] + 1;
            marketRow(canvas, names[i], descriptions[i], "Lv." + levels[i] + "/5", levels[i] >= 5 ? "满级" : "★" + cost, A_RESEARCH, i, layoutY(222 + i * 132), levels[i] >= 5);
        }
        float infoY = layoutY(638);
        card(canvas, 18, infoY, 604, 126, CREAM, 2);
        text(canvas, "丰收星来自反复完成庆典", 34, infoY + 31, 13, INK, Paint.Align.LEFT, true);
        text(canvas, "连连看和益智屋均达到本轮目标后，自动开启下一轮。", 34, infoY + 65, 10, GREEN_DARK, Paint.Align.LEFT, false);
        text(canvas, "当前丰收星 " + state.stars, 34, infoY + 97, 11, CORAL_DARK, Paint.Align.LEFT, true);
    }

    private void marketRow(Canvas canvas, String name, String description, String status, String price, int action, int index, float y, boolean disabled) {
        card(canvas, 18, y, 604, 91, ((int) y / 100) % 2 == 0 ? PAPER : CREAM, 2);
        text(canvas, name, 34, y + 27, 13, INK, Paint.Align.LEFT, true);
        text(canvas, description, 34, y + 58, 9, INK_SOFT, Paint.Align.LEFT, false);
        text(canvas, status, 392, y + 30, 10, GREEN_DARK, Paint.Align.RIGHT, true);
        button(canvas, price, action, index, 414, y + 18, 190, 54, disabled ? PAPER_2 : YELLOW_SOFT, disabled);
    }

    private void drawLink(Canvas canvas) {
        title(canvas, "田园连连看", "无限盘面 · 每 8 对奖励种子券");
        card(canvas, 18, 153, 604, 45, PAPER, 2);
        String[] flows = {"向下收拢", "向左归仓", "向中聚拢", "向上生长"};
        text(canvas, "得分 " + linkScore, 32, 176, 10, INK, Paint.Align.LEFT, true);
        text(canvas, flows[linkFlow], 175, 176, 10, GREEN_DARK, Paint.Align.LEFT, true);
        text(canvas, "奖励 " + state.linkRewardPairs + "/8 对", 322, 176, 10, CORAL_DARK, Paint.Align.LEFT, true);
        button(canvas, "提示 ☀1", A_LINK_HINT, 0, 468, 160, 68, 30, YELLOW_SOFT, state.sun < 1);
        button(canvas, "重排 ☀1", A_LINK_SHUFFLE, 0, 544, 160, 68, 30, CREAM, state.sun < 1);
        for (int r = 0; r < 8; r++) {
            for (int c = 0; c < 6; c++) {
                int value = linkBoard[r][c];
                if (value < 0) continue;
                float x = 43 + c * 93;
                float y = layoutY(211 + r * 78);
                boolean selected = linkSelected != null && linkSelected.x == c && linkSelected.y == r;
                float pulse = selected ? 2f + (float) Math.sin(System.currentTimeMillis() / 100d) * 1.5f : 0f;
                round(canvas, x - pulse, y - pulse, 82 + pulse * 2, 66 + pulse * 2, 5, Color.WHITE, selected ? YELLOW : INK, selected ? 4 : 2);
                drawLinkIcon(canvas, value, x + 41, y + 27);
                text(canvas, LINK_NAMES[value], x + 41, y + 52, 10, LINK_COLORS[value], Paint.Align.CENTER, true);
                addHit(A_LINK_CELL, r * 6 + c, x, y, 82, 66);
            }
        }
        if (linkPath != null && System.currentTimeMillis() < linkPathUntil) drawLinkPath(canvas);
        float footerY = layoutY(842);
        card(canvas, 18, footerY, 604, 34, CREAM, 1);
        String festival = state.festivalLinkDone ? "本轮完成" : state.festivalLink + "/" + state.linkGoal() + " 对";
        text(canvas, "庆典 " + festival + " · 已清盘 " + linkBoards + " · 不限时间", 320, footerY + 17, 9, GREEN_DARK, Paint.Align.CENTER, true);
    }

    private void drawPuzzle(Canvas canvas) {
        title(canvas, mergeMode ? "田园合成" : "清新消消乐", "无限游玩 · 达标即领奖");
        button(canvas, "消消乐", A_PUZZLE_MODE, 0, 18, 153, 190, 42, !mergeMode ? CORAL : CREAM, false);
        button(canvas, "田园合成", A_PUZZLE_MODE, 1, 222, 153, 190, 42, mergeMode ? CORAL : CREAM, false);
        button(canvas, "重排 ☀2", A_MATCH_SHUFFLE, 0, 426, 153, 196, 42, YELLOW_SOFT, state.sun < 2);
        if (mergeMode) drawMerge(canvas); else drawMatch(canvas);
    }

    private void drawMatch(Canvas canvas) {
        float statusY = layoutY(206);
        card(canvas, 18, statusY, 604, 52, PAPER, 2);
        text(canvas, "得分 " + matchScore, 34, statusY + 26, 11, INK, Paint.Align.LEFT, true);
        text(canvas, "印章进度 " + state.matchRewardPieces + "/" + state.matchTarget, 236, statusY + 26, 11, CORAL_DARK, Paint.Align.CENTER, true);
        String festival = state.festivalMatchDone ? "完成" : state.festivalMatch + "/" + state.matchGoal();
        text(canvas, "庆典 " + festival, 592, statusY + 26, 10, GREEN_DARK, Paint.Align.RIGHT, true);
        for (int r = 0; r < 7; r++) {
            for (int c = 0; c < 7; c++) {
                float x = 45 + c * 79;
                float y = layoutY(278 + r * 77);
                int value = matchBoard[r][c];
                boolean selected = matchSelected != null && matchSelected.x == c && matchSelected.y == r;
                round(canvas, x, y, 70, 68, 5, selected ? YELLOW_SOFT : CREAM, selected ? YELLOW : INK, selected ? 4 : 1);
                drawMatchIcon(canvas, value, x + 35, y + 28, 24);
                text(canvas, MATCH_NAMES[value], x + 35, y + 54, 9, MATCH_COLORS[value], Paint.Align.CENTER, true);
                addHit(A_MATCH_CELL, r * 7 + c, x, y, 70, 68);
            }
        }
        float footerY = layoutY(828);
        card(canvas, 18, footerY, 604, 48, CREAM, 2);
        text(canvas, "点击相邻棋子交换，也可以直接滑动；没有步数和局数限制", 320, footerY + 24, 9, INK_SOFT, Paint.Align.CENTER, false);
    }

    private void drawMerge(Canvas canvas) {
        float statusY = layoutY(206);
        card(canvas, 18, statusY, 604, 52, PAPER, 2);
        text(canvas, "得分 " + mergeScore, 34, statusY + 26, 11, INK, Paint.Align.LEFT, true);
        text(canvas, "每次合成都会推进印章与庆典", 592, statusY + 26, 10, GREEN_DARK, Paint.Align.RIGHT, true);
        float size = 124;
        for (int r = 0; r < 4; r++) {
            for (int c = 0; c < 4; c++) {
                float x = 63 + c * 130;
                float y = layoutY(284 + r * 130);
                int value = mergeBoard[r][c];
                int color = value == 0 ? PAPER_2 : MATCH_COLORS[(value - 1) % MATCH_COLORS.length];
                round(canvas, x, y, size, size, 6, color, INK, 2);
                if (value > 0) {
                    text(canvas, mergeName(value), x + size / 2, y + 48, 15, Color.WHITE, Paint.Align.CENTER, true);
                    text(canvas, String.valueOf(1 << value), x + size / 2, y + 82, 12, Color.WHITE, Paint.Align.CENTER, true);
                }
            }
        }
        String[] arrows = {"↑", "↓", "←", "→"};
        for (int i = 0; i < 4; i++) button(canvas, arrows[i], A_MERGE_MOVE, i, 74 + i * 126, layoutY(814), 112, 54, CREAM, false);
    }

    private void drawPets(Canvas canvas) {
        title(canvas, "暖阳宠物园", "农场供给蔬菜 · 宠物回流金币和堆肥");
        if (!state.petGardenUnlocked) {
            float top = layoutY(260);
            card(canvas, 72, top, 496, layoutY(590) - top, PAPER, 3);
            drawPet(canvas, 0, 320, layoutY(370), 1f, false);
            text(canvas, "修建一座安静的像素宠物园", 320, layoutY(456), 17, INK, Paint.Align.CENTER, true);
            text(canvas, "开放后可领养、修设施并积累访客收益", 320, layoutY(500), 11, INK_SOFT, Paint.Align.CENTER, false);
            button(canvas, "修建宠物园 · ￥520", A_UNLOCK_PET, 0, 170, layoutY(532), 300, 52, YELLOW_SOFT, state.coins < 520);
            return;
        }
        float petCardY = layoutY(153);
        for (int i = 0; i < 4; i++) {
            float x = 18 + i * 152;
            boolean owned = state.petOwned[i];
            boolean selected = state.selectedPet == i;
            round(canvas, x, petCardY, 142, 66, 5, selected ? YELLOW_SOFT : CREAM, selected ? CORAL : INK, selected ? 3 : 1);
            drawPet(canvas, i, x + 31, petCardY + 31, 0.42f, false);
            text(canvas, GameData.PET_NAMES[i], x + 58, petCardY + 21, 9, owned ? INK : LOCK, Paint.Align.LEFT, true);
            if (owned) drawPetCardStatus(canvas, i, x + 58, petCardY + 42);
            else text(canvas, "￥" + GameData.PET_COSTS[i], x + 58, petCardY + 46, 8, CORAL_DARK, Paint.Align.LEFT, true);
            addHit(A_PET_SELECT, i, x, petCardY, 142, 66);
        }
        drawPetGarden(canvas);
        drawPetControls(canvas);
        drawPetShop(canvas);
    }

    private void drawPetGarden(Canvas canvas) {
        float gardenTop = layoutY(230);
        float gardenBottom = layoutY(570);
        RectF gardenBounds = new RectF(18, gardenTop, 622, gardenBottom);
        if (assets.petGarden != null) {
            canvas.save();
            Path gardenClip = new Path();
            gardenClip.addRoundRect(gardenBounds, 6, 6, Path.Direction.CW);
            canvas.clipPath(gardenClip);
            drawBitmapCenterCrop(canvas, assets.petGarden, gardenBounds);
            canvas.restore();
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2);
            paint.setColor(INK);
            canvas.drawRoundRect(gardenBounds, 6, 6, paint);
            paint.setStyle(Paint.Style.FILL);
        } else {
            round(canvas, 18, gardenTop, 604, gardenBottom - gardenTop, 6, Color.rgb(174, 218, 145), INK, 2);
            for (float y = gardenTop + 16; y < gardenBottom - 10; y += 24) {
                for (int x = 34 + (((int) y) % 48); x < 610; x += 54) fill(canvas, x, y, 5, 5, Color.rgb(116, 183, 102));
            }
        }
        drawFacilitySprite(canvas, 0, 0, 320, layoutY(520), 58);
        if (state.facilities[0] > 0) drawFacilitySprite(canvas, 1, 0, 84, layoutY(450), 112);
        if (state.facilities[1] > 0) drawFacilitySprite(canvas, 2, 0, 512, layoutY(460), 118);
        if (state.facilities[2] > 0) drawFacilitySprite(canvas, 3, 0, 535, layoutY(315), 88);
        if (state.facilities[3] > 0) drawFacilitySprite(canvas, 0, 1, 125, layoutY(515), 80);
        if (state.facilities[4] > 0) drawFacilitySprite(canvas, 1, 1, 405, layoutY(507), 92);
        if (state.facilities[5] > 0) drawFacilitySprite(canvas, 2, 1, 315, layoutY(300), 102);
        if (state.facilities[6] > 0) drawFacilitySprite(canvas, 3, 1, 580, layoutY(500), 76);
        if (state.facilities[7] > 0) drawFacilitySprite(canvas, 0, 2, 215, layoutY(490), 100);
        long now = System.currentTimeMillis();
        for (int i = 0; i < 4; i++) {
            if (!state.petOwned[i]) continue;
            float phase = now / (1150f + i * 170f) + i * 2.1f;
            float x = 170 + i * 94 + (float) Math.sin(phase) * (34 + i * 4);
            float y = layoutY(338 + (i % 2) * 88) + (float) Math.cos(phase * 0.72f) * 26;
            boolean acting = i == state.selectedPet && now < petActionUntil;
            if (acting) {
                if (petAction == 0) { x = 514; y = layoutY(326); }
                else if (petAction == 2) { x = 116; y = layoutY(482); }
                else if (petAction == 3) { x = 487; y = layoutY(430); }
                else if (petAction == 4) { x = 408; y = layoutY(478); }
            }
            drawPet(canvas, i, x, y + (float) Math.sin(now / 120d + i) * (acting ? 4 : 2), 0.62f, acting);
        }
    }

    private void drawPetControls(Canvas canvas) {
        String[] actions = {"喂食", "抚摸", "玩耍", "洗澡", "梳毛"};
        float actionsY = layoutY(580);
        float foodY = layoutY(632);
        for (int i = 0; i < actions.length; i++) {
            boolean unavailable = !state.petOwned[state.selectedPet]
                || (i == 3 && state.facilities[1] < 1)
                || (i == 4 && state.facilities[4] < 1);
            button(canvas, actions[i], A_PET_ACTION, i, 18 + i * 121, actionsY, 111, 43, i == 0 ? YELLOW_SOFT : CREAM, unavailable);
        }
        button(canvas, "加工口粮 ×5", A_PET_FOOD, 0, 18, foodY, 190, 42, GREEN_SOFT, produceCount() < 2 || state.coins < 15);
        text(canvas, "口粮 " + state.petFood + " · 需蔬菜2份+￥15", 224, foodY + 21, 9, INK, Paint.Align.LEFT, true);
        button(canvas, "领取 ￥" + (int) state.visitorCoins, A_PET_CLAIM, 0, 462, foodY, 160, 42, YELLOW_SOFT, state.visitorCoins < 1f);
    }

    private void drawPetShop(Canvas canvas) {
        float shopY = layoutY(686);
        card(canvas, 18, shopY, 604, layoutY(876) - shopY, PAPER, 2);
        text(canvas, "宠物园设施", 34, layoutY(710), 12, INK, Paint.Align.LEFT, true);
        text(canvas, "第 " + (petPage + 1) + "/3 页", 520, layoutY(710), 9, GREEN_DARK, Paint.Align.RIGHT, true);
        button(canvas, petPage == 0 ? "·" : "‹", A_PET_PAGE, -1, 532, layoutY(695), 34, 28, CREAM, petPage == 0);
        button(canvas, petPage == 2 ? "·" : "›", A_PET_PAGE, 1, 576, layoutY(695), 34, 28, CREAM, petPage == 2);
        for (int slot = 0; slot < 3; slot++) {
            int index = petPage * 3 + slot;
            if (index >= GameData.FACILITY_NAMES.length) continue;
            float y = layoutY(729 + slot * 48);
            int level = state.facilities[index];
            int[] costs = GameData.FACILITY_COSTS[index];
            boolean max = level >= costs.length;
            text(canvas, GameData.FACILITY_NAMES[index], 34, y + 10, 10, INK, Paint.Align.LEFT, true);
            text(canvas, GameData.FACILITY_DESCRIPTIONS[index], 188, y + 10, 8, INK_SOFT, Paint.Align.LEFT, false);
            text(canvas, "Lv." + level, 470, y + 10, 8, GREEN_DARK, Paint.Align.RIGHT, true);
            button(canvas, max ? "满级" : "￥" + costs[level], A_PET_FACILITY, index, 486, y - 7, 120, 34, max ? PAPER_2 : YELLOW_SOFT, max);
        }
    }

    @Override
    public boolean onTouchEvent(MotionEvent event) {
        float x = (event.getX() - offsetX) / scale;
        float y = (event.getY() - offsetY) / scale;
        if (event.getActionMasked() == MotionEvent.ACTION_DOWN) {
            downX = x;
            downY = y;
            return true;
        }
        if (event.getActionMasked() != MotionEvent.ACTION_UP) return true;
        float dx = x - downX;
        float dy = y - downY;
        if (view == 2 && Math.max(Math.abs(dx), Math.abs(dy)) > 34f) {
            int direction = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 3 : 2) : (dy > 0 ? 1 : 0);
            if (mergeMode) {
                moveMerge(direction);
            } else {
                Point cell = matchCellAt(downX, downY);
                if (cell != null) {
                    Point target = new Point(cell.x + (direction == 3 ? 1 : direction == 2 ? -1 : 0), cell.y + (direction == 1 ? 1 : direction == 0 ? -1 : 0));
                    if (inside(target.y, target.x, 7, 7)) tryMatchSwap(cell, target);
                }
            }
            return true;
        }
        performClick();
        for (int i = hits.size() - 1; i >= 0; i--) {
            Hit hit = hits.get(i);
            if (!hit.disabled && hit.bounds.contains(x, y)) {
                handleHit(hit);
                return true;
            }
        }
        return true;
    }

    @Override
    public boolean performClick() {
        super.performClick();
        return true;
    }

    private void handleHit(Hit hit) {
        long now = System.currentTimeMillis();
        if (hit.action == A_NAV) {
            if (hit.index == 4 && !state.petGardenUnlocked) {
                view = 3;
                toast("先在集市或宠物园入口修建地契", false);
            } else {
                view = hit.index;
            }
            automationAssign = 0;
        } else if (hit.action == A_ORDER) {
            result(state.deliverOrder(hit.index), 320, layoutY(183));
        } else if (hit.action == A_PLOT) {
            if (automationAssign > 0) {
                result(state.assignAutomation(automationAssign == 1, hit.index), 320, layoutY(500));
            } else if (state.selectedTool == 0) {
                result(state.plant(hit.index, now), 320, layoutY(500));
                addEffect("sprout", plotCenterX(hit.index), plotCenterY(hit.index), GREEN, "播种");
            } else if (state.selectedTool == 1) {
                result(state.water(hit.index, now), 320, layoutY(500));
                addEffect("water", plotCenterX(hit.index), plotCenterY(hit.index), SKY, "浇水");
            } else if (state.selectedTool == 2) {
                result(state.fertilize(hit.index, now), 320, layoutY(500));
                addEffect("spark", plotCenterX(hit.index), plotCenterY(hit.index), YELLOW, "施肥");
            } else if (state.selectedTool == 3) {
                result(state.harvest(hit.index, now, false), 320, layoutY(500));
                addEffect("harvest", plotCenterX(hit.index), plotCenterY(hit.index), GREEN_SOFT, "收获");
            } else {
                toast("请在集市的自动化页面选择设备并点“布置”", false);
            }
        } else if (hit.action == A_TOOL) {
            state.selectedTool = hit.index;
            automationAssign = 0;
        } else if (hit.action == A_SEED) {
            if (GameData.crop(hit.index).level <= state.level) {
                state.selectedCrop = hit.index;
                state.selectedTool = 0;
                automationAssign = 0;
            } else toast("农场等级还不够", false);
        } else if (hit.action == A_BUY_SEED) {
            result(state.buySeeds(hit.index), 200, layoutY(746));
        } else if (hit.action == A_SELL) {
            result(state.sellAll(), 210, layoutY(820));
        } else if (hit.action == A_AUTO_TOGGLE) {
            if (hit.index == 0) state.sprinklerEnabled = !state.sprinklerEnabled;
            else state.harvesterEnabled = !state.harvesterEnabled;
            toast(hit.index == 0 ? "自动洒水已" + (state.sprinklerEnabled ? "开启" : "暂停") : "自动收菜已" + (state.harvesterEnabled ? "开启" : "暂停"), true);
        } else if (hit.action == A_MARKET_TAB) {
            marketTab = hit.index;
        } else if (hit.action == A_UPGRADE) {
            result(state.buyUpgrade(hit.index), 500, layoutY(400));
        } else if (hit.action == A_BUY_AUTO) {
            result(state.buyAutomation(hit.index == 0), 320, layoutY(420));
        } else if (hit.action == A_PLACE_AUTO) {
            automationAssign = hit.index == 0 ? 1 : 2;
            view = 0;
            state.selectedTool = 4;
            toast("请选择要布置的农田格子", true);
        } else if (hit.action == A_UNLOCK_LAND) {
            result(state.unlockLand(), 500, layoutY(760));
        } else if (hit.action == A_EXCHANGE) {
            result(state.exchangeTicket(), 500, layoutY(660));
        } else if (hit.action == A_RESEARCH) {
            result(state.buyResearch(hit.index), 500, layoutY(400));
        } else if (hit.action == A_LINK_CELL) {
            clickLink(hit.index / 6, hit.index % 6);
        } else if (hit.action == A_LINK_HINT) {
            hintLink();
        } else if (hit.action == A_LINK_SHUFFLE) {
            shuffleLink(true);
        } else if (hit.action == A_MATCH_CELL) {
            clickMatch(hit.index / 7, hit.index % 7);
        } else if (hit.action == A_MATCH_SHUFFLE) {
            if (state.sun >= 2) {
                state.sun -= 2;
                if (mergeMode) shuffleMerge(); else startMatchBoard();
                toast("棋盘已重排", true);
            }
        } else if (hit.action == A_PUZZLE_MODE) {
            mergeMode = hit.index == 1;
            matchSelected = null;
        } else if (hit.action == A_MERGE_MOVE) {
            moveMerge(hit.index);
        } else if (hit.action == A_PET_SELECT) {
            result(state.adoptPet(hit.index), 320, layoutY(180));
        } else if (hit.action == A_PET_ACTION) {
            GameState.Result action = state.interactPet(hit.index);
            if (action.ok) {
                petAction = hit.index;
                petActionUntil = now + 1500L;
                addEffect("heart", 320, layoutY(420), CORAL, action.message);
            }
            result(action, 320, layoutY(590));
        } else if (hit.action == A_PET_FOOD) {
            result(state.makePetFood(), 130, layoutY(640));
        } else if (hit.action == A_PET_CLAIM) {
            result(state.claimVisitorCoins(), 540, layoutY(640));
        } else if (hit.action == A_PET_FACILITY) {
            result(state.buyFacility(hit.index), 520, layoutY(780));
        } else if (hit.action == A_PET_PAGE) {
            petPage = Math.max(0, Math.min(2, petPage + hit.index));
        } else if (hit.action == A_UNLOCK_PET) {
            result(state.unlockPetGarden(), 320, layoutY(520));
        }
        saveNow();
        invalidate();
    }

    private void startLinkBoard() {
        List<Integer> tiles = new ArrayList<>();
        for (int i = 0; i < 24; i++) {
            int value = i % LINK_NAMES.length;
            tiles.add(value);
            tiles.add(value);
        }
        Collections.shuffle(tiles, random);
        for (int r = 0; r < 8; r++) for (int c = 0; c < 6; c++) linkBoard[r][c] = tiles.get(r * 6 + c);
        linkSelected = null;
        if (findAnyLinkPair() == null) shuffleLink(false);
    }

    private void clickLink(int row, int col) {
        if (linkBoard[row][col] < 0) return;
        if (linkSelected == null) {
            linkSelected = new Point(col, row);
            return;
        }
        if (linkSelected.x == col && linkSelected.y == row) {
            linkSelected = null;
            return;
        }
        int first = linkBoard[linkSelected.y][linkSelected.x];
        int second = linkBoard[row][col];
        if (first != second) {
            toast("图案不同，请看文字和轮廓", false);
            addEffect("shake", 320, layoutY(500), CORAL, "不同");
            linkSelected = new Point(col, row);
            return;
        }
        List<Point> path = findLinkPath(linkSelected.y, linkSelected.x, row, col);
        if (path == null) {
            toast("这两个图案暂时连不到", false);
            addEffect("shake", 320, layoutY(500), CORAL, "挡住了");
            linkSelected = new Point(col, row);
            return;
        }
        int oldRow = linkSelected.y;
        int oldCol = linkSelected.x;
        linkBoard[oldRow][oldCol] = -1;
        linkBoard[row][col] = -1;
        linkPath = path;
        linkPathUntil = System.currentTimeMillis() + 430L;
        linkSelected = null;
        linkScore += 120;
        state.awardLinkPair();
        addEffect("pop", 43 + col * 93 + 41, layoutY(211 + row * 78) + 33, LINK_COLORS[first], "+120");
        collapseLink();
        if (remainingLinkTiles() == 0) {
            linkBoards++;
            linkFlow = linkBoards % 4;
            startLinkBoard();
            toast("清空一片田，继续下一片", true);
        } else if (findAnyLinkPair() == null) {
            shuffleLink(false);
            toast("没有可连组合，已自动重排", true);
        }
    }

    private void collapseLink() {
        if (linkFlow == 0 || linkFlow == 3) {
            for (int c = 0; c < 6; c++) {
                List<Integer> values = new ArrayList<>();
                for (int r = 0; r < 8; r++) if (linkBoard[r][c] >= 0) values.add(linkBoard[r][c]);
                for (int r = 0; r < 8; r++) linkBoard[r][c] = -1;
                if (linkFlow == 0) {
                    for (int i = 0; i < values.size(); i++) linkBoard[8 - values.size() + i][c] = values.get(i);
                } else {
                    for (int i = 0; i < values.size(); i++) linkBoard[i][c] = values.get(i);
                }
            }
        } else {
            for (int r = 0; r < 8; r++) {
                List<Integer> values = new ArrayList<>();
                for (int c = 0; c < 6; c++) if (linkBoard[r][c] >= 0) values.add(linkBoard[r][c]);
                Arrays.fill(linkBoard[r], -1);
                if (linkFlow == 1) {
                    for (int i = 0; i < values.size(); i++) linkBoard[r][i] = values.get(i);
                } else {
                    int start = (6 - values.size()) / 2;
                    for (int i = 0; i < values.size(); i++) linkBoard[r][start + i] = values.get(i);
                }
            }
        }
    }

    private List<Point> findLinkPath(int row1, int col1, int row2, int col2) {
        int rows = 10;
        int cols = 8;
        int targetR = row2 + 1;
        int targetC = col2 + 1;
        int[][][] best = new int[rows][cols][4];
        for (int[][] row : best) for (int[] cell : row) Arrays.fill(cell, 99);
        int[] dr = {-1, 1, 0, 0};
        int[] dc = {0, 0, -1, 1};
        Queue<LinkNode> queue = new ArrayDeque<>();
        int startR = row1 + 1;
        int startC = col1 + 1;
        for (int dir = 0; dir < 4; dir++) {
            int nr = startR + dr[dir];
            int nc = startC + dc[dir];
            if (linkPassable(nr, nc, targetR, targetC)) {
                LinkNode node = new LinkNode(nr, nc, dir, 0, null);
                best[nr][nc][dir] = 0;
                queue.add(node);
            }
        }
        while (!queue.isEmpty()) {
            LinkNode node = queue.remove();
            if (node.r == targetR && node.c == targetC) {
                List<Point> path = new ArrayList<>();
                path.add(new Point(col1, row1));
                LinkNode cursor = node;
                while (cursor != null) {
                    path.add(new Point(cursor.c - 1, cursor.r - 1));
                    cursor = cursor.parent;
                }
                Collections.reverse(path.subList(1, path.size()));
                return compressPath(path);
            }
            for (int dir = 0; dir < 4; dir++) {
                int turns = node.turns + (dir == node.dir ? 0 : 1);
                if (turns > 2) continue;
                int nr = node.r + dr[dir];
                int nc = node.c + dc[dir];
                if (!linkPassable(nr, nc, targetR, targetC) || best[nr][nc][dir] <= turns) continue;
                best[nr][nc][dir] = turns;
                queue.add(new LinkNode(nr, nc, dir, turns, node));
            }
        }
        return null;
    }

    private boolean linkPassable(int paddedRow, int paddedCol, int targetRow, int targetCol) {
        if (paddedRow < 0 || paddedRow >= 10 || paddedCol < 0 || paddedCol >= 8) return false;
        if (paddedRow == targetRow && paddedCol == targetCol) return true;
        if (paddedRow == 0 || paddedRow == 9 || paddedCol == 0 || paddedCol == 7) return true;
        return linkBoard[paddedRow - 1][paddedCol - 1] < 0;
    }

    private List<Point> compressPath(List<Point> source) {
        if (source.size() <= 2) return source;
        List<Point> result = new ArrayList<>();
        result.add(source.get(0));
        for (int i = 1; i < source.size() - 1; i++) {
            Point a = source.get(i - 1);
            Point b = source.get(i);
            Point c = source.get(i + 1);
            if ((b.x - a.x) != (c.x - b.x) || (b.y - a.y) != (c.y - b.y)) result.add(b);
        }
        result.add(source.get(source.size() - 1));
        return result;
    }

    private int[] findAnyLinkPair() {
        for (int r1 = 0; r1 < 8; r1++) {
            for (int c1 = 0; c1 < 6; c1++) {
                if (linkBoard[r1][c1] < 0) continue;
                for (int r2 = r1; r2 < 8; r2++) {
                    for (int c2 = 0; c2 < 6; c2++) {
                        if (r1 == r2 && c2 <= c1) continue;
                        if (linkBoard[r1][c1] == linkBoard[r2][c2] && findLinkPath(r1, c1, r2, c2) != null) {
                            return new int[]{r1, c1, r2, c2};
                        }
                    }
                }
            }
        }
        return null;
    }

    private void hintLink() {
        if (state.sun < 1) return;
        int[] pair = findAnyLinkPair();
        if (pair == null) {
            shuffleLink(false);
            pair = findAnyLinkPair();
        }
        if (pair != null) {
            state.sun--;
            linkSelected = new Point(pair[1], pair[0]);
            linkPath = findLinkPath(pair[0], pair[1], pair[2], pair[3]);
            linkPathUntil = System.currentTimeMillis() + 1200L;
            toast("已标出一组可连接图案", true);
        }
    }

    private void shuffleLink(boolean paid) {
        if (paid) {
            if (state.sun < 1) return;
            state.sun--;
        }
        List<Integer> values = new ArrayList<>();
        for (int[] row : linkBoard) for (int value : row) if (value >= 0) values.add(value);
        for (int tries = 0; tries < 30; tries++) {
            Collections.shuffle(values, random);
            int index = 0;
            for (int r = 0; r < 8; r++) for (int c = 0; c < 6; c++) if (linkBoard[r][c] >= 0) linkBoard[r][c] = values.get(index++);
            if (findAnyLinkPair() != null) break;
        }
        linkSelected = null;
        if (paid) toast("棋盘已重排", true);
    }

    private void startMatchBoard() {
        for (int r = 0; r < 7; r++) {
            for (int c = 0; c < 7; c++) {
                int value;
                do value = random.nextInt(7);
                while ((c >= 2 && matchBoard[r][c - 1] == value && matchBoard[r][c - 2] == value)
                    || (r >= 2 && matchBoard[r - 1][c] == value && matchBoard[r - 2][c] == value));
                matchBoard[r][c] = value;
            }
        }
        matchSelected = null;
    }

    private void clickMatch(int row, int col) {
        Point next = new Point(col, row);
        if (matchSelected == null) {
            matchSelected = next;
            return;
        }
        if (Math.abs(matchSelected.x - col) + Math.abs(matchSelected.y - row) == 1) {
            tryMatchSwap(matchSelected, next);
            matchSelected = null;
        } else {
            matchSelected = next;
        }
    }

    private void tryMatchSwap(Point a, Point b) {
        swap(matchBoard, a.y, a.x, b.y, b.x);
        Set<Integer> matches = findMatches();
        if (matches.isEmpty()) {
            swap(matchBoard, a.y, a.x, b.y, b.x);
            toast("没有形成三连，棋子已回弹", false);
            addEffect("shake", (45 + a.x * 79 + 35 + 45 + b.x * 79 + 35) / 2f,
                (layoutY(278 + a.y * 77) + 34 + layoutY(278 + b.y * 77) + 34) / 2f, CORAL, "未消除");
            return;
        }
        resolveMatches(matches);
    }

    private Set<Integer> findMatches() {
        Set<Integer> result = new HashSet<>();
        for (int r = 0; r < 7; r++) {
            int start = 0;
            for (int c = 1; c <= 7; c++) {
                if (c < 7 && matchBoard[r][c] == matchBoard[r][start]) continue;
                if (c - start >= 3) for (int i = start; i < c; i++) result.add(r * 7 + i);
                start = c;
            }
        }
        for (int c = 0; c < 7; c++) {
            int start = 0;
            for (int r = 1; r <= 7; r++) {
                if (r < 7 && matchBoard[r][c] == matchBoard[start][c]) continue;
                if (r - start >= 3) for (int i = start; i < r; i++) result.add(i * 7 + c);
                start = r;
            }
        }
        return result;
    }

    private void resolveMatches(Set<Integer> matches) {
        int removed = 0;
        int cascades = 0;
        while (!matches.isEmpty() && cascades < 12) {
            for (int cell : matches) {
                int r = cell / 7;
                int c = cell % 7;
                if (matchBoard[r][c] >= 0) {
                    addEffect("pop", 45 + c * 79 + 35, layoutY(278 + r * 77) + 34, MATCH_COLORS[matchBoard[r][c]], "+" + (40 + cascades * 10));
                    matchBoard[r][c] = -1;
                    removed++;
                }
            }
            collapseMatch();
            matches = findMatches();
            cascades++;
        }
        matchScore += removed * 40 * Math.max(1, cascades);
        state.awardMatchPieces(removed);
        toast((cascades > 1 ? "连锁 " + cascades + " 次，" : "") + "消除 " + removed + " 格", true);
    }

    private void collapseMatch() {
        for (int c = 0; c < 7; c++) {
            int write = 6;
            for (int r = 6; r >= 0; r--) if (matchBoard[r][c] >= 0) matchBoard[write--][c] = matchBoard[r][c];
            while (write >= 0) matchBoard[write--][c] = random.nextInt(7);
        }
    }

    private void moveMerge(int direction) {
        int[][] before = copyBoard(mergeBoard);
        int merges = 0;
        int gained = 0;
        for (int line = 0; line < 4; line++) {
            int[] values = new int[4];
            for (int pos = 0; pos < 4; pos++) {
                int r = direction == 0 ? pos : direction == 1 ? 3 - pos : line;
                int c = direction == 2 ? pos : direction == 3 ? 3 - pos : line;
                values[pos] = mergeBoard[r][c];
            }
            int[] compact = new int[4];
            int write = 0;
            for (int value : values) {
                if (value == 0) continue;
                if (write > 0 && compact[write - 1] == value) {
                    compact[write - 1]++;
                    gained += 1 << compact[write - 1];
                    merges++;
                } else compact[write++] = value;
            }
            for (int pos = 0; pos < 4; pos++) {
                int r = direction == 0 ? pos : direction == 1 ? 3 - pos : line;
                int c = direction == 2 ? pos : direction == 3 ? 3 - pos : line;
                mergeBoard[r][c] = compact[pos];
            }
        }
        if (boardsEqual(before, mergeBoard)) {
            toast("这个方向没有可移动的方块", false);
            return;
        }
        mergeScore += gained;
        if (merges > 0) {
            state.awardMatchPieces(merges * 3);
            addEffect("pop", 320, layoutY(500), YELLOW, "合成 +" + gained);
        }
        addMergeTile();
        if (!mergeHasMove()) {
            shuffleMerge();
            toast("棋盘已满，自动整理后继续", true);
        }
    }

    private void addMergeTile() {
        List<Point> empty = new ArrayList<>();
        for (int r = 0; r < 4; r++) for (int c = 0; c < 4; c++) if (mergeBoard[r][c] == 0) empty.add(new Point(c, r));
        if (empty.isEmpty()) return;
        Point cell = empty.get(random.nextInt(empty.size()));
        mergeBoard[cell.y][cell.x] = random.nextFloat() < 0.82f ? 1 : 2;
    }

    private void shuffleMerge() {
        List<Integer> values = new ArrayList<>();
        for (int[] row : mergeBoard) for (int value : row) if (value > 0) values.add(value);
        Collections.shuffle(values, random);
        for (int[] row : mergeBoard) Arrays.fill(row, 0);
        int index = 0;
        for (int r = 0; r < 4 && index < values.size(); r++) {
            for (int c = 0; c < 4 && index < values.size(); c++) mergeBoard[r][c] = values.get(index++);
        }
        if (!mergeHasMove()) {
            mergeBoard[0][0] = 1;
            mergeBoard[0][1] = 1;
        }
    }

    private boolean mergeHasMove() {
        for (int r = 0; r < 4; r++) {
            for (int c = 0; c < 4; c++) {
                if (mergeBoard[r][c] == 0) return true;
                if (r < 3 && mergeBoard[r][c] == mergeBoard[r + 1][c]) return true;
                if (c < 3 && mergeBoard[r][c] == mergeBoard[r][c + 1]) return true;
            }
        }
        return false;
    }

    private void drawEffects(Canvas canvas) {
        long now = System.currentTimeMillis();
        for (Effect effect : effects) {
            float t = Math.max(0f, Math.min(1f, (now - effect.started) / (float) (effect.until - effect.started)));
            int alpha = Math.round(255 * (1f - t));
            if ("water".equals(effect.type)) {
                for (int i = 0; i < 6; i++) drawDrop(canvas, effect.x - 32 + i * 13, effect.y - 30 + t * 38 + (i % 2) * 7, withAlpha(effect.color, alpha));
            } else if ("spark".equals(effect.type) || "pop".equals(effect.type) || "heart".equals(effect.type)) {
                for (int i = 0; i < 8; i++) {
                    double angle = Math.PI * 2d * i / 8d;
                    drawSpark(canvas, effect.x + (float) Math.cos(angle) * t * 42, effect.y + (float) Math.sin(angle) * t * 42, withAlpha(effect.color, alpha), 1f - t * 0.5f);
                }
            } else if ("harvest".equals(effect.type) || "sprout".equals(effect.type)) {
                circle(canvas, effect.x, effect.y, 12 + t * 35, Color.TRANSPARENT, withAlpha(effect.color, alpha), 4);
            } else if ("shake".equals(effect.type)) {
                float shift = (float) Math.sin(t * Math.PI * 8) * 18 * (1f - t);
                text(canvas, effect.text, effect.x + shift, effect.y - t * 35, 12, withAlpha(effect.color, alpha), Paint.Align.CENTER, true);
            }
            if (!effect.text.isEmpty() && !"shake".equals(effect.type)) {
                text(canvas, effect.text, effect.x, effect.y - 28 - t * 34, 11, withAlpha(effect.color, alpha), Paint.Align.CENTER, true);
            }
        }
    }

    private void addEffect(String type, float x, float y, int color, String label) {
        long now = System.currentTimeMillis();
        effects.add(new Effect(type, x, y, color, label, now, now + 850L));
    }

    private void drawToast(Canvas canvas) {
        long now = System.currentTimeMillis();
        if (now >= toastUntil || toastText.isEmpty()) return;
        float alpha = Math.min(1f, (toastUntil - now) / 240f);
        int color = toastGood ? GREEN_SOFT : Color.rgb(245, 183, 174);
        int width = Math.min(590, Math.max(260, toastText.length() * 15 + 54));
        float y = layoutY(846);
        round(canvas, 320 - width / 2f, y, width, 32, 6, withAlpha(color, Math.round(255 * alpha)), INK, 2);
        text(canvas, toastText, 320, y + 16, 10, INK, Paint.Align.CENTER, true);
    }

    private void toast(String message, boolean good) {
        toastText = message;
        toastGood = good;
        toastUntil = System.currentTimeMillis() + 2100L;
    }

    private void result(GameState.Result result, float x, float y) {
        toast(result.message, result.ok);
        if (result.ok) addEffect("pop", x, y, GREEN, "完成");
    }

    private void title(Canvas canvas, String heading, String subtitle) {
        text(canvas, heading, 18, 134, 18, INK, Paint.Align.LEFT, true);
        text(canvas, subtitle, 622, 134, 9, GREEN_DARK, Paint.Align.RIGHT, false);
    }

    private void drawResourceIcon(Canvas canvas, int type, float x, float y, int color) {
        if (type == 0) {
            circle(canvas, x, y, 8, color, INK, 2);
            text(canvas, "¥", x, y + 1, 8, INK, Paint.Align.CENTER, true);
        } else if (type == 1) {
            fill(canvas, x - 8, y - 6, 16, 12, color);
            stroke(canvas, x - 8, y - 6, 16, 12, INK, 2);
            fill(canvas, x - 2, y - 4, 4, 8, PAPER);
        } else if (type == 2) {
            fill(canvas, x - 7, y - 6, 14, 13, color);
            stroke(canvas, x - 7, y - 6, 14, 13, INK, 2);
            fill(canvas, x - 3, y - 10, 6, 4, GREEN_DARK);
        } else if (type == 3) {
            circle(canvas, x, y, 8, color, INK, 2);
            circle(canvas, x, y, 3, PAPER, null, 0);
        } else if (type == 4) {
            circle(canvas, x, y, 7, color, INK, 2);
            for (int i = 0; i < 8; i++) {
                double angle = i * Math.PI / 4;
                line(canvas, x + (float) Math.cos(angle) * 10, y + (float) Math.sin(angle) * 10, x + (float) Math.cos(angle) * 13, y + (float) Math.sin(angle) * 13, INK, 2);
            }
        } else {
            text(canvas, "★", x, y + 1, 18, color, Paint.Align.CENTER, true);
        }
    }

    private void drawNavIcon(Canvas canvas, int type, float x, float y, int color) {
        if (type == 0) {
            for (int r = 0; r < 2; r++) for (int c = 0; c < 2; c++) fill(canvas, x - 12 + c * 14, y - 10 + r * 12, 10, 9, color);
        } else if (type == 1) {
            fill(canvas, x - 16, y - 7, 13, 13, color);
            fill(canvas, x + 3, y - 7, 13, 13, color);
            line(canvas, x - 3, y, x + 3, y, color, 3);
        } else if (type == 2) {
            drawMatchIcon(canvas, 0, x - 7, y, 7);
            drawMatchIcon(canvas, 1, x + 8, y, 7);
        } else if (type == 3) {
            fill(canvas, x - 16, y - 8, 32, 17, color);
            fill(canvas, x - 12, y - 13, 24, 5, CORAL);
            fill(canvas, x - 7, y, 7, 9, PAPER);
        } else {
            circle(canvas, x, y, 13, YELLOW_SOFT, color, 2);
            fill(canvas, x - 8, y - 5, 16, 12, color);
            fill(canvas, x - 5, y - 2, 10, 7, YELLOW_SOFT);
        }
    }

    private void drawCrop(Canvas canvas, int cropIndex, float x, float y, float s) {
        if (assets.crops != null) {
            int sourceSize = Math.max(1, assets.crops.getHeight());
            int sourceX = Math.max(0, Math.min(cropIndex, GameData.CROPS.length - 1)) * sourceSize;
            float size = 38f * s;
            Rect source = new Rect(sourceX, 0, sourceX + sourceSize, sourceSize);
            RectF target = new RectF(x - size / 2f, y - size / 2f, x + size / 2f, y + size / 2f);
            canvas.drawBitmap(assets.crops, source, target, bitmapPaint);
            return;
        }
        GameData.Crop crop = GameData.crop(cropIndex);
        fill(canvas, x - 2 * s, y - 16 * s, 4 * s, 10 * s, GREEN_DARK);
        fill(canvas, x - 10 * s, y - 14 * s, 9 * s, 5 * s, GREEN);
        fill(canvas, x + 1 * s, y - 14 * s, 9 * s, 5 * s, GREEN);
        if (cropIndex == 4) {
            fill(canvas, x - 7 * s, y - 7 * s, 14 * s, 25 * s, crop.color);
            for (int r = 0; r < 4; r++) for (int c = 0; c < 2; c++) fill(canvas, x + (-4 + c * 5) * s, y + (-3 + r * 5) * s, 3 * s, 3 * s, YELLOW_SOFT);
        } else if (cropIndex == 1) {
            fill(canvas, x - 13 * s, y - 7 * s, 26 * s, 22 * s, crop.color);
            fill(canvas, x - 5 * s, y - 5 * s, 10 * s, 20 * s, GREEN_SOFT);
        } else if (cropIndex == 5) {
            Path path = new Path();
            path.moveTo(x - 11 * s, y - 5 * s);
            path.lineTo(x + 11 * s, y - 5 * s);
            path.lineTo(x, y + 18 * s);
            path.close();
            paint.setColor(crop.color);
            canvas.drawPath(path, paint);
            fill(canvas, x - 5 * s, y, 3 * s, 3 * s, YELLOW_SOFT);
            fill(canvas, x + 4 * s, y + 5 * s, 3 * s, 3 * s, YELLOW_SOFT);
        } else {
            fill(canvas, x - 10 * s, y - 6 * s, 20 * s, 21 * s, crop.color);
            fill(canvas, x - 7 * s, y - 3 * s, 4 * s, 10 * s, Color.argb(100, 255, 255, 255));
        }
    }

    private void drawRobot(Canvas canvas, float x, float y, boolean harvester, boolean enabled, int seed) {
        long now = System.currentTimeMillis();
        float bob = enabled ? (float) Math.sin(now / 170d + seed) * 2f : 0f;
        int body = enabled ? (harvester ? CORAL : SKY) : LOCK;
        fill(canvas, x - 14, y - 13 + bob, 28, 21, body);
        stroke(canvas, x - 14, y - 13 + bob, 28, 21, INK, 2);
        fill(canvas, x - 7, y - 19 + bob, 14, 6, YELLOW_SOFT);
        fill(canvas, x - 8, y - 6 + bob, 5, 5, INK);
        fill(canvas, x + 3, y - 6 + bob, 5, 5, INK);
        fill(canvas, x - 12, y + 8 + bob, 7, 5, INK);
        fill(canvas, x + 5, y + 8 + bob, 7, 5, INK);
        if (enabled && !harvester) {
            line(canvas, x + 14, y - 5 + bob, x + 24, y - 12 + bob, BLUE, 3);
            drawDrop(canvas, x + 27, y - 15 + bob, SKY);
        } else if (enabled) {
            line(canvas, x + 14, y - 3 + bob, x + 25, y + 4 + bob, INK, 3);
            fill(canvas, x + 22, y + 2 + bob, 8, 8, GREEN);
        }
    }

    private void drawLinkIcon(Canvas canvas, int value, float x, float y) {
        int color = LINK_COLORS[value];
        if (value % 5 == 0) {
            circle(canvas, x, y, 15, color, INK, 2);
            fill(canvas, x - 2, y - 22, 4, 8, GREEN_DARK);
        } else if (value % 5 == 1) {
            fill(canvas, x - 15, y - 12, 30, 24, color);
            fill(canvas, x - 4, y - 16, 8, 30, GREEN_SOFT);
        } else if (value % 5 == 2) {
            Path path = new Path();
            for (int i = 0; i < 6; i++) {
                double a = -Math.PI / 2 + i * Math.PI / 3;
                float px = x + (float) Math.cos(a) * 17;
                float py = y + (float) Math.sin(a) * 17;
                if (i == 0) path.moveTo(px, py); else path.lineTo(px, py);
            }
            path.close();
            paint.setColor(color);
            canvas.drawPath(path, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(2);
            paint.setColor(INK);
            canvas.drawPath(path, paint);
            paint.setStyle(Paint.Style.FILL);
        } else if (value % 5 == 3) {
            Path path = new Path();
            path.moveTo(x, y - 18);
            path.lineTo(x + 17, y);
            path.lineTo(x, y + 18);
            path.lineTo(x - 17, y);
            path.close();
            paint.setColor(color);
            canvas.drawPath(path, paint);
        } else {
            fill(canvas, x - 18, y - 10, 36, 20, color);
            fill(canvas, x - 11, y - 15, 22, 30, color);
        }
        text(canvas, String.valueOf(value + 1), x, y, 8, Color.WHITE, Paint.Align.CENTER, true);
    }

    private void drawMatchIcon(Canvas canvas, int value, float x, float y, float radius) {
        int color = MATCH_COLORS[value % MATCH_COLORS.length];
        if (value % 4 == 0) circle(canvas, x, y, radius, color, INK, 2);
        else if (value % 4 == 1) round(canvas, x - radius, y - radius, radius * 2, radius * 2, 3, color, INK, 2);
        else if (value % 4 == 2) {
            Path path = new Path();
            path.moveTo(x, y - radius);
            path.lineTo(x + radius, y);
            path.lineTo(x, y + radius);
            path.lineTo(x - radius, y);
            path.close();
            paint.setColor(color);
            canvas.drawPath(path, paint);
            paint.setStyle(Paint.Style.STROKE);
            paint.setColor(INK);
            paint.setStrokeWidth(2);
            canvas.drawPath(path, paint);
            paint.setStyle(Paint.Style.FILL);
        } else {
            fill(canvas, x - radius, y - radius * 0.6f, radius * 2, radius * 1.2f, color);
            circle(canvas, x - radius * 0.55f, y, radius * 0.65f, color, INK, 1);
            circle(canvas, x + radius * 0.55f, y, radius * 0.65f, color, INK, 1);
        }
    }

    private void drawLinkPath(Canvas canvas) {
        if (linkPath == null || linkPath.size() < 2) return;
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(5);
        paint.setColor(YELLOW);
        Path path = new Path();
        for (int i = 0; i < linkPath.size(); i++) {
            Point point = linkPath.get(i);
            float x = point.x < 0 ? 24 : point.x >= 6 ? 616 : 43 + point.x * 93 + 41;
            float y = point.y < 0 ? layoutY(204) : point.y >= 8 ? layoutY(836) : layoutY(211 + point.y * 78) + 33;
            if (i == 0) path.moveTo(x, y); else path.lineTo(x, y);
        }
        canvas.drawPath(path, paint);
        paint.setStyle(Paint.Style.FILL);
    }

    private void drawDrop(Canvas canvas, float x, float y, int color) {
        Path path = new Path();
        path.moveTo(x, y - 8);
        path.lineTo(x + 6, y + 2);
        path.quadTo(x + 6, y + 8, x, y + 8);
        path.quadTo(x - 6, y + 8, x - 6, y + 2);
        path.close();
        paint.setColor(color);
        canvas.drawPath(path, paint);
    }

    private void drawSpark(Canvas canvas, float x, float y, int color, float s) {
        fill(canvas, x - 2 * s, y - 7 * s, 4 * s, 14 * s, color);
        fill(canvas, x - 7 * s, y - 2 * s, 14 * s, 4 * s, color);
    }

    private void drawStatusBar(Canvas canvas, String label, float value, float x, float y, int color) {
        text(canvas, label, x, y, 8, INK, Paint.Align.LEFT, true);
        fill(canvas, x + 13, y - 4, 43, 7, PAPER_2);
        fill(canvas, x + 13, y - 4, 43 * value / 100f, 7, color);
    }

    private void drawPetCardStatus(Canvas canvas, int pet, float x, float y) {
        float[] values = {state.petHunger[pet], state.petHappy[pet], state.petClean[pet]};
        int[] colors = {CORAL, YELLOW, SKY};
        String[] labels = {"饱", "乐", "净"};
        for (int i = 0; i < 3; i++) {
            float left = x + i * 27;
            text(canvas, labels[i], left, y, 6, INK_SOFT, Paint.Align.LEFT, true);
            fill(canvas, left + 8, y - 4, 17, 4, PAPER_2);
            fill(canvas, left + 8, y - 4, 17 * values[i] / 100f, 4, colors[i]);
        }
    }

    private void drawPet(Canvas canvas, int type, float x, float y, float s, boolean acting) {
        long now = System.currentTimeMillis();
        float squash = acting ? 1f + (float) Math.sin(now / 90d) * 0.05f : 1f;
        if (assets.petSprites != null) {
            int column = 0;
            if (acting) {
                if (petAction == 0) column = 2;
                else if (petAction == 2) column = 3;
                else if (petAction == 3 || petAction == 4) column = 4;
            } else if (state.petGardenUnlocked && y > layoutY(300) && y < layoutY(570)) {
                column = 1;
            }
            int cellWidth = assets.petSprites.getWidth() / 6;
            int cellHeight = assets.petSprites.getHeight() / 4;
            int insetX = Math.max(1, Math.round(cellWidth * 0.035f));
            int insetY = Math.max(2, Math.round(cellHeight * 0.055f));
            Rect source = new Rect(
                column * cellWidth + insetX,
                type * cellHeight + insetY,
                (column + 1) * cellWidth - insetX,
                (type + 1) * cellHeight - insetY
            );
            float size = 105f * s;
            float bob = acting
                ? (float) Math.sin(now / 90d) * 3f
                : (float) Math.sin(now / 430d + type) * 1.3f;
            canvas.save();
            canvas.translate(x, y - bob);
            canvas.scale(1f, squash);
            paint.setColor(Color.argb(45, 52, 70, 74));
            canvas.drawOval(new RectF(-size * 0.34f, -size * 0.08f, size * 0.34f, size * 0.08f), paint);
            canvas.drawBitmap(
                assets.petSprites,
                source,
                new RectF(-size / 2f, -size, size / 2f, 0),
                bitmapPaint
            );
            canvas.restore();
            return;
        }
        canvas.save();
        canvas.translate(x, y);
        canvas.scale(s, s * squash);
        if (type == 0) {
            fill(canvas, -22, -25, 44, 40, Color.rgb(219, 154, 85));
            fill(canvas, -30, -30, 12, 30, Color.rgb(146, 90, 50));
            fill(canvas, 18, -30, 12, 30, Color.rgb(146, 90, 50));
            fill(canvas, -13, 15, 10, 18, Color.rgb(219, 154, 85));
            fill(canvas, 5, 15, 10, 18, Color.rgb(219, 154, 85));
            fill(canvas, -8, -8, 16, 13, CREAM);
        } else if (type == 1) {
            fill(canvas, -22, -25, 44, 42, Color.rgb(235, 139, 55));
            triangle(canvas, -22, -23, -10, -40, -2, -20, Color.rgb(235, 139, 55));
            triangle(canvas, 2, -20, 10, -40, 22, -23, Color.rgb(235, 139, 55));
            fill(canvas, -15, 17, 10, 15, Color.rgb(235, 139, 55));
            fill(canvas, 5, 17, 10, 15, Color.rgb(235, 139, 55));
            line(canvas, 20, 8, 34, -1, Color.rgb(235, 139, 55), 7);
        } else if (type == 2) {
            fill(canvas, -20, -22, 40, 40, Color.WHITE);
            fill(canvas, -16, -53, 12, 35, Color.WHITE);
            fill(canvas, 4, -53, 12, 35, Color.WHITE);
            fill(canvas, -14, 18, 10, 16, Color.WHITE);
            fill(canvas, 4, 18, 10, 16, Color.WHITE);
            fill(canvas, -12, -45, 5, 20, Color.rgb(246, 184, 195));
            fill(canvas, 7, -45, 5, 20, Color.rgb(246, 184, 195));
        } else {
            circle(canvas, 0, -3, 24, Color.rgb(248, 207, 68), INK, 2);
            fill(canvas, -11, 18, 7, 11, Color.rgb(226, 145, 45));
            fill(canvas, 4, 18, 7, 11, Color.rgb(226, 145, 45));
            triangle(canvas, 19, -8, 32, -2, 19, 3, Color.rgb(228, 114, 43));
        }
        if (type != 3) {
            fill(canvas, -11, -13, 5, 6, INK);
            fill(canvas, 6, -13, 5, 6, INK);
            fill(canvas, -3, -3, 6, 5, INK);
        } else {
            fill(canvas, -10, -10, 5, 5, INK);
            fill(canvas, 5, -10, 5, 5, INK);
        }
        canvas.restore();
    }

    private void drawFacilitySprite(Canvas canvas, int column, int row, float x, float y, float size) {
        if (assets.petFacilities == null) {
            if (column == 1 && row == 0) drawKennel(canvas, x, y);
            else if (column == 2 && row == 0) drawPond(canvas, x, y);
            else if (column == 3 && row == 0) drawFeeder(canvas, x, y);
            else if (column == 0 && row == 1) drawToyBox(canvas, x, y);
            else if (column == 1 && row == 1) drawGrooming(canvas, x, y);
            else if (column == 2 && row == 1) drawFlowerArch(canvas, x, y);
            else if (column == 3 && row == 1) drawLamp(canvas, x, y);
            else if (column == 0 && row == 2) drawPicnic(canvas, x, y);
            return;
        }
        int cellWidth = assets.petFacilities.getWidth() / 4;
        int cellHeight = assets.petFacilities.getHeight() / 3;
        Rect source = new Rect(
            column * cellWidth,
            row * cellHeight,
            (column + 1) * cellWidth,
            (row + 1) * cellHeight
        );
        canvas.drawBitmap(
            assets.petFacilities,
            source,
            new RectF(x - size / 2f, y - size / 2f, x + size / 2f, y + size / 2f),
            bitmapPaint
        );
    }

    private void drawBitmapCenterCrop(Canvas canvas, Bitmap bitmap, RectF target) {
        float sourceAspect = bitmap.getWidth() / (float) bitmap.getHeight();
        float targetAspect = target.width() / target.height();
        Rect source;
        if (sourceAspect > targetAspect) {
            int sourceWidth = Math.round(bitmap.getHeight() * targetAspect);
            int left = (bitmap.getWidth() - sourceWidth) / 2;
            source = new Rect(left, 0, left + sourceWidth, bitmap.getHeight());
        } else {
            int sourceHeight = Math.round(bitmap.getWidth() / targetAspect);
            int top = (bitmap.getHeight() - sourceHeight) / 2;
            source = new Rect(0, top, bitmap.getWidth(), top + sourceHeight);
        }
        canvas.drawBitmap(bitmap, source, target, bitmapPaint);
    }

    private void drawKennel(Canvas canvas, float x, float y) {
        fill(canvas, x - 34, y - 34, 68, 58, Color.rgb(151, 91, 55));
        triangle(canvas, x - 42, y - 34, x, y - 70, x + 42, y - 34, Color.rgb(74, 116, 137));
        round(canvas, x - 15, y - 3, 30, 27, 15, INK, null, 0);
    }

    private void drawPond(Canvas canvas, float x, float y) {
        circle(canvas, x, y, 43, Color.rgb(117, 139, 119), INK, 2);
        circle(canvas, x, y, 34, SKY, null, 0);
        for (int i = 0; i < 6; i++) circle(canvas, x - 34 + i * 14, y - 26 + (i % 2) * 53, 8, Color.rgb(163, 166, 142), null, 0);
    }

    private void drawFeeder(Canvas canvas, float x, float y) {
        fill(canvas, x - 18, y - 32, 36, 45, Color.rgb(92, 137, 156));
        stroke(canvas, x - 18, y - 32, 36, 45, INK, 2);
        fill(canvas, x - 11, y - 22, 22, 13, YELLOW_SOFT);
        fill(canvas, x - 25, y + 13, 50, 13, SOIL_DARK);
    }

    private void drawToyBox(Canvas canvas, float x, float y) {
        fill(canvas, x - 25, y - 13, 50, 26, CORAL);
        stroke(canvas, x - 25, y - 13, 50, 26, INK, 2);
        circle(canvas, x - 12, y - 20, 10, YELLOW, INK, 1);
        circle(canvas, x + 10, y - 19, 8, SKY, INK, 1);
    }

    private void drawGrooming(Canvas canvas, float x, float y) {
        fill(canvas, x - 29, y - 10, 58, 16, CREAM);
        fill(canvas, x - 22, y + 6, 8, 28, SOIL_DARK);
        fill(canvas, x + 14, y + 6, 8, 28, SOIL_DARK);
        fill(canvas, x - 5, y - 38, 10, 28, CORAL);
    }

    private void drawFlowerArch(Canvas canvas, float x, float y) {
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(10);
        paint.setColor(GREEN_DARK);
        canvas.drawArc(new RectF(x - 40, y - 12, x + 40, y + 82), 180, 180, false, paint);
        paint.setStyle(Paint.Style.FILL);
        for (int i = 0; i < 6; i++) circle(canvas, x - 35 + i * 14, y + 4 + Math.abs(3 - i) * 4, 7, i % 2 == 0 ? CORAL : YELLOW, INK, 1);
    }

    private void drawLamp(Canvas canvas, float x, float y) {
        fill(canvas, x - 3, y - 35, 6, 46, INK);
        round(canvas, x - 12, y - 48, 24, 18, 2, YELLOW, INK, 2);
    }

    private void drawPicnic(Canvas canvas, float x, float y) {
        fill(canvas, x - 35, y - 16, 70, 32, Color.rgb(244, 209, 169));
        for (int i = 0; i < 5; i++) fill(canvas, x - 35 + i * 16, y - 16, 8, 32, i % 2 == 0 ? CORAL : CREAM);
        stroke(canvas, x - 35, y - 16, 70, 32, INK, 2);
    }

    private void triangle(Canvas canvas, float x1, float y1, float x2, float y2, float x3, float y3, int color) {
        Path path = new Path();
        path.moveTo(x1, y1);
        path.lineTo(x2, y2);
        path.lineTo(x3, y3);
        path.close();
        paint.setColor(color);
        canvas.drawPath(path, paint);
    }

    private Point matchCellAt(float x, float y) {
        int col = (int) ((x - 45) / 79);
        if (col < 0 || col >= 7) return null;
        for (int row = 0; row < 7; row++) {
            float top = layoutY(278 + row * 77);
            if (y >= top && y <= top + 68) return new Point(col, row);
        }
        return null;
    }

    private int remainingLinkTiles() {
        int count = 0;
        for (int[] row : linkBoard) for (int value : row) if (value >= 0) count++;
        return count;
    }

    private int produceCount() {
        int count = 0;
        for (int value : state.produce) count += value;
        return count;
    }

    private int produceValue() {
        int value = 0;
        for (int i = 0; i < state.produce.length; i++) value += state.produce[i] * GameData.crop(i).sellPrice;
        return Math.round(value * (1f + state.marketLevel * 0.06f));
    }

    private float plotCenterX(int index) {
        return 18 + (index % 3) * 207 + 98;
    }

    private float plotCenterY(int index) {
        return layoutY(237 + (index / 3) * 94) + 43;
    }

    private float layoutY(float baseY) {
        float progress = Math.max(0f, Math.min(1f, (baseY - 153f) / 735f));
        return baseY + layoutExtra * progress;
    }

    private String mergeName(int value) {
        String[] names = {"种子", "嫩芽", "菜苗", "鲜蔬", "菜篮", "菜筐", "货车", "仓库"};
        return names[Math.min(names.length - 1, Math.max(0, value - 1))];
    }

    private static void swap(int[][] board, int r1, int c1, int r2, int c2) {
        int value = board[r1][c1];
        board[r1][c1] = board[r2][c2];
        board[r2][c2] = value;
    }

    private static int[][] copyBoard(int[][] source) {
        int[][] result = new int[source.length][];
        for (int i = 0; i < source.length; i++) result[i] = source[i].clone();
        return result;
    }

    private static boolean boardsEqual(int[][] a, int[][] b) {
        for (int i = 0; i < a.length; i++) if (!Arrays.equals(a[i], b[i])) return false;
        return true;
    }

    private static boolean inside(int row, int col, int rows, int cols) {
        return row >= 0 && row < rows && col >= 0 && col < cols;
    }

    private static int count(boolean[] source) {
        int result = 0;
        for (boolean value : source) if (value) result++;
        return result;
    }

    private static int withAlpha(int color, int alpha) {
        return Color.argb(Math.max(0, Math.min(255, alpha)), Color.red(color), Color.green(color), Color.blue(color));
    }

    private void addHit(int action, int index, float x, float y, float w, float h) {
        hits.add(new Hit(action, index, new RectF(x, y, x + w, y + h)));
    }

    private void button(Canvas canvas, String label, int action, int index, float x, float y, float w, float h, int color, boolean disabled) {
        round(canvas, x, y, w, h, 5, disabled ? PAPER_2 : color, disabled ? LOCK : INK, 2);
        text(canvas, label, x + w / 2f, y + h / 2f + 1, 10, disabled ? LOCK : INK, Paint.Align.CENTER, true);
        Hit hit = new Hit(action, index, new RectF(x, y, x + w, y + h));
        hit.disabled = disabled;
        hits.add(hit);
    }

    private void card(Canvas canvas, float x, float y, float w, float h, int color, float line) {
        round(canvas, x, y, w, h, 6, color, INK, line);
    }

    private void fill(Canvas canvas, float x, float y, float w, float h, int color) {
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(color);
        canvas.drawRect(x, y, x + w, y + h, paint);
    }

    private void stroke(Canvas canvas, float x, float y, float w, float h, int color, float width) {
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(width);
        paint.setColor(color);
        canvas.drawRect(x, y, x + w, y + h, paint);
        paint.setStyle(Paint.Style.FILL);
    }

    private void round(Canvas canvas, float x, float y, float w, float h, float radius, int fill, Integer stroke, float width) {
        RectF rect = new RectF(x, y, x + w, y + h);
        paint.setStyle(Paint.Style.FILL);
        paint.setColor(fill);
        canvas.drawRoundRect(rect, radius, radius, paint);
        if (stroke != null && width > 0) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(width);
            paint.setColor(stroke);
            canvas.drawRoundRect(rect, radius, radius, paint);
            paint.setStyle(Paint.Style.FILL);
        }
    }

    private void circle(Canvas canvas, float x, float y, float radius, int fill, Integer stroke, float width) {
        if (Color.alpha(fill) > 0) {
            paint.setStyle(Paint.Style.FILL);
            paint.setColor(fill);
            canvas.drawCircle(x, y, radius, paint);
        }
        if (stroke != null && width > 0) {
            paint.setStyle(Paint.Style.STROKE);
            paint.setStrokeWidth(width);
            paint.setColor(stroke);
            canvas.drawCircle(x, y, radius, paint);
            paint.setStyle(Paint.Style.FILL);
        }
    }

    private void line(Canvas canvas, float x1, float y1, float x2, float y2, int color, float width) {
        paint.setStyle(Paint.Style.STROKE);
        paint.setStrokeWidth(width);
        paint.setColor(color);
        canvas.drawLine(x1, y1, x2, y2, paint);
        paint.setStyle(Paint.Style.FILL);
    }

    private void text(Canvas canvas, String value, float x, float y, float size, int color, Paint.Align align, boolean bold) {
        textPaint.setTextSize(Math.max(9f, size));
        textPaint.setColor(color);
        textPaint.setTextAlign(align);
        textPaint.setFakeBoldText(bold);
        Paint.FontMetrics metrics = textPaint.getFontMetrics();
        canvas.drawText(value, x, y - (metrics.ascent + metrics.descent) / 2f, textPaint);
    }

    private static final class Hit {
        final int action;
        final int index;
        final RectF bounds;
        boolean disabled;

        Hit(int action, int index, RectF bounds) {
            this.action = action;
            this.index = index;
            this.bounds = bounds;
        }
    }

    private static final class Effect {
        final String type;
        final float x;
        final float y;
        final int color;
        final String text;
        final long started;
        final long until;

        Effect(String type, float x, float y, int color, String text, long started, long until) {
            this.type = type;
            this.x = x;
            this.y = y;
            this.color = color;
            this.text = text;
            this.started = started;
            this.until = until;
        }
    }

    private static final class LinkNode {
        final int r;
        final int c;
        final int dir;
        final int turns;
        final LinkNode parent;

        LinkNode(int r, int c, int dir, int turns, LinkNode parent) {
            this.r = r;
            this.c = c;
            this.dir = dir;
            this.turns = turns;
            this.parent = parent;
        }
    }
}
