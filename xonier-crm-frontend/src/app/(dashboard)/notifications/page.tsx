import React from "react";
import NotificationList from "@/src/components/pages/notifications/NotificationList";

export const metadata = {
  title: "Notifications | Trackeroo CRM",
  description: "View and manage your notifications",
};

const NotificationsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8">
      <NotificationList />
    </div>
  );
};

export default NotificationsPage;