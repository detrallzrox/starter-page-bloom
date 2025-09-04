// Service Worker para Push Notifications
const CACHE_NAME = 'finaudy-sw-v1';
const VAPID_PUBLIC_KEY = 'BNz9y9ZZgwn9YhJtYzBv3l7-y9xYbJlKUjzPl2K8IuXvVaY0jJ7x8J4c3n2j4l3-a9xYbJlKUjzPl2K8IuXvVaY0';

// Instalar service worker
self.addEventListener('install', event => {
  console.log('🔧 Service Worker instalado');
  self.skipWaiting();
});

// Ativar service worker
self.addEventListener('activate', event => {
  console.log('✅ Service Worker ativado');
  event.waitUntil(self.clients.claim());
});

// Escutar mensagens push reais
self.addEventListener('push', event => {
  console.log('🔔 Push notification recebida:', event);
  
  let notificationData = {};
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (error) {
      console.error('Erro ao parsear dados da notificação:', error);
      notificationData = {
        title: 'Finaudy',
        body: event.data.text() || 'Nova notificação',
        data: {}
      };
    }
  }
  
  const { title = 'Finaudy', body = 'Nova notificação', data = {}, type } = notificationData;
  
  // Configurar ícone baseado no tipo de notificação
  let icon = '/favicon.ico';
  let badge = '/favicon.ico';
  
  if (type === 'sharing_invite') {
    icon = '/finaudy-mascot.png';
  } else if (type === 'bill_reminder') {
    icon = '/finaudy-pig.png';
  }
  
  const options = {
    body,
    icon,
    badge,
    tag: data.tag || type || 'default',
    requireInteraction: type === 'sharing_invite', // Convites precisam de interação
    silent: false,
    vibrate: [200, 100, 200],
    data: {
      type,
      ...data,
      timestamp: Date.now(),
      url: self.location.origin
    },
    actions: [
      {
        action: 'view',
        title: 'Ver detalhes',
        icon: '/favicon.ico'
      },
      {
        action: 'dismiss',
        title: 'Dispensar',
        icon: '/favicon.ico'
      }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Escutar cliques nas notificações
self.addEventListener('notificationclick', event => {
  console.log('🔔 Notificação clicada:', event);
  
  event.notification.close();
  
  const notificationData = event.notification.data || {};
  const { type, action = 'view', ...data } = { ...notificationData, action: event.action };
  
  // Se foi ação de dispensar, apenas fechar
  if (action === 'dismiss') {
    return;
  }
  
  // Determinar URL baseado no tipo de notificação
  let targetUrl = '/';
  
  switch (type) {
    case 'sharing_invite':
    case 'sharing_accepted':
      targetUrl = '/#sharing';
      break;
    case 'bill_reminder':
    case 'reminder':
      targetUrl = '/#reminders'; 
      break;
    case 'subscription':
      targetUrl = '/#subscriptions';
      break;
    case 'budget_exceeded':
      targetUrl = data.category_id ? `/#budgets?category=${data.category_id}` : '/#budgets';
      break;
    default:
      targetUrl = '/';
      break;
  }
  
  console.log(`🔗 Redirecionando para: ${targetUrl}`);
  
  // Abrir ou focar na janela do app
  event.waitUntil(
    self.clients.matchAll({ 
      type: 'window',
      includeUncontrolled: true 
    }).then(clients => {
      // Procurar por uma janela já aberta do app
      const existingClient = clients.find(client => 
        client.url.includes(data.url) || client.url.includes('finaudy')
      );
      
      if (existingClient) {
        existingClient.navigate(targetUrl);
        return existingClient.focus();
      } else {
        // Abrir nova janela
        return self.clients.openWindow(targetUrl);
      }
    }).catch(error => {
      console.error('Erro ao abrir janela:', error);
      // Fallback: tentar abrir janela simples
      return self.clients.openWindow(targetUrl);
    })
  );
});

// Escutar mensagens do app principal
self.addEventListener('message', event => {
  console.log('📨 Mensagem recebida no SW:', event.data);
  
  if (event.data && event.data.type === 'SHOW_NOTIFICATION') {
    const { title, message, icon, data = {}, notificationType } = event.data;
    
    const options = {
      body: message,
      icon: icon || '/finaudy-mascot.png',
      badge: '/favicon.ico',
      requireInteraction: notificationType === 'sharing_invite',
      silent: false,
      vibrate: [200, 100, 200],
      data: {
        type: notificationType,
        ...data,
        timestamp: Date.now(),
        url: self.location.origin
      },
      actions: [
        {
          action: 'view',
          title: 'Ver detalhes'
        },
        {
          action: 'dismiss', 
          title: 'Dispensar'
        }
      ]
    };

    self.registration.showNotification(title, options);
  }
  
  // Responder mensagens de ping para verificar se SW está ativo
  if (event.data && event.data.type === 'PING') {
    event.ports[0]?.postMessage({ type: 'PONG', timestamp: Date.now() });
  }
});

// Background sync para notificações offline
self.addEventListener('sync', event => {
  console.log('🔄 Background sync:', event.tag);
  
  if (event.tag === 'background-notifications') {
    event.waitUntil(
      // Aqui você pode implementar lógica para sincronizar notificações offline
      Promise.resolve()
    );
  }
});

// Interceptar requisições para cache (opcional)
self.addEventListener('fetch', event => {
  // Por enquanto, apenas deixar passar todas as requisições
  // Você pode implementar estratégias de cache aqui se necessário
});