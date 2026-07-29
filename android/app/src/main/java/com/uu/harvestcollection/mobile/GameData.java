package com.uu.harvestcollection.mobile;

import android.graphics.Color;

final class GameData {
    static final int PLOT_COUNT = 12;

    static final Crop[] CROPS = {
        new Crop("radish", "萝卜", "萝", 1, 120_000L, 5, 9, 1, Color.rgb(238, 116, 132)),
        new Crop("cabbage", "白菜", "菜", 1, 240_000L, 8, 15, 1, Color.rgb(92, 170, 92)),
        new Crop("potato", "土豆", "薯", 2, 420_000L, 13, 10, 2, Color.rgb(184, 126, 70)),
        new Crop("tomato", "番茄", "番", 3, 720_000L, 22, 14, 2, Color.rgb(224, 68, 65)),
        new Crop("corn", "玉米", "玉", 4, 1_200_000L, 38, 23, 2, Color.rgb(235, 192, 42)),
        new Crop("strawberry", "草莓", "莓", 5, 1_800_000L, 65, 26, 3, Color.rgb(207, 57, 91))
    };

    static final String[] PET_NAMES = {"小麦犬", "橘子猫", "云朵兔", "团子鸡"};
    static final int[] PET_COSTS = {360, 680, 960, 1320};
    static final float[] PET_INCOME = {0.35f, 0.50f, 0.70f, 0.95f};

    static final String[] FACILITY_NAMES = {
        "舒适小屋", "浅水嬉戏池", "自动喂食机", "玩具收纳箱", "宠物护理台",
        "迎客花架", "萤火夜灯", "野餐小桌"
    };
    static final String[] FACILITY_DESCRIPTIONS = {
        "减慢饥饿并提高收益", "解锁洗澡并提高洁净", "离线时自动投喂",
        "提高玩耍效果", "解锁梳毛互动", "提高访客收益",
        "持续吸引晚间访客", "提高抚摸和玩耍效果"
    };
    static final int[][] FACILITY_COSTS = {
        {280, 620, 1120}, {480}, {760, 1380, 2280}, {360, 780, 1420},
        {690}, {240, 540, 980}, {430}, {590}
    };

    static final int[] LAND_COSTS = {100, 160, 250, 380, 560, 800};
    static final int[] SPRINKLER_COSTS = {180, 240, 320, 420, 540, 680, 850, 1050, 1300, 1600, 1950, 2350};
    static final int[] HARVESTER_COSTS = {320, 440, 580, 740, 920, 1150, 1400, 1700, 2050, 2450, 2900, 3400};
    static final int[][] FESTIVAL_GOALS = {{6, 24}, {7, 27}, {8, 24}, {6, 30}};

    static Crop crop(int index) {
        return CROPS[Math.max(0, Math.min(CROPS.length - 1, index))];
    }

    static int xpNeeded(int level) {
        return 55 + level * 25;
    }

    static String duration(long milliseconds) {
        long seconds = Math.max(0L, (milliseconds + 999L) / 1000L);
        if (seconds < 60L) return seconds + "秒";
        long minutes = seconds / 60L;
        long rest = seconds % 60L;
        return rest == 0L ? minutes + "分钟" : minutes + "分" + rest + "秒";
    }

    private GameData() {}

    static final class Crop {
        final String id;
        final String name;
        final String label;
        final int level;
        final long duration;
        final int seedPrice;
        final int sellPrice;
        final int yield;
        final int color;

        Crop(String id, String name, String label, int level, long duration, int seedPrice, int sellPrice, int yield, int color) {
            this.id = id;
            this.name = name;
            this.label = label;
            this.level = level;
            this.duration = duration;
            this.seedPrice = seedPrice;
            this.sellPrice = sellPrice;
            this.yield = yield;
            this.color = color;
        }
    }
}
