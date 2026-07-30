package com.uu.harvestcollection.mobile;

final class MergeLogic {
    static Result move(int[][] board, int direction) {
        int[][] after = new int[4][4];
        int gained = 0;
        int merges = 0;

        for (int line = 0; line < 4; line++) {
            int[] values = new int[4];
            int count = 0;
            for (int position = 0; position < 4; position++) {
                int row = rowFor(direction, line, position);
                int column = columnFor(direction, line, position);
                int value = board[row][column];
                if (value > 0) values[count++] = value;
            }

            int write = 0;
            for (int read = 0; read < count; read++) {
                int value = values[read];
                if (read + 1 < count && values[read + 1] == value) {
                    value++;
                    gained += 1 << Math.min(30, value);
                    merges++;
                    read++;
                }
                int row = rowFor(direction, line, write);
                int column = columnFor(direction, line, write);
                after[row][column] = value;
                write++;
            }
        }

        return new Result(after, gained, merges, !boardsEqual(board, after));
    }

    static boolean hasMove(int[][] board) {
        for (int row = 0; row < 4; row++) {
            for (int column = 0; column < 4; column++) {
                if (board[row][column] == 0) return true;
                if (row < 3 && board[row][column] == board[row + 1][column]) return true;
                if (column < 3 && board[row][column] == board[row][column + 1]) return true;
            }
        }
        return false;
    }

    static int highestTile(int[][] board) {
        int highestExponent = 1;
        for (int[] row : board) {
            for (int value : row) highestExponent = Math.max(highestExponent, value);
        }
        return 1 << Math.min(30, highestExponent);
    }

    private static int rowFor(int direction, int line, int position) {
        if (direction == 0) return position;
        if (direction == 1) return 3 - position;
        return line;
    }

    private static int columnFor(int direction, int line, int position) {
        if (direction == 2) return position;
        if (direction == 3) return 3 - position;
        return line;
    }

    private static boolean boardsEqual(int[][] first, int[][] second) {
        for (int row = 0; row < 4; row++) {
            for (int column = 0; column < 4; column++) {
                if (first[row][column] != second[row][column]) return false;
            }
        }
        return true;
    }

    private MergeLogic() {}

    static final class Result {
        final int[][] board;
        final int gained;
        final int merges;
        final boolean changed;

        Result(int[][] board, int gained, int merges, boolean changed) {
            this.board = board;
            this.gained = gained;
            this.merges = merges;
            this.changed = changed;
        }
    }
}
