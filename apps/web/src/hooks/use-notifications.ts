import { useState, useEffect, useCallback } from "react";
import { notificationApi } from "@/lib/api-client";
import type { Notification } from "@/types/notification";
import { useAuth } from "@/hooks/use-auth";
import { socketClient } from "@/lib/socket-client";
import { toast } from "sonner";

export function useNotifications() {
  const { user, token } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    try {
      setLoading(true);
      const data = await notificationApi.list();
      setNotifications(data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const data = await notificationApi.getUnreadCount();
      setUnreadCount(data.count);
    } catch (error) {
      console.error("Failed to fetch unread count:", error);
    }
  }, [user]);

  const markAsRead = async (id: string) => {
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  // Socket Connection
  useEffect(() => {
    if (token) {
      socketClient.connect(token);
    }
    return () => {
      // Optional: socketClient.disconnect();
      // We might want to keep it persistent or manage it globally
    };
  }, [token]);

  // Listen for notifications
  useEffect(() => {
    if (!user) return;

    const handleNewNotification = (notification: Notification) => {
      // Add to list
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((prev) => prev + 1);

      // Show toast
      toast(notification.title, {
        description: notification.message,
        // action: {
        //     label: "View",
        //     onClick: () => console.log("View notification")
        // }
      });
    };

    if (socketClient.socket) {
      socketClient.socket.on(`notification_${user.id}`, handleNewNotification);
    }

    return () => {
      if (socketClient.socket) {
        socketClient.socket.off(
          `notification_${user.id}`,
          handleNewNotification,
        );
      }
    };
  }, [user, socketClient.socket]);

  useEffect(() => {
    fetchNotifications();
    fetchUnreadCount();
  }, [fetchNotifications, fetchUnreadCount]);

  return {
    notifications,
    unreadCount,
    loading,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
  };
}
