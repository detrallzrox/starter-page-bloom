// Centralized notification utilities
// Extracted from hooks to promote reusability and reduce code duplication

interface NotificationClickData {
  type?: string;
  sharing_invite_id?: string;
  reminder_id?: string;
  transaction_id?: string;
  url?: string;
  [key: string]: any;
}

/**
 * Centralized handler for notification clicks
 * Works for both web push and mobile push notifications
 */
export const handleNotificationClick = (data: NotificationClickData) => {
  console.log('🔔 Notification clicked:', data);
  
  try {
    // Handle sharing invitation notifications
    if (data.type === 'sharing_invite' && data.sharing_invite_id) {
      console.log('🤝 Opening sharing invitation:', data.sharing_invite_id);
      
      // Create custom event to trigger shared account modal
      window.dispatchEvent(
        new CustomEvent('open-shared-account-modal', {
          detail: { inviteId: data.sharing_invite_id }
        })
      );
      return;
    }
    
    // Handle bill reminder notifications
    if (data.type === 'bill_reminder' && data.reminder_id) {
      console.log('💰 Opening bill reminder:', data.reminder_id);
      
      // Navigate to main page and open reminders section
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      
      // Scroll to reminders section after navigation
      setTimeout(() => {
        const remindersSection = document.getElementById('bill-reminders');
        if (remindersSection) {
          remindersSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return;
    }
    
    // Handle transaction notifications
    if (data.type === 'transaction' && data.transaction_id) {
      console.log('💳 Opening transaction:', data.transaction_id);
      
      // Navigate to main page and highlight transaction
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      
      // Scroll to transactions section after navigation
      setTimeout(() => {
        const transactionsSection = document.getElementById('recent-transactions');
        if (transactionsSection) {
          transactionsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return;
    }
    
    // Handle budget notifications
    if (data.type === 'budget_exceeded') {
      console.log('📊 Opening budget analysis');
      
      // Navigate to main page and open charts section
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      
      // Scroll to charts section after navigation
      setTimeout(() => {
        const chartsSection = document.getElementById('financial-charts');
        if (chartsSection) {
          chartsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return;
    }
    
    // Handle subscription notifications
    if (data.type === 'subscription_renewal' || data.type === 'subscription_overdue') {
      console.log('🔄 Opening subscriptions');
      
      // Navigate to main page and open subscriptions section
      if (window.location.pathname !== '/') {
        window.location.href = '/';
      }
      
      // Scroll to subscriptions section after navigation
      setTimeout(() => {
        const subscriptionsSection = document.getElementById('subscriptions');
        if (subscriptionsSection) {
          subscriptionsSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 500);
      return;
    }
    
    // Default: navigate to main page if URL is provided or different page
    if (data.url && data.url !== window.location.href) {
      console.log('🌐 Navigating to:', data.url);
      window.location.href = data.url;
      return;
    }
    
    // Fallback: just navigate to main page
    if (window.location.pathname !== '/') {
      console.log('🏠 Navigating to main page');
      window.location.href = '/';
    }
    
  } catch (error) {
    console.error('❌ Error handling notification click:', error);
    
    // Fallback: navigate to main page
    if (window.location.pathname !== '/') {
      window.location.href = '/';
    }
  }
};

/**
 * Register service worker notification click handler
 * Should be called during service worker registration
 */
export const registerNotificationClickHandler = () => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data && event.data.type === 'NOTIFICATION_CLICK') {
        handleNotificationClick(event.data.data || {});
      }
    });
  }
};

/**
 * Format notification data for consistent handling
 */
export const formatNotificationData = (data: any): NotificationClickData => {
  return {
    type: data?.type || 'default',
    sharing_invite_id: data?.sharing_invite_id,
    reminder_id: data?.reminder_id,
    transaction_id: data?.transaction_id,
    url: data?.url || data?.click_action,
    ...data
  };
};