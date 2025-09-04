package com.finaudy;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Intent;
import android.os.Build;
import android.util.Log;

import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;

import com.google.firebase.messaging.FirebaseMessagingService;
import com.google.firebase.messaging.RemoteMessage;

import java.util.Map;
import java.util.Random;

public class MyFirebaseMessagingService extends FirebaseMessagingService {

    private static final String TAG = "MyFirebaseMsgService";
    private static final String CHANNEL_ID = "finaudy_channel";
    private static final String CHANNEL_NAME = "Notificações Finaudy";
    private static final String CHANNEL_DESCRIPTION = "Notificações gerais e lembretes do Finaudy";

    @Override
    public void onMessageReceived(RemoteMessage remoteMessage) {
        Log.d(TAG, "From: " + remoteMessage.getFrom());
        Log.d(TAG, "Message received with data: " + remoteMessage.getData());

        String title = null;
        String body = null;

        // Prioriza dados personalizados sobre notification payload
        if (remoteMessage.getNotification() != null) {
            title = remoteMessage.getNotification().getTitle();
            body = remoteMessage.getNotification().getBody();
            Log.d(TAG, "Notification payload - Title: " + title + ", Body: " + body);
        }

        // Se não tiver notification payload, tenta obter dos dados
        if (title == null || body == null) {
            Map<String, String> data = remoteMessage.getData();
            title = data.get("title");
            body = data.get("body");
            Log.d(TAG, "Data payload - Title: " + title + ", Body: " + body);
        }

        if (title != null && body != null) {
            sendNotification(title, body, remoteMessage.getData());
        } else {
            Log.w(TAG, "Notification received but no valid title/body found");
        }
    }

    @Override
    public void onNewToken(String token) {
        Log.d(TAG, "Refreshed FCM token: " + token);
        // Enviar token para o JavaScript para registrar no servidor
        sendTokenToWebView(token);
    }

    private void sendTokenToWebView(String token) {
        // Encontra MainActivity e executa JavaScript para atualizar o token
        try {
            MainActivity mainActivity = MainActivity.getInstance();
            if (mainActivity != null && mainActivity.getWebView() != null) {
                mainActivity.runOnUiThread(() -> {
                    String script = String.format("javascript:onFCMTokenReceived('%s');", token);
                    mainActivity.getWebView().evaluateJavascript(script, null);
                });
            }
        } catch (Exception e) {
            Log.e(TAG, "Error sending token to WebView: " + e.getMessage());
        }
    }

    private void sendNotification(String title, String messageBody, Map<String, String> data) {
        createNotificationChannel();

        // Intent para abrir o app ao clicar na notificação
        Intent intent = new Intent(this, MainActivity.class);
        intent.addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP);
        
        // Adiciona dados extras se disponível
        if (data != null && !data.isEmpty()) {
            for (Map.Entry<String, String> entry : data.entrySet()) {
                intent.putExtra(entry.getKey(), entry.getValue());
            }
        }

        PendingIntent pendingIntent = PendingIntent.getActivity(this, 0, intent,
                PendingIntent.FLAG_ONE_SHOT | PendingIntent.FLAG_IMMUTABLE);

        // Gera ID único para cada notificação para evitar substituições
        int notificationId = new Random().nextInt();

        NotificationCompat.Builder notificationBuilder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setSmallIcon(R.drawable.ic_notification)
                .setContentTitle(title)
                .setContentText(messageBody)
                .setAutoCancel(true)
                .setSound(android.provider.Settings.System.DEFAULT_NOTIFICATION_URI)
                .setContentIntent(pendingIntent)
                .setPriority(NotificationCompat.PRIORITY_HIGH)
                .setDefaults(NotificationCompat.DEFAULT_ALL);

        // Adiciona estilo expandido para mensagens longas
        if (messageBody != null && messageBody.length() > 40) {
            notificationBuilder.setStyle(new NotificationCompat.BigTextStyle().bigText(messageBody));
        }

        NotificationManagerCompat notificationManager = NotificationManagerCompat.from(this);
        
        try {
            notificationManager.notify(notificationId, notificationBuilder.build());
            Log.d(TAG, "✅ Notification sent successfully with ID: " + notificationId);
        } catch (SecurityException e) {
            Log.e(TAG, "❌ Permission denied for notifications: " + e.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "❌ Error sending notification: " + e.getMessage());
        }
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    CHANNEL_NAME,
                    NotificationManager.IMPORTANCE_HIGH  // Mudou de DEFAULT para HIGH
            );
            channel.setDescription(CHANNEL_DESCRIPTION);
            channel.enableLights(true);
            channel.enableVibration(true);
            channel.setShowBadge(true);
            
            NotificationManager notificationManager = getSystemService(NotificationManager.class);
            if (notificationManager != null) {
                notificationManager.createNotificationChannel(channel);
                Log.d(TAG, "✅ Notification channel created successfully");
            }
        }
    }
}
