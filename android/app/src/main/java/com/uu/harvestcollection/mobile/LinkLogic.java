package com.uu.harvestcollection.mobile;

import java.util.ArrayList;
import java.util.List;

final class LinkLogic {
    static RepairResult repairPairs(int[][] source, int symbolCount) {
        int[][] board = copyBoard(source);
        int[] counts = new int[symbolCount];
        List<List<Cell>> occurrences = new ArrayList<>();
        for (int value = 0; value < symbolCount; value++) occurrences.add(new ArrayList<>());
        List<Cell> empty = new ArrayList<>();

        for (int row = 0; row < board.length; row++) {
            for (int column = 0; column < board[row].length; column++) {
                int value = board[row][column];
                if (value < 0) {
                    empty.add(new Cell(row, column));
                } else if (value < symbolCount) {
                    counts[value]++;
                    occurrences.get(value).add(new Cell(row, column));
                }
            }
        }

        int added = 0;
        int removed = 0;
        for (int value = 0; value < symbolCount; value++) {
            if (counts[value] % 2 == 0) continue;
            if (!empty.isEmpty()) {
                Cell anchor = occurrences.get(value).get(0);
                int nearestIndex = 0;
                int nearestDistance = Integer.MAX_VALUE;
                for (int index = 0; index < empty.size(); index++) {
                    Cell cell = empty.get(index);
                    int distance = Math.abs(cell.row - anchor.row) + Math.abs(cell.column - anchor.column);
                    if (distance < nearestDistance) {
                        nearestDistance = distance;
                        nearestIndex = index;
                    }
                }
                Cell cell = empty.remove(nearestIndex);
                board[cell.row][cell.column] = value;
                added++;
            } else {
                List<Cell> cells = occurrences.get(value);
                Cell cell = cells.get(cells.size() - 1);
                board[cell.row][cell.column] = -1;
                removed++;
            }
        }

        int remaining = 0;
        for (int[] row : board) for (int value : row) if (value >= 0) remaining++;
        return new RepairResult(board, added > 0 || removed > 0, added, removed, remaining);
    }

    private static int[][] copyBoard(int[][] source) {
        int[][] copy = new int[source.length][];
        for (int row = 0; row < source.length; row++) copy[row] = source[row].clone();
        return copy;
    }

    private LinkLogic() {}

    static final class RepairResult {
        final int[][] board;
        final boolean repaired;
        final int added;
        final int removed;
        final int remaining;

        RepairResult(int[][] board, boolean repaired, int added, int removed, int remaining) {
            this.board = board;
            this.repaired = repaired;
            this.added = added;
            this.removed = removed;
            this.remaining = remaining;
        }
    }

    private static final class Cell {
        final int row;
        final int column;

        Cell(int row, int column) {
            this.row = row;
            this.column = column;
        }
    }
}
