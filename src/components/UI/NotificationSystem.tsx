import React, { useState, useEffect } from 'react';
import { X, Check, AlertTriangle, Info, AlertCircle, Trash2 } from 'lucide-react';

export interface NotificationData {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface ConfirmationData {
  id: string;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface NotificationSystemProps {
  notifications: NotificationData[];
  confirmations: ConfirmationData[];
  onRemoveNotification: (id: string) => void;
  onRemoveConfirmation: (id: string) => void;
}

const NotificationSystem: React.FC<NotificationSystemProps> = ({
  notifications,
  confirmations,
  onRemoveNotification,
  onRemoveConfirmation,
}) => {
  const getNotificationIcon = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return <Check className="w-5 h-5 text-green-600" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-600" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-600" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-gray-600" />;
    }
  };

  const getNotificationStyles = (type: NotificationData['type']) => {
    switch (type) {
      case 'success':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-800';
    }
  };

  const getConfirmationStyles = (type: ConfirmationData['type']) => {
    switch (type) {
      case 'danger':
        return {
          icon: <Trash2 className="w-6 h-6 text-red-600" />,
          confirmButton: 'bg-red-600 hover:bg-red-700 text-white',
          iconBg: 'bg-red-100'
        };
      case 'warning':
        return {
          icon: <AlertTriangle className="w-6 h-6 text-yellow-600" />,
          confirmButton: 'bg-yellow-600 hover:bg-yellow-700 text-white',
          iconBg: 'bg-yellow-100'
        };
      case 'info':
        return {
          icon: <Info className="w-6 h-6 text-blue-600" />,
          confirmButton: 'bg-blue-600 hover:bg-blue-700 text-white',
          iconBg: 'bg-blue-100'
        };
      default:
        return {
          icon: <AlertTriangle className="w-6 h-6 text-gray-600" />,
          confirmButton: 'bg-gray-600 hover:bg-gray-700 text-white',
          iconBg: 'bg-gray-100'
        };
    }
  };

  return (
    <>
      {/* Notifications Container */}
      <div className="fixed top-4 right-4 z-50 space-y-3 max-w-sm w-full">
        {notifications.map((notification) => (
          <NotificationToast
            key={notification.id}
            notification={notification}
            onRemove={onRemoveNotification}
            getIcon={getNotificationIcon}
            getStyles={getNotificationStyles}
          />
        ))}
      </div>

      {/* Confirmations Container */}
      {confirmations.map((confirmation) => (
        <ConfirmationModal
          key={confirmation.id}
          confirmation={confirmation}
          onRemove={onRemoveConfirmation}
          getStyles={getConfirmationStyles}
        />
      ))}
    </>
  );
};

interface NotificationToastProps {
  notification: NotificationData;
  onRemove: (id: string) => void;
  getIcon: (type: NotificationData['type']) => React.ReactNode;
  getStyles: (type: NotificationData['type']) => string;
}

const NotificationToast: React.FC<NotificationToastProps> = ({
  notification,
  onRemove,
  getIcon,
  getStyles,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    // Trigger entrance animation
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (notification.duration && notification.duration > 0) {
      const timer = setTimeout(() => {
        handleRemove();
      }, notification.duration);
      return () => clearTimeout(timer);
    }
  }, [notification.duration]);

  const handleRemove = () => {
    setIsLeaving(true);
    setTimeout(() => {
      onRemove(notification.id);
    }, 300);
  };

  return (
    <div
      className={`transform transition-all duration-300 ease-out ${
        isVisible && !isLeaving
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <div
        className={`p-4 rounded-xl border shadow-lg backdrop-blur-sm ${getStyles(
          notification.type
        )} animate-slideIn`}
      >
        <div className="flex items-start space-x-3">
          <div className="flex-shrink-0 mt-0.5">
            {getIcon(notification.type)}
          </div>
          
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold mb-1">
              {notification.title}
            </h4>
            <p className="text-sm opacity-90 leading-relaxed">
              {notification.message}
            </p>
            
            {notification.action && (
              <button
                onClick={notification.action.onClick}
                className="mt-2 text-sm font-medium underline hover:no-underline transition-all duration-200"
              >
                {notification.action.label}
              </button>
            )}
          </div>
          
          <button
            onClick={handleRemove}
            className="flex-shrink-0 p-1 rounded-lg hover:bg-black hover:bg-opacity-10 transition-all duration-200 hover-scale"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

interface ConfirmationModalProps {
  confirmation: ConfirmationData;
  onRemove: (id: string) => void;
  getStyles: (type: ConfirmationData['type']) => {
    icon: React.ReactNode;
    confirmButton: string;
    iconBg: string;
  };
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  confirmation,
  onRemove,
  getStyles,
}) => {
  const styles = getStyles(confirmation.type);

  const handleConfirm = () => {
    confirmation.onConfirm();
    onRemove(confirmation.id);
  };

  const handleCancel = () => {
    if (confirmation.onCancel) {
      confirmation.onCancel();
    }
    onRemove(confirmation.id);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scaleIn">
        <div className="p-6">
          {/* Icon */}
          <div className={`w-12 h-12 ${styles.iconBg} rounded-full flex items-center justify-center mx-auto mb-4`}>
            {styles.icon}
          </div>
          
          {/* Content */}
          <div className="text-center mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {confirmation.title}
            </h3>
            <p className="text-gray-600 leading-relaxed">
              {confirmation.message}
            </p>
          </div>
          
          {/* Actions */}
          <div className="flex space-x-3">
            <button
              onClick={handleCancel}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 hover-lift"
            >
              {confirmation.cancelText || 'Batal'}
            </button>
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 rounded-xl font-medium transition-all duration-200 hover-lift ${styles.confirmButton}`}
            >
              {confirmation.confirmText || 'Hapus'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationSystem;