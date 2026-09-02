package com.example.newtv

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.viewinterop.AndroidView
import com.example.newtv.theme.NewTVTheme

class MainActivity : ComponentActivity() {
  @SuppressLint("SetJavaScriptEnabled")
  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)

    enableEdgeToEdge()
    setContent {
      NewTVTheme { 
        Surface(modifier = Modifier.fillMaxSize(), color = MaterialTheme.colorScheme.background) { 
          AndroidView(
            factory = { context ->
              WebView(context).apply {
                layoutParams = android.view.ViewGroup.LayoutParams(
                  android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                  android.view.ViewGroup.LayoutParams.MATCH_PARENT
                )
                settings.javaScriptEnabled = true
                settings.domStorageEnabled = true
                settings.cacheMode = WebSettings.LOAD_NO_CACHE
                webViewClient = WebViewClient()
                loadUrl("file:///android_asset/index.html")
              }
            },
            modifier = Modifier.fillMaxSize(),
            update = { }
          )
        } 
      }
    }
  }
}
