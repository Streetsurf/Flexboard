import { useState, useCallback } from 'react';
import { NotificationData, ConfirmationData } from '../components/UI/NotificationSystem';

export const useNotifications = () => {
  const [notifications, setNotifications] = useState<NotificationData[]>([]);
  const [confirmations, setConfirmations] = useState<ConfirmationData[]>([]);

  const showNotification = useCallback((
    type: NotificationData['type'],
    title: string,
    message: string,
    options?: {
      duration?: number;
      action?: {
        label: string;
        onClick: () => void;
      };
    }
  ) => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const notification: NotificationData = {
      id,
      type,
      title,
      message,
      duration: options?.duration || 5000,
      action: options?.action,
    };

    setNotifications(prev => [...prev, notification]);
    return id;
  }, []);

  const showSuccess = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return showNotification('success', title, message, options);
  }, [showNotification]);

  const showError = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return showNotification('error', title, message, options);
  }, [showNotification]);

  const showWarning = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return showNotification('warning', title, message, options);
  }, [showNotification]);

  const showInfo = useCallback((title: string, message: string, options?: { duration?: number }) => {
    return showNotification('info', title, message, options);
  }, [showNotification]);

  const showConfirmation = useCallback((
    title: string,
    message: string,
    onConfirm: () => void,
    options?: {
      confirmText?: string;
      cancelText?: string;
      type?: ConfirmationData['type'];
      onCancel?: () => void;
    }
  ): Promise<boolean> => {
    return new Promise((resolve) => {
      const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
      const confirmation: ConfirmationData = {
        id,
        title,
        message,
        confirmText: options?.confirmText,
        cancelText: options?.cancelText,
        type: options?.type || 'warning',
        onConfirm: () => {
          onConfirm();
          resolve(true);
        },
        onCancel: () => {
          if (options?.onCancel) {
            options.onCancel();
          }
          resolve(false);
        },
      };

      setConfirmations(prev => [...prev, confirmation]);
    });
  }, []);

  const removeNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  }, []);

  const removeConfirmation = useCallback((id: string) => {
    setConfirmations(prev => prev.filter(confirmation => confirmation.id !== id));
  }, []);

  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
  }, []);

  return {
    notifications,
    confirmations,
    showNotification,
    showSuccess,
    showError,
    showWarning,
    showInfo,
    showConfirmation,
    removeNotification,
    removeConfirmation,
    clearAllNotifications,
  };
};