package com.hossein.stts

import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.Bundle

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import expo.modules.ReactActivityDelegateWrapper

class MainActivity : ReactActivity() {
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    normalizeProcessTextIntent(intent)
    super.onCreate(null)
  }

  override fun onNewIntent(intent: Intent?) {
    super.onNewIntent(intent)
    if (intent != null) {
      normalizeProcessTextIntent(intent)
      setIntent(intent)
    }
  }

  private fun normalizeProcessTextIntent(intent: Intent) {
    if (intent.action != Intent.ACTION_PROCESS_TEXT) return

    val selectedText = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
      ?.toString()
      ?.trim()
      .orEmpty()

    if (selectedText.isEmpty()) return

    intent.action = Intent.ACTION_VIEW
    intent.data = Uri.parse(
      "stts://read?text=${Uri.encode(selectedText)}"
    )
  }

  override fun getMainComponentName(): String = "main"

  override fun createReactActivityDelegate(): ReactActivityDelegate {
    return ReactActivityDelegateWrapper(
      this,
      BuildConfig.IS_NEW_ARCHITECTURE_ENABLED,
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {}
    )
  }

  override fun invokeDefaultOnBackPressed() {
    if (Build.VERSION.SDK_INT <= Build.VERSION_CODES.R) {
      if (!moveTaskToBack(false)) super.invokeDefaultOnBackPressed()
      return
    }
    super.invokeDefaultOnBackPressed()
  }
}
