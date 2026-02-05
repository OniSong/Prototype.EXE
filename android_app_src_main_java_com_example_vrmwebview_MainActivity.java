package com.example.vrmwebview;

import android.os.Bundle;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import androidx.appcompat.app.AppCompatActivity;

// Replace WEB_APP_URL with your deployed Vercel URL (or set as string resource)
public class MainActivity extends AppCompatActivity {
    // TODO: update this URL after you deploy the web app.
    private static final String WEB_APP_URL = "https://YOUR_VERCEL_URL_HERE";

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        WebView wv = findViewById(R.id.webview);
        WebSettings ws = wv.getSettings();
        ws.setJavaScriptEnabled(true);
        ws.setDomStorageEnabled(true);
        wv.setWebViewClient(new WebViewClient());
        wv.loadUrl(WEB_APP_URL);
    }
}