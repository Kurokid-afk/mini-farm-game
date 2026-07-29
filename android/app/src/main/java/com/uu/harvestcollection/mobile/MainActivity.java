package com.uu.harvestcollection.mobile;

import android.annotation.SuppressLint;
import android.app.Activity;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.WebChromeClient;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    private WebView gameView;

    @SuppressLint("SetJavaScriptEnabled")
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        getWindow().setStatusBarColor(Color.rgb(146, 210, 202));
        getWindow().setNavigationBarColor(Color.rgb(255, 248, 216));

        gameView = new WebView(this);
        gameView.setBackgroundColor(Color.rgb(146, 210, 202));
        gameView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        gameView.setVerticalScrollBarEnabled(false);
        gameView.setHorizontalScrollBarEnabled(false);

        WebSettings settings = gameView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(false);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        gameView.setWebViewClient(new WebViewClient());
        gameView.setWebChromeClient(new WebChromeClient());
        setContentView(gameView);

        if (savedInstanceState == null) {
            gameView.loadUrl("file:///android_asset/www/index.html?mobile=1");
        } else {
            gameView.restoreState(savedInstanceState);
        }
    }

    @Override
    protected void onSaveInstanceState(Bundle outState) {
        gameView.saveState(outState);
        super.onSaveInstanceState(outState);
    }

    @Override
    protected void onPause() {
        gameView.evaluateJavascript("window.__uuHarvest?.app?.save(true)", null);
        gameView.onPause();
        super.onPause();
    }

    @Override
    protected void onResume() {
        super.onResume();
        gameView.onResume();
    }

    @Override
    public void onBackPressed() {
        if (gameView.canGoBack()) {
            gameView.goBack();
        } else {
            moveTaskToBack(true);
        }
    }

    @Override
    protected void onDestroy() {
        gameView.destroy();
        super.onDestroy();
    }
}
