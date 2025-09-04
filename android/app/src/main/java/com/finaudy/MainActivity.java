package com.finaudy;

import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.webkit.WebViewAssetLoader;
import androidx.webkit.WebViewClientCompat;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.util.Log;
import android.webkit.PermissionRequest;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.widget.Toast;
import android.media.MediaRecorder;
import android.util.Base64;
import android.provider.MediaStore;
import android.content.Intent;
import android.graphics.Bitmap;
import android.app.Activity;
import android.app.NotificationChannel;
import android.app.NotificationManager;

import com.google.android.gms.auth.api.signin.GoogleSignIn;
import com.google.android.gms.auth.api.signin.GoogleSignInAccount;
import com.google.android.gms.common.api.ApiException;
import com.google.android.gms.tasks.Task;

import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import org.json.JSONObject;

import com.android.billingclient.api.BillingClient;
import com.android.billingclient.api.BillingClientStateListener;
import com.android.billingclient.api.BillingFlowParams;
import com.android.billingclient.api.BillingResult;
import com.android.billingclient.api.Purchase;
import com.android.billingclient.api.PurchasesUpdatedListener;
import com.android.billingclient.api.SkuDetails;
import com.android.billingclient.api.SkuDetailsParams;

public class MainActivity extends AppCompatActivity {

    private static final int PERMISSIONS_REQUEST_CODE = 123;
    private static final int CAMERA_REQUEST_CODE = 1;
    public static final int RC_SIGN_IN = 1001;
    private static final int GALLERY_REQUEST_CODE = 2;
    private static final int FILE_CHOOSER_REQUEST_CODE = 3;
    private static MainActivity instance;

    private WebView webView;
    private BillingClient billingClient;
    private MediaRecorder mediaRecorder;
    private String audioFilePath = null;

    public static MainActivity getInstance() {
        return instance;
    }

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Agora define o layout principal
        setContentView(R.layout.activity_main);

