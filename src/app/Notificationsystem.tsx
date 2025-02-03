import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const notificationVariants = {
  initial: { opacity: 0, y: 50, scale: 0.3 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, scale: 0.5, transition: { duration: 0.2 } },
};

const NotificationIcon = ({ type }: { type: 'success' | 'error' | 'info' }) => {
  const icons = {
    success: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M5 13l4 4L19 7"
        />
      </svg>
    ),
    error: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    ),
    info: (
      <svg
        className="w-6 h-6"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
    ),
  };

  return icons[type];
};

const NotificationContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="fixed top-4 right-4 z-50 flex flex-col gap-4">{children}</div>
);

const NotificationItem = ({
  message,
  type = 'info',
  onClose,
}: {
  message: string;
  type: 'success' | 'error' | 'info';
  onClose: () => void;
}) => {
  const bgColors = {
    success: 'bg-gradient-to-r from-green-500 to-green-600',
    error: 'bg-gradient-to-r from-red-500 to-red-600',
    info: 'bg-gradient-to-r from-blue-500 to-blue-600',
  };

  React.useEffect(() => {
    const timer = setTimeout(onClose, 5000);
    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <motion.div
      variants={notificationVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      className={`${bgColors[type]} text-white p-4 rounded-xl shadow-lg backdrop-blur-lg 
        border border-white/20 flex items-center gap-3 min-w-[300px] max-w-md
        hover:scale-105 transition-transform duration-200`}
      style={{
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
      }}
    >
      <div className="flex-shrink-0">
        <NotificationIcon type={type} />
      </div>
      <p className="flex-1 text-sm font-medium">{message}</p>
      <button
        onClick={onClose}
        className="flex-shrink-0 hover:bg-white/20 rounded-full p-1 transition-colors"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="2"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </button>
    </motion.div>
  );
};

export const useNotification = () => {
  const [notifications, setNotifications] = React.useState<
    Array<{
      id: string;
      message: string;
      type: 'success' | 'error' | 'info';
    }>
  >([]);

  const showNotification = (
    message: string,
    type: 'success' | 'error' | 'info' = 'info'
  ) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, message, type }]);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) =>
      prev.filter((notification) => notification.id !== id)
    );
  };

  const NotificationSystem = () => (
    <NotificationContainer>
      <AnimatePresence mode="popLayout">
        {notifications.map(({ id, message, type }) => (
          <NotificationItem
            key={id}
            message={message}
            type={type}
            onClose={() => removeNotification(id)}
          />
        ))}
      </AnimatePresence>
    </NotificationContainer>
  );

  return {
    showNotification,
    NotificationSystem,
  };
};

export default useNotification;
