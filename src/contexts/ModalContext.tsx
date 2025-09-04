import { createContext, useContext, useState, ReactNode } from 'react';

interface ModalContextType {
  isSharedAccountOpen: boolean;
  isBillRemindersOpen: boolean;
  isCategoryBudgetOpen: boolean;
  isSubscriptionsOpen: boolean;
  isInstallmentPurchasesOpen: boolean;
  openSharedAccount: () => void;
  closeSharedAccount: () => void;
  openBillReminders: () => void;
  closeBillReminders: () => void;
  openCategoryBudget: () => void;
  closeCategoryBudget: () => void;
  openSubscriptions: () => void;
  closeSubscriptions: () => void;
  openInstallmentPurchases: () => void;
  closeInstallmentPurchases: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error('useModal must be used within a ModalProvider');
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [isSharedAccountOpen, setIsSharedAccountOpen] = useState(false);
  const [isBillRemindersOpen, setIsBillRemindersOpen] = useState(false);
  const [isCategoryBudgetOpen, setIsCategoryBudgetOpen] = useState(false);
  const [isSubscriptionsOpen, setIsSubscriptionsOpen] = useState(false);
  const [isInstallmentPurchasesOpen, setIsInstallmentPurchasesOpen] = useState(false);

  const openSharedAccount = () => {
    console.log('🔔 ModalContext: Opening shared account modal');
    setIsSharedAccountOpen(true);
  };

  const closeSharedAccount = () => {
    setIsSharedAccountOpen(false);
  };

  const openBillReminders = () => {
    console.log('🔔 ModalContext: Opening bill reminders modal');
    setIsBillRemindersOpen(true);
  };

  const closeBillReminders = () => {
    setIsBillRemindersOpen(false);
  };

  const openCategoryBudget = () => {
    console.log('🔔 ModalContext: Opening category budget modal');
    setIsCategoryBudgetOpen(true);
  };

  const closeCategoryBudget = () => {
    setIsCategoryBudgetOpen(false);
  };

  const openSubscriptions = () => {
    console.log('🔔 ModalContext: Opening subscriptions modal');
    setIsSubscriptionsOpen(true);
  };

  const closeSubscriptions = () => {
    setIsSubscriptionsOpen(false);
  };

  const openInstallmentPurchases = () => {
    console.log('🔔 ModalContext: Opening installment purchases modal');
    setIsInstallmentPurchasesOpen(true);
  };

  const closeInstallmentPurchases = () => {
    setIsInstallmentPurchasesOpen(false);
  };

  return (
    <ModalContext.Provider
      value={{
        isSharedAccountOpen,
        isBillRemindersOpen,
        isCategoryBudgetOpen,
        isSubscriptionsOpen,
        isInstallmentPurchasesOpen,
        openSharedAccount,
        closeSharedAccount,
        openBillReminders,
        closeBillReminders,
        openCategoryBudget,
        closeCategoryBudget,
        openSubscriptions,
        closeSubscriptions,
        openInstallmentPurchases,
        closeInstallmentPurchases,
      }}
    >
      {children}
    </ModalContext.Provider>
  );
};