package com.finaudy;

import android.content.Context;
import android.content.Intent;
import android.util.Log;
import android.webkit.JavascriptInterface;
import android.widget.Toast;
import android.Manifest;

import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.messaging.FirebaseMessaging;
import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInOptions;
import com.google.android.gms.auth.api.signin.GoogleSignInClient;

public class WebAppInterface {
    Context mContext;

    WebAppInterface(Context c) {
        mContext = c;
    }

    @JavascriptInterface
    public void showToast(String toast) {
        Toast.makeText(mContext, toast, Toast.LENGTH_SHORT).show();
    }

    @JavascriptInterface
    public void requestCameraPermission() {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).requestSpecificPermission(Manifest.permission.CAMERA);
        }
    }

    @JavascriptInterface
    public void requestMicrophonePermission() {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).requestSpecificPermission(Manifest.permission.RECORD_AUDIO);
        }
    }

    @JavascriptInterface
    public void startAudioRecording() {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).startAudioRecording();
        }
    }

    @JavascriptInterface
    public void stopAudioRecording() {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).stopAudioRecording();
        }
    }

    @JavascriptInterface
    public void openCamera() {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).openCamera();
        }
    }

    @JavascriptInterface
    public void requestNotificationPermission() {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).requestNotificationPermission();
        }
    }

    @JavascriptInterface
    public void launchPurchaseFlow(String productId) {
        if (mContext instanceof MainActivity) {
            ((MainActivity) mContext).launchPurchaseFlow(productId);
        }
    }

    @JavascriptInterface
    public void getFCMToken() {
        FirebaseMessaging.getInstance().getToken()
                .addOnCompleteListener(new OnCompleteListener<String>() {
                    @Override
                    public void onComplete(Task<String> task) {
                        if (!task.isSuccessful()) {
                            Log.w("WebAppInterface", "Fetching FCM registration token failed", task.getException());
                            return;
                        }

                        // Get new FCM registration token
                        String token = task.getResult();

                        // Log and toast
                        String msg = "FCM Registration Token: " + token;
                        Log.d("WebAppInterface", msg);
                        Toast.makeText(mContext, msg, Toast.LENGTH_SHORT).show();
                        
                        // You can now send this token to your webview
                        // For example, by calling a javascript function in your webview
                        ((MainActivity)mContext).runOnUiThread(new Runnable() {
                            @Override
                            public void run() {
                                ((MainActivity)mContext).getWebView().evaluateJavascript("javascript: onFCMTokenReceived('" + token + "');", null);
                            }
                        });
                    }
                });
    }

    @JavascriptInterface
    public void signInWithGoogle() {
        Log.d("WebAppInterface", "🚀 signInWithGoogle() chamado pelo JavaScript!");
        
        if (mContext instanceof MainActivity) {
            MainActivity activity = (MainActivity) mContext;
            
            activity.runOnUiThread(new Runnable() {
                @Override
                public void run() {
                    try {
                        // Configurar Google Sign-In
                        GoogleSignInOptions gso = new GoogleSignInOptions.Builder(GoogleSignInOptions.DEFAULT_SIGN_IN)
                                .requestIdToken(mContext.getString(R.string.web_client_id)) // WEB Client ID
                                .requestEmail()
                                .requestProfile()
                                .build();
                        
                        GoogleSignInClient googleSignInClient = GoogleSignIn.getClient(activity, gso);
                        
                        Log.d("WebAppInterface", "📱 Google Sign-In Client configurado");
                        
                        // Limpar conta anterior para evitar cache/problemas
                        googleSignInClient.signOut().addOnCompleteListener(task -> {
                            Log.d("WebAppInterface", "🔄 Sign-out anterior concluído");
                            
                            // Iniciar o flow de sign-in
                            Intent signInIntent = googleSignInClient.getSignInIntent();
                            activity.startActivityForResult(signInIntent, MainActivity.RC_SIGN_IN);
                            
                            Log.d("WebAppInterface", "✅ Intent de sign-in iniciado");
                        });
                        
                    } catch (Exception e) {
                        Log.e("WebAppInterface", "💥 Erro no signInWithGoogle: " + e.getMessage(), e);
                        
                        // Enviar erro para JavaScript
                        String script = String.format(
                            "console.error('❌ Erro Android: %s'); if(window.onGoogleSignInError) { window.onGoogleSignInError('%s'); }",
                            e.getMessage(),
                            e.getMessage().replace("'", "\\'")
                        );
                        
                        activity.runOnUiThread(() -> activity.getWebView().evaluateJavascript(script, null));
                    }
                }
            });
        } else {
            Log.e("WebAppInterface", "❌ Context não é MainActivity!");
        }
    }
}