        instance = this;
        webView = (WebView) findViewById(R.id.webview);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClientCompat() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }
        });

        // Configurações avançadas do WebView
        WebSettings webSettings = webView.getSettings();
        webSettings.setJavaScriptEnabled(true);
        webSettings.setDomStorageEnabled(true);
        webSettings.setDatabaseEnabled(true);
        webSettings.setAllowContentAccess(true);
        webSettings.setAllowFileAccess(false);
        webSettings.setAllowFileAccessFromFileURLs(false);
        webSettings.setAllowUniversalAccessFromFileURLs(false);
        webSettings.setJavaScriptCanOpenWindowsAutomatically(true);
        webSettings.setMediaPlaybackRequiresUserGesture(false);

        webView.addJavascriptInterface(new WebAppInterface(this), "Android");

        webView.loadUrl("https://appassets.androidplatform.net/index.html");

        audioFilePath = getExternalCacheDir().getAbsolutePath() + "/audio_record.3gp";
        requestNotificationPermission();
        createNotificationChannel();
        setupBillingClient();
    }

    private void setupBillingClient() {
        PurchasesUpdatedListener purchasesUpdatedListener = new PurchasesUpdatedListener() {
            @Override
            public void onPurchasesUpdated(BillingResult billingResult, @Nullable List<Purchase> purchases) {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && purchases != null) {
                    for (Purchase purchase : purchases) {
                        handlePurchase(purchase);
                    }
                } else {
                    // Lida com outros erros ou compras canceladas pelo usuário
                    String script = String.format("javascript:window.onGooglePlayPurchaseFinished(null, null);");
                    runOnUiThread(() -> webView.evaluateJavascript(script, null));
                }
            }
        };

        billingClient = BillingClient.newBuilder(this)
                .setListener(purchasesUpdatedListener)
                .enablePendingPurchases()
                .build();

        billingClient.startConnection(new BillingClientStateListener() {
            @Override
            public void onBillingSetupFinished(BillingResult billingResult) {
                if (billingResult.getResponseCode() ==  BillingClient.BillingResponseCode.OK) {
                    Log.d("BillingClient", "Setup successful.");
                }
            }
            @Override
            public void onBillingServiceDisconnected() {
                Log.d("BillingClient", "Service disconnected.");
            }
        });
    }

    private void handlePurchase(Purchase purchase) {
        if (purchase.getPurchaseState() == Purchase.PurchaseState.PURCHASED) {
            // O token de compra é o que precisamos enviar para o backend
            String purchaseToken = purchase.getPurchaseToken();
            String sku = purchase.getSkus().get(0); // Obter o ID do produto

            String script = String.format("javascript:window.onGooglePlayPurchaseFinished('%s', '%s');", purchaseToken, sku);
            runOnUiThread(() -> webView.evaluateJavascript(script, null));
        }
    }

    public void launchPurchaseFlow(String productId) {
        if (billingClient.isReady()) {
            List<String> skuList = new ArrayList<>();
            skuList.add(productId);
            SkuDetailsParams.Builder params = SkuDetailsParams.newBuilder();
            params.setSkusList(skuList).setType(BillingClient.SkuType.SUBS);

            billingClient.querySkuDetailsAsync(params.build(), (billingResult, skuDetailsList) -> {
                if (billingResult.getResponseCode() == BillingClient.BillingResponseCode.OK && skuDetailsList != null) {
                    for (SkuDetails skuDetails : skuDetailsList) {
                        if (skuDetails.getSku().equals(productId)) {
                            BillingFlowParams billingFlowParams = BillingFlowParams.newBuilder()
                                    .setSkuDetails(skuDetails)
                                    .build();
                            billingClient.launchBillingFlow(this, billingFlowParams);
                        }
                    }
                }
            });
        } else {
            Log.e("BillingClient", "Billing client not ready.");
            Toast.makeText(this, "Erro ao conectar com a Play Store.", Toast.LENGTH_SHORT).show();
        }
    }

    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        setIntent(intent);
        handleNotificationIntent(intent);
    }

    private void handleNotificationIntent(Intent intent) {
        if (intent != null && intent.getExtras() != null) {
            Bundle extras = intent.getExtras();
            JSONObject jsonData = new JSONObject();
            JSONObject data = new JSONObject();
            try {
                for (String key : extras.keySet()) {
                    data.put(key, extras.get(key));
                }
                jsonData.put("data", data);

                String script = String.format("javascript:window.onNotificationClicked(%s);", jsonData.toString());
                if (webView != null) {
                    runOnUiThread(() -> webView.evaluateJavascript(script, null));
                }
            } catch (Exception e) {
                Log.e("MainActivity", "Error creating JSON from notification extras", e);
            }
        }
    }

    public void openGallery() {
        Intent galleryIntent = new Intent(Intent.ACTION_PICK, MediaStore.Images.Media.EXTERNAL_CONTENT_URI);
        galleryIntent.setType("image/*");
        if (galleryIntent.resolveActivity(getPackageManager()) != null) {
            startActivityForResult(galleryIntent, GALLERY_REQUEST_CODE);
        } else {
            Toast.makeText(this, "Nenhum app de galeria encontrado", Toast.LENGTH_SHORT).show();
        }
    }

    public void openFileChooser(String acceptType) {
        Intent intent = new Intent(Intent.ACTION_GET_CONTENT);
        intent.setType(acceptType);
        intent.addCategory(Intent.CATEGORY_OPENABLE);
        if (intent.resolveActivity(getPackageManager()) != null) {
            startActivityForResult(Intent.createChooser(intent, "Escolher arquivo"), FILE_CHOOSER_REQUEST_CODE);
        } else {
            Toast.makeText(this, "Nenhum app para escolher arquivos encontrado", Toast.LENGTH_SHORT).show();
        }
    }

    public void openCamera() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            requestSpecificPermission(Manifest.permission.CAMERA);
            return;
        }
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (cameraIntent.resolveActivity(getPackageManager()) != null) {
            startActivityForResult(cameraIntent, CAMERA_REQUEST_CODE);
        } else {
            Toast.makeText(this, "Nenhum app de câmera encontrado", Toast.LENGTH_SHORT).show();
        }
    }

    public void startAudioRecording() {
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
            requestSpecificPermission(Manifest.permission.RECORD_AUDIO);
            return;
        }

        runOnUiThread(() -> {
            try {
                mediaRecorder = new MediaRecorder();
                mediaRecorder.setAudioSource(MediaRecorder.AudioSource.MIC);
                mediaRecorder.setOutputFormat(MediaRecorder.OutputFormat.THREE_GPP);
                mediaRecorder.setAudioEncoder(MediaRecorder.AudioEncoder.AMR_NB);
                mediaRecorder.setOutputFile(audioFilePath);
                mediaRecorder.prepare();
                mediaRecorder.start();
                Toast.makeText(this, "Gravação iniciada...", Toast.LENGTH_SHORT).show();
            } catch (IOException e) {
                e.printStackTrace();
                Toast.makeText(this, "Falha ao iniciar gravação", Toast.LENGTH_SHORT).show();
            }
        });
    }

    public void stopAudioRecording() {
        runOnUiThread(() -> {
            if (mediaRecorder != null) {
                try {
                    mediaRecorder.stop();
                    mediaRecorder.release();
                    mediaRecorder = null;
                    Toast.makeText(this, "Gravação finalizada.", Toast.LENGTH_SHORT).show();
                    sendAudioFileAsBase64();
                } catch (RuntimeException stopException) {
                    Toast.makeText(this, "Gravação muito curta.", Toast.LENGTH_SHORT).show();
                    cleanupAudioFile();
                }
            }
        });
    }

    private void sendAudioFileAsBase64() {
        File audioFile = new File(audioFilePath);
        if (!audioFile.exists()) {
            return;
        }

        try {
            FileInputStream fis = new FileInputStream(audioFile);
            byte[] bytes = new byte[(int) audioFile.length()];
            fis.read(bytes);
            fis.close();

            String base64Audio = Base64.encodeToString(bytes, Base64.NO_WRAP);
            String script = String.format("javascript:onAudioRecordingComplete('%s');", base64Audio);
            
            runOnUiThread(() -> webView.evaluateJavascript(script, null));

        } catch (IOException e) {
            e.printStackTrace();
        } finally {
            cleanupAudioFile();
        }
    }

    private void cleanupAudioFile() {
        File file = new File(audioFilePath);
        if (file.exists()) {
            file.delete();
        }
    }

    public void requestSpecificPermission(String permission) {
        if (ContextCompat.checkSelfPermission(this, permission) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{permission}, PERMISSIONS_REQUEST_CODE);
        } else {
            notifyPermissionResult(permission, true);
        }
    }

    public void requestNotificationPermission() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
            if (ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) !=
                    PackageManager.PERMISSION_GRANTED) {
                ActivityCompat.requestPermissions(this,
                        new String[]{Manifest.permission.POST_NOTIFICATIONS}, PERMISSIONS_REQUEST_CODE);
            }
        }
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, @NonNull String[] permissions, @NonNull int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == PERMISSIONS_REQUEST_CODE && permissions.length > 0) {
            boolean granted = grantResults[0] == PackageManager.PERMISSION_GRANTED;
            String permission = permissions[0];
            notifyPermissionResult(permission, granted);
        }
    }

    private void notifyPermissionResult(String permission, boolean granted) {
        String permissionName = "";
        if (permission.equals(Manifest.permission.CAMERA)) {
            permissionName = "camera";
        } else if (permission.equals(Manifest.permission.RECORD_AUDIO)) {
            permissionName = "microphone";
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU && permission.equals(Manifest.permission.POST_NOTIFICATIONS)) {
            permissionName = "notifications";
        }
        
        if (!permissionName.isEmpty()) {
            final String script = String.format("javascript:onPermissionResult('%s', %b);", permissionName, granted);
            runOnUiThread(() -> webView.evaluateJavascript(script, null));
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        
        // Tratar resultado da câmera
        if (requestCode == CAMERA_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            if (data != null && data.getExtras() != null) {
                Bitmap imageBitmap = (Bitmap) data.getExtras().get("data");
                if (imageBitmap != null) {
                    sendImageAsBase64(imageBitmap);
                }
            }
        }
        
        // Tratar resultado da galeria
        else if (requestCode == GALLERY_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            if (data != null && data.getData() != null) {
                Uri imageUri = data.getData();
                try {
                    InputStream inputStream = getContentResolver().openInputStream(imageUri);
                    Bitmap bitmap = android.graphics.BitmapFactory.decodeStream(inputStream);
                    if (bitmap != null) {
                        sendGalleryImageAsBase64(bitmap);
                    }
                    inputStream.close();
                } catch (Exception e) {
                    Log.e("MainActivity", "Erro ao processar imagem da galeria", e);
                    Toast.makeText(this, "Erro ao processar imagem", Toast.LENGTH_SHORT).show();
                }
            }
        }
        
        // Tratar resultado do file chooser
        else if (requestCode == FILE_CHOOSER_REQUEST_CODE && resultCode == Activity.RESULT_OK) {
            if (data != null && data.getData() != null) {
                Uri fileUri = data.getData();
                try {
                    String fileName = getFileName(fileUri);
                    String mimeType = getContentResolver().getType(fileUri);
                    
                    InputStream inputStream = getContentResolver().openInputStream(fileUri);
                    ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
                    byte[] buffer = new byte[1024];
                    int bytesRead;
                    while ((bytesRead = inputStream.read(buffer)) != -1) {
                        byteArrayOutputStream.write(buffer, 0, bytesRead);
                    }
                    inputStream.close();
                    
                    byte[] fileBytes = byteArrayOutputStream.toByteArray();
                    String base64File = Base64.encodeToString(fileBytes, Base64.NO_WRAP);
                    String fileDataUrl = "data:" + mimeType + ";base64," + base64File;
                    
                    sendFileAsBase64(fileDataUrl, fileName, mimeType);
                } catch (Exception e) {
                    Log.e("MainActivity", "Erro ao processar arquivo", e);
                    Toast.makeText(this, "Erro ao processar arquivo", Toast.LENGTH_SHORT).show();
                }
            }
        }
        
        // Tratar resultado do Google Sign-In
        else if (requestCode == RC_SIGN_IN) {
            Log.d("MainActivity", "📱 Resultado do Google Sign-In recebido");
            
            Task<GoogleSignInAccount> task = GoogleSignIn.getSignedInAccountFromIntent(data);
            
            try {
                // Login bem-sucedido, obter conta Google
                GoogleSignInAccount account = task.getResult(ApiException.class);
                
                if (account != null) {
                    String idToken = account.getIdToken();
                    String email = account.getEmail();
                    String displayName = account.getDisplayName();
                    
                    Log.d("MainActivity", "✅ Login Google bem-sucedido!");
                    Log.d("MainActivity", "📧 Email: " + email);
                    Log.d("MainActivity", "👤 Nome: " + displayName);
                    Log.d("MainActivity", "🎫 ID Token disponível: " + (idToken != null));
                    
                    if (idToken != null) {
                        // Enviar ID Token para o JavaScript
                        String script = String.format(
                            "console.log('📱 Recebido ID Token do Android'); " +
                            "if(window.onGoogleSignInSuccess) { " +
                            "  window.onGoogleSignInSuccess('%s'); " +
                            "} else { " +
                            "  console.error('❌ window.onGoogleSignInSuccess não encontrado'); " +
                            "}",
                            idToken
                        );
                        
                        runOnUiThread(() -> webView.evaluateJavascript(script, null));
                    } else {
                        sendGoogleSignInError("ID Token não encontrado. Verifique a configuração do WEB Client ID.");
                    }
                } else {
                    sendGoogleSignInError("Conta Google não encontrada na resposta.");
                }
                
            } catch (ApiException e) {
                Log.e("MainActivity", "❌ Erro no Google Sign-In: " + e.getStatusCode() + " - " + e.getMessage());
                
                String errorMessage;
                switch (e.getStatusCode()) {
                    case 10: // DEVELOPER_ERROR - Configuração incorreta
                        errorMessage = "ERRO 10: SHA-1 fingerprint de PRODUÇÃO não configurado no Google Cloud Console. " +
                                     "Debug funciona mas produção (.aab) precisa do SHA-1 da chave de release.";
                        Log.e("MainActivity", "🚨 DEVELOPER_ERROR (10): Configuração incorreta para produção");
                        Log.e("MainActivity", "🔧 SOLUÇÃO: Adicione o SHA-1 de PRODUÇÃO no Google Cloud Console");
                        Log.e("MainActivity", "🔧 COMANDO: keytool -keystore meu-app-release-key.keystore -list -v");
                        break;
                    case 12501: // SIGN_IN_CANCELLED
                        errorMessage = "Login cancelado pelo usuário";
                        break;
                    case 12502: // SIGN_IN_FAILED
                        errorMessage = "Falha no login. Verifique a configuração do Google Cloud Console";
                        break;
                    case 12500: // SIGN_IN_REQUIRED
                        errorMessage = "Login necessário";
                        break;
                    default:
                        errorMessage = "Erro no login: " + e.getStatusCode() + " - " + e.getMessage();
                        break;
                }
                
                sendGoogleSignInError(errorMessage);
            }
        }
    }

    private String getFileName(Uri uri) {
        String fileName = "unknown";
        if (uri.getScheme().equals("content")) {
            android.database.Cursor cursor = getContentResolver().query(uri, null, null, null, null);
            try {
                if (cursor != null && cursor.moveToFirst()) {
                    int nameIndex = cursor.getColumnIndex(android.provider.OpenableColumns.DISPLAY_NAME);
                    if (nameIndex != -1) {
                        fileName = cursor.getString(nameIndex);
                    }
                }
            } finally {
                if (cursor != null) {
                    cursor.close();
                }
            }
        }
        return fileName;
    }

    private void sendGalleryImageAsBase64(Bitmap bitmap) {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        String base64Image = Base64.encodeToString(byteArray, Base64.NO_WRAP);
        
        String imageDataUrl = "data:image/jpeg;base64," + base64Image;

        String script = String.format("javascript:onGalleryImageSelected('%s');", imageDataUrl);
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    private void sendFileAsBase64(String fileDataUrl, String fileName, String mimeType) {
        String script = String.format("javascript:onFileSelected('%s', '%s', '%s');", 
            fileDataUrl, fileName, mimeType);
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }
    
    private void sendGoogleSignInError(String error) {
        Log.e("MainActivity", "🚨 Enviando erro para JavaScript: " + error);
        
        String script = String.format(
            "console.error('❌ Erro Android: %s'); " +
            "if(window.onGoogleSignInError) { " +
            "  window.onGoogleSignInError('%s'); " +
            "} else { " +
            "  console.error('❌ window.onGoogleSignInError não encontrado'); " +
            "}",
            error.replace("'", "\\'"),
            error.replace("'", "\\'")
        );
        
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    private void sendImageAsBase64(Bitmap bitmap) {
        ByteArrayOutputStream byteArrayOutputStream = new ByteArrayOutputStream();
        bitmap.compress(Bitmap.CompressFormat.JPEG, 80, byteArrayOutputStream);
        byte[] byteArray = byteArrayOutputStream.toByteArray();
        String base64Image = Base64.encodeToString(byteArray, Base64.NO_WRAP);
        
        String imageDataUrl = "data:image/jpeg;base64," + base64Image;

        String script = String.format("javascript:onImageCaptureComplete('%s');", imageDataUrl);
        runOnUiThread(() -> webView.evaluateJavascript(script, null));
    }

    @Override
    public void onBackPressed() {
        if (webView.canGoBack()) {
            webView.goBack();
        } else {
            super.onBackPressed();
        }
    }

    @Override
    protected void onResume() {
        super.onResume();
        // Lida com o intent caso o app tenha sido aberto por uma notificação
        handleNotificationIntent(getIntent());
    }

    public WebView getWebView() {
        return webView;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            CharSequence name = getString(R.string.app_name);
            String description = "Canal para notificações do Finaudy";
            int importance = NotificationManager.IMPORTANCE_HIGH;  // Mudou para HIGH
            NotificationChannel channel = new NotificationChannel(getString(R.string.default_notification_channel_id), name, importance);
            channel.setDescription(description);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
            }
        }
    }

    @Override
    protected void onDestroy() {
        super.onDestroy();
        instance = null;
    }
}