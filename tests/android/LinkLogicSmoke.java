package com.uu.harvestcollection.mobile;

public final class LinkLogicSmoke {
    public static void main(String[] args) {
        duplicatesSingleOrphan();
        removesOddSinglesWhenBoardIsFull();
        preservesValidPairs();
        System.out.println("native link pair integrity passed");
    }

    private static void duplicatesSingleOrphan() {
        int[][] board = emptyBoard(8, 6);
        board[4][2] = 3;
        LinkLogic.RepairResult result = LinkLogic.repairPairs(board, 10);
        check(result.repaired, "single orphan must be repaired");
        check(result.added == 1, "single orphan must be duplicated");
        check(result.removed == 0, "single orphan must not be discarded when space exists");
        check(result.remaining == 2, "single orphan repair must leave one pair");
        check(count(result.board, 3) == 2, "repaired pair must use the same symbol");
    }

    private static void removesOddSinglesWhenBoardIsFull() {
        int[][] board = new int[8][6];
        for (int row = 0; row < 8; row++) {
            for (int column = 0; column < 6; column++) board[row][column] = 1;
        }
        board[0][0] = 0;
        LinkLogic.RepairResult result = LinkLogic.repairPairs(board, 10);
        check(result.repaired, "full invalid board must be repaired");
        check(result.added == 0, "full board has no room for duplicates");
        check(result.removed == 2, "one tile from each odd symbol must be removed");
        check(result.remaining == 46, "full 48-tile board must retain 46 paired tiles");
        for (int value = 0; value < 10; value++) {
            check(count(result.board, value) % 2 == 0, "every symbol count must be even");
        }
    }

    private static void preservesValidPairs() {
        int[][] board = emptyBoard(8, 6);
        board[0][0] = 7;
        board[0][1] = 7;
        LinkLogic.RepairResult result = LinkLogic.repairPairs(board, 10);
        check(!result.repaired, "valid pair board must not be changed");
        check(result.remaining == 2, "valid pair count must remain unchanged");
    }

    private static int[][] emptyBoard(int rows, int columns) {
        int[][] board = new int[rows][columns];
        for (int row = 0; row < rows; row++) {
            for (int column = 0; column < columns; column++) board[row][column] = -1;
        }
        return board;
    }

    private static int count(int[][] board, int target) {
        int count = 0;
        for (int[] row : board) for (int value : row) if (value == target) count++;
        return count;
    }

    private static void check(boolean condition, String message) {
        if (!condition) throw new AssertionError(message);
    }

    private LinkLogicSmoke() {}
}
