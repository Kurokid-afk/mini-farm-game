package com.uu.harvestcollection.mobile;

import android.content.res.Resources;
import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.util.Log;

final class PixelAssets {
    final Bitmap crops;
    final Bitmap farmBackground;
    final Bitmap petGarden;
    final Bitmap petSprites;
    final Bitmap petFacilities;

    PixelAssets(Resources resources) {
        crops = decode(resources, R.drawable.crops);
        farmBackground = decode(resources, R.drawable.farm_background);
        petGarden = decode(resources, R.drawable.pet_garden_bg);
        petSprites = removeCellBackgrounds(
            decode(resources, R.drawable.pet_sprites),
            6,
            4,
            30
        );
        petFacilities = removeCellBackgrounds(
            decode(resources, R.drawable.pet_facilities),
            4,
            3,
            72
        );
    }

    private static Bitmap decode(Resources resources, int resourceId) {
        try {
            BitmapFactory.Options options = new BitmapFactory.Options();
            options.inScaled = false;
            options.inPreferredConfig = Bitmap.Config.ARGB_8888;
            return BitmapFactory.decodeResource(resources, resourceId, options);
        } catch (RuntimeException ignored) {
            return null;
        }
    }

    private static Bitmap removeCellBackgrounds(Bitmap source, int columns, int rows, int tolerance) {
        if (source == null) return null;
        try {
            Bitmap output = source.copy(Bitmap.Config.ARGB_8888, true);
            output.setHasAlpha(true);

            int width = output.getWidth();
            int height = output.getHeight();
            int count = width * height;
            int[] pixels = new int[count];
            byte[] visited = new byte[count];
            int[] queue = new int[count];
            output.getPixels(pixels, 0, width, 0, 0, width, height);

            int toleranceSquared = tolerance * tolerance;
            int cellWidth = width / columns;
            int cellHeight = height / rows;
            for (int row = 0; row < rows; row++) {
                for (int column = 0; column < columns; column++) {
                    int left = column * cellWidth;
                    int top = row * cellHeight;
                    int right = column == columns - 1 ? width : left + cellWidth;
                    int bottom = row == rows - 1 ? height : top + cellHeight;
                    int[] corners = {
                        pixels[top * width + left],
                        pixels[top * width + right - 1],
                        pixels[(bottom - 1) * width + left],
                        pixels[(bottom - 1) * width + right - 1]
                    };
                    int tail = 0;

                    for (int x = left; x < right; x++) {
                        tail = enqueueBackground(top * width + x, pixels, visited, queue, tail, corners, toleranceSquared);
                        tail = enqueueBackground((bottom - 1) * width + x, pixels, visited, queue, tail, corners, toleranceSquared);
                    }
                    for (int y = top; y < bottom; y++) {
                        tail = enqueueBackground(y * width + left, pixels, visited, queue, tail, corners, toleranceSquared);
                        tail = enqueueBackground(y * width + right - 1, pixels, visited, queue, tail, corners, toleranceSquared);
                    }

                    for (int head = 0; head < tail; head++) {
                        int index = queue[head];
                        pixels[index] &= 0x00ffffff;
                        int x = index % width;
                        int y = index / width;
                        if (x > left) tail = enqueueBackground(index - 1, pixels, visited, queue, tail, corners, toleranceSquared);
                        if (x + 1 < right) tail = enqueueBackground(index + 1, pixels, visited, queue, tail, corners, toleranceSquared);
                        if (y > top) tail = enqueueBackground(index - width, pixels, visited, queue, tail, corners, toleranceSquared);
                        if (y + 1 < bottom) tail = enqueueBackground(index + width, pixels, visited, queue, tail, corners, toleranceSquared);
                    }
                }
            }

            output.setPixels(pixels, 0, width, 0, 0, width, height);
            if (output != source) source.recycle();
            return output;
        } catch (OutOfMemoryError | RuntimeException error) {
            Log.e("UUAssets", "Could not remove sprite background", error);
            return source;
        }
    }

    private static int enqueueBackground(
        int index,
        int[] pixels,
        byte[] visited,
        int[] queue,
        int tail,
        int[] corners,
        int toleranceSquared
    ) {
        if (visited[index] != 0 || !nearAnyCorner(pixels[index], corners, toleranceSquared)) return tail;
        visited[index] = 1;
        queue[tail] = index;
        return tail + 1;
    }

    private static boolean nearAnyCorner(int color, int[] corners, int toleranceSquared) {
        int red = Color.red(color);
        int green = Color.green(color);
        int blue = Color.blue(color);
        for (int corner : corners) {
            int dr = red - Color.red(corner);
            int dg = green - Color.green(corner);
            int db = blue - Color.blue(corner);
            if (dr * dr + dg * dg + db * db < toleranceSquared) return true;
        }
        return false;
    }

    private PixelAssets() {
        crops = null;
        farmBackground = null;
        petGarden = null;
        petSprites = null;
        petFacilities = null;
    }
}
