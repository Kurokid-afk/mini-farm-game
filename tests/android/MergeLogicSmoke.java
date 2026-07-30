package com.uu.harvestcollection.mobile;

import java.util.Arrays;

public final class MergeLogicSmoke {
    public static void main(String[] args) {
        preventsDoubleMergeInOneMove();
        mergesTwoPairsIndependently();
        supportsEveryDirection();
        detectsGameOver();
        System.out.println("native merge rules passed");
    }

    private static void preventsDoubleMergeInOneMove() {
        int[][] board = board(
            1, 1, 2, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        );
        MergeLogic.Result result = MergeLogic.move(board, 2);
        assertBoard(result.board,
            2, 2, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        );
        check(result.gained == 4, "2+2+4 must score 4, not chain into 8");
        check(result.merges == 1, "2+2+4 must contain one merge");
    }

    private static void mergesTwoPairsIndependently() {
        MergeLogic.Result result = MergeLogic.move(board(
            1, 1, 1, 1,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        ), 2);
        assertBoard(result.board,
            2, 2, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        );
        check(result.gained == 8, "two 2+2 pairs must score 8");
        check(result.merges == 2, "two pairs must report two merges");
    }

    private static void supportsEveryDirection() {
        int[][] horizontal = board(
            1, 0, 1, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        );
        assertBoard(MergeLogic.move(horizontal, 3).board,
            0, 0, 0, 2,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0
        );

        int[][] vertical = board(
            1, 0, 0, 0,
            0, 0, 0, 0,
            1, 0, 0, 0,
            0, 0, 0, 0
        );
        assertBoard(MergeLogic.move(vertical, 1).board,
            0, 0, 0, 0,
            0, 0, 0, 0,
            0, 0, 0, 0,
            2, 0, 0, 0
        );
    }

    private static void detectsGameOver() {
        int[][] blocked = board(
            1, 2, 3, 4,
            2, 3, 4, 5,
            3, 4, 5, 6,
            4, 5, 6, 7
        );
        check(!MergeLogic.hasMove(blocked), "alternating full board must be game over");
        check(MergeLogic.hasMove(board(
            1, 2, 3, 4,
            2, 3, 4, 5,
            3, 4, 5, 6,
            4, 5, 6, 6
        )), "adjacent equal tiles must remain playable");
        check(MergeLogic.highestTile(blocked) == 128, "highest tile label must match exponent");
    }

    private static int[][] board(int... values) {
        int[][] board = new int[4][4];
        for (int index = 0; index < values.length; index++) board[index / 4][index % 4] = values[index];
        return board;
    }

    private static void assertBoard(int[][] actual, int... expectedValues) {
        int[][] expected = board(expectedValues);
        check(Arrays.deepEquals(actual, expected), "unexpected board: " + Arrays.deepToString(actual));
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private MergeLogicSmoke() {}
}
