package com.uu.harvestcollection.mobile;

import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;

public final class MainActivity extends Activity {
    private GameView gameView;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getWindow().setStatusBarColor(Color.rgb(224, 243, 237));
        getWindow().setNavigationBarColor(Color.rgb(252, 253, 247));
        gameView = new GameView(this);
        setContentView(gameView);
        gameView.setOnApplyWindowInsetsListener((view, insets) -> {
            gameView.setSystemInsets(
                insets.getSystemWindowInsetLeft(),
                insets.getSystemWindowInsetTop(),
                insets.getSystemWindowInsetRight(),
                insets.getSystemWindowInsetBottom()
            );
            return insets;
        });
        gameView.requestApplyInsets();
    }

    @Override
    protected void onPause() {
        gameView.saveNow();
        super.onPause();
    }

    @Override
    protected void onDestroy() {
        gameView.saveNow();
        super.onDestroy();
    }
}
