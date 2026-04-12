import React, { useCallback, useEffect, useRef, useState } from "react";
import { HashRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { Bell, CircleUserRound, LogOut } from "lucide-react";
import { clearStoredSession, getStoredUser, hasValidSession } from "./services/authStorage";
import useIsMobile from "./hooks/useIsMobile";
import "./App.css";
import { API_BASE_URL } from "./config/api";

// Components
import Sidebar from "./components/Sidebar";







// Pages
import Records from "./pages/records";
import Transactions from "./pages/Transactions";
import Category from "./pages/Category";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import Profile from "./pages/Profile";
import Alerts from "./pages/Alerts";

// Auth Pages
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";

const CURRENT_SPENDING_KEY = "currentSpending";
const ALERT_STORAGE_KEY = "pennywise-triggered-alerts";
const ALERT_HISTORY_STORAGE_KEY = "pennywise-triggered-alert-history";
const DISMISSED_ALERT_STORAGE_KEY = "pennywise-dismissed-triggered-alerts";
const CLEARED_ALERT_STORAGE_KEY = "pennywise-cleared-triggered-alerts";
const ALERTS_UPDATED_EVENT = "pennywise-alerts-updated";
const INR_SYMBOL = "\u20B9";
const MAX_NOTIFICATION_HISTORY_ITEMS = 100;

const formatCurrency = (value) => `${INR_SYMBOL}${Number(value || 0).toLocaleString("en-IN")}`;
const normalizeNotificationId = (value) => String(value ?? "");
const normalizeCurrencyText = (value) =>
  typeof value === "string"
    ? value.replace(/(^|[\s(])(?:â‚¹|�|\?)(?=\d)/g, `$1${INR_SYMBOL}`)
    : value;
const normalizeNotification = (notification) => ({
  ...notification,
  message: normalizeCurrencyText(notification?.message),
  detail: normalizeCurrencyText(notification?.detail)
});
const toLocalDateKey = (value) => {
  const nextDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(nextDate.getTime())) {
    return "unknown-date";
  }

  return `${nextDate.getFullYear()}-${String(nextDate.getMonth() + 1).padStart(2, "0")}-${String(
    nextDate.getDate()
  ).padStart(2, "0")}`;
};

const formatNotificationDateLabel = (value, now = new Date()) => {
  const nextDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(nextDate.getTime())) {
    return "Earlier";
  }

  const todayKey = toLocalDateKey(now);
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const dateKey = toLocalDateKey(nextDate);

  if (dateKey === todayKey) {
    return "Today";
  }

  if (dateKey === toLocalDateKey(yesterday)) {
    return "Yesterday";
  }

  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric"
  }).format(nextDate);
};

const formatNotificationTime = (value) => {
  const nextDate = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(nextDate.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit"
  }).format(nextDate);
};

const getNotificationSpendingValue = (alert, summary) =>
  Number(
    alert?.scope === "category"
      ? alert?.current_spending
      : alert?.current_spending ?? summary?.current_spending
  ) || 0;

export const buildNotificationInstanceId = (alert, summary) =>
  normalizeNotificationId(
    `${alert?.id ?? ""}:${getNotificationSpendingValue(alert, summary).toFixed(2)}`
  );

export const mapTriggeredAlertsToNotifications = (summary) => {
  const triggeredAlerts = Array.isArray(summary?.triggered_alerts)
    ? summary.triggered_alerts
    : [];

  return triggeredAlerts
    .map((alert) => ({
      id: buildNotificationInstanceId(alert, summary),
      percentage: alert.percentage,
      scope: alert.scope,
      budgetName: alert.budget_name || "",
      message:
        alert.scope === "category"
          ? `${alert.budget_name} reached ${alert.percentage}% of its budget`
          : `Spending reached ${alert.percentage}% of your monthly budget`,
      detail:
        alert.scope === "category"
          ? `${formatCurrency(alert.current_spending)} spent out of ${formatCurrency(alert.budget_amount)}`
          : `${formatCurrency(getNotificationSpendingValue(alert, summary))} spent out of ${formatCurrency(summary.budget)}`
    }))
    .map(normalizeNotification);
};

const readStoredNotifications = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(ALERT_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue.map((notification) => ({
          ...normalizeNotification(notification),
          id: normalizeNotificationId(notification.id)
        }))
      : [];
  } catch (error) {
    return [];
  }
};

const readStoredNotificationHistory = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(ALERT_HISTORY_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return Array.isArray(parsedValue)
      ? parsedValue
          .map((notification) => ({
            ...normalizeNotification(notification),
            id: normalizeNotificationId(notification.id)
          }))
          .filter((notification) => Boolean(notification.triggeredAt))
      : [];
  } catch (error) {
    return [];
  }
};

const normalizeNotificationIds = (values) =>
  Array.from(
    new Set(
      (Array.isArray(values) ? values : [])
        .map((value) => normalizeNotificationId(value))
        .filter((value) => value.length > 0)
    )
  );

export const filterNotificationsByIds = (notifications, excludedIds = []) => {
  const excludedIdSet = new Set(normalizeNotificationIds(excludedIds));

  return (Array.isArray(notifications) ? notifications : []).filter(
    (notification) => !excludedIdSet.has(normalizeNotificationId(notification.id))
  );
};

export const keepClearedIdsForActiveNotifications = (
  clearedIds,
  notifications = []
) => {
  const activeNotificationIds = new Set(
    (Array.isArray(notifications) ? notifications : [])
      .map((notification) => normalizeNotificationId(notification.id))
      .filter((value) => value.length > 0)
  );

  return normalizeNotificationIds(clearedIds).filter((id) => activeNotificationIds.has(id));
};

const readStoredClearedNotificationIds = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(CLEARED_ALERT_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return normalizeNotificationIds(parsedValue);
  } catch (error) {
    return [];
  }
};

const readStoredDismissedNotificationIds = () => {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const storedValue = window.localStorage.getItem(DISMISSED_ALERT_STORAGE_KEY);
    const parsedValue = storedValue ? JSON.parse(storedValue) : [];

    return normalizeNotificationIds(parsedValue);
  } catch (error) {
    return [];
  }
};

const PrivateRoute = ({ children }) => {
  const isLoggedIn = hasValidSession();

  return isLoggedIn ? children : <Navigate to="/login" />;
};

export const mergeNotificationHistory = (
  existingHistory,
  nextNotifications,
  now = new Date()
) => {
  const historyItems = Array.isArray(existingHistory) ? existingHistory : [];
  const activeNotifications = Array.isArray(nextNotifications) ? nextNotifications : [];
  const nextTimestamp = now instanceof Date ? now.toISOString() : new Date(now).toISOString();
  const historyById = new Map(
    historyItems.map((notification) => [
      normalizeNotificationId(notification.id),
      {
        ...notification,
        id: normalizeNotificationId(notification.id)
      }
    ])
  );

  activeNotifications.forEach((notification) => {
    const notificationId = normalizeNotificationId(notification.id);

    if (historyById.has(notificationId)) {
      return;
    }

    historyById.set(notificationId, {
      ...notification,
      id: notificationId,
      triggeredAt: nextTimestamp
    });
  });

  return Array.from(historyById.values())
    .sort((left, right) => new Date(right.triggeredAt) - new Date(left.triggeredAt))
    .slice(0, MAX_NOTIFICATION_HISTORY_ITEMS);
};

export const groupNotificationHistoryByDate = (history, now = new Date()) => {
  const groupedHistory = [];
  const groupsByKey = new Map();

  (Array.isArray(history) ? history : []).forEach((notification) => {
    const dateKey = toLocalDateKey(notification.triggeredAt);
    const existingGroup = groupsByKey.get(dateKey);

    if (existingGroup) {
      existingGroup.items.push(notification);
      return;
    }

    const nextGroup = {
      key: dateKey,
      label: formatNotificationDateLabel(notification.triggeredAt, now),
      items: [notification]
    };

    groupsByKey.set(dateKey, nextGroup);
    groupedHistory.push(nextGroup);
  });

  return groupedHistory.map((group) => ({
    ...group,
    items: [...group.items].sort(
      (left, right) => new Date(right.triggeredAt) - new Date(left.triggeredAt)
    )
  }));
};

export function TopBar({
  notifications = [],
  notificationHistory = [],
  refreshNotifications,
  clearNotificationHistory
}) {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const profileLabel = storedUser?.name || storedUser?.name || storedUser?.email || "Profile";
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isRefreshingNotifications, setIsRefreshingNotifications] = useState(false);
  const notificationPanelRef = useRef(null);
  const logoutPanelRef = useRef(null);
  const activeNotificationIds = new Set(notifications.map((notification) => notification.id));
  const historicalNotifications = notificationHistory.filter(
    (notification) => !activeNotificationIds.has(notification.id)
  );
  const notificationHistoryGroups = groupNotificationHistoryByDate(historicalNotifications);

  const handleLogout = () => {
    clearStoredSession();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    if (!isNotificationOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (
        notificationPanelRef.current &&
        !notificationPanelRef.current.contains(event.target)
      ) {
        setIsNotificationOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsNotificationOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isNotificationOpen]);

  useEffect(() => {
    if (!isLogoutOpen) {
      return undefined;
    }

    const handlePointerDown = (event) => {
      if (logoutPanelRef.current && !logoutPanelRef.current.contains(event.target)) {
        setIsLogoutOpen(false);
      }
    };

    const handleEscape = (event) => {
      if (event.key === "Escape") {
        setIsLogoutOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleEscape);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [isLogoutOpen]);

  const handleToggleNotifications = async () => {
    if (isNotificationOpen) {
      setIsNotificationOpen(false);
      return;
    }

    setIsLogoutOpen(false);
    setIsNotificationOpen(true);
    setIsRefreshingNotifications(true);
    await refreshNotifications();
    setIsRefreshingNotifications(false);
  };

  const handleToggleLogout = () => {
    setIsNotificationOpen(false);
    setIsLogoutOpen((currentValue) => !currentValue);
  };

  return (
    <div className="topbar">
      <div className="topbarNotificationWrap" ref={notificationPanelRef}>
        <button
          type="button"
          className={`topbarNotificationButton ${isNotificationOpen ? "topbarNotificationButtonActive" : ""}`}
          onClick={handleToggleNotifications}
          aria-label="Open notifications"
          aria-expanded={isNotificationOpen}
          title="Notifications"
        >
          <Bell size={22} />
          {notifications.length > 0 && (
            <span className="topbarNotificationBadge">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </button>

        {isNotificationOpen && (
          <div className="topbarNotificationPanel">
            <div className="topbarNotificationHeader">
              <div>
                <h4>Notifications</h4>
                <p>
                  {notifications.length > 0
                    ? `${notifications.length} triggered alert${notifications.length === 1 ? "" : "s"}`
                    : "No budget alerts are triggered right now."}
                </p>
              </div>

              <div className="topbarNotificationHeaderActions">
                <button
                  type="button"
                  className="topbarNotificationLink"
                  onClick={() => {
                    setIsNotificationOpen(false);
                    navigate("/alerts");
                  }}
                >
                  View Alerts
                </button>
                <button
                  type="button"
                  className="topbarNotificationLink topbarNotificationDangerLink"
                  onClick={clearNotificationHistory}
                  disabled={notifications.length === 0 && notificationHistory.length === 0}
                >
                  Clear Notifications
                </button>
              </div>
            </div>

            {isRefreshingNotifications ? (
              <p className="topbarNotificationEmpty">Loading notifications...</p>
            ) : notifications.length === 0 && notificationHistory.length === 0 ? (
              <p className="topbarNotificationEmpty">
                You will see triggered budget alerts here whenever spending crosses one of your thresholds.
              </p>
            ) : (
              <>
                {notifications.length > 0 && (
                  <div className="topbarNotificationSection">
                    <p className="topbarNotificationActiveSummary">Active right now</p>

                    <div className="topbarNotificationList">
                      {notifications.map((notification) => (
                        <div
                          className="topbarNotificationItem topbarNotificationItemActive"
                          key={notification.id}
                        >
                          <span className="topbarNotificationMarker" />
                          <div className="topbarNotificationCopy">
                            <strong>{notification.message}</strong>
                            <span>{notification.detail}</span>
                            {notification.triggeredAt && (
                              <span className="topbarNotificationTime">
                                Triggered at {formatNotificationTime(notification.triggeredAt)}
                              </span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="topbarNotificationSection">
                  <p className="topbarNotificationSectionLabel">Alert history</p>

                  {notificationHistoryGroups.length === 0 ? (
                    <p className="topbarNotificationEmpty">
                      Cleared alerts and past triggers will appear here once a threshold is crossed again.
                    </p>
                  ) : (
                    <div className="topbarNotificationHistory">
                      {notificationHistoryGroups.map((group) => (
                        <div className="topbarNotificationDateGroup" key={group.key}>
                          <span className="topbarNotificationDateLabel">{group.label}</span>

                          <div className="topbarNotificationList">
                            {group.items.map((notification) => (
                              <div
                                className="topbarNotificationItem"
                                key={`${group.key}-${notification.id}`}
                              >
                                <span className="topbarNotificationMarker" />
                                <div className="topbarNotificationCopy">
                                  <strong>{notification.message}</strong>
                                  <span>{notification.detail}</span>
                                  <span className="topbarNotificationTime">
                                    Triggered at {formatNotificationTime(notification.triggeredAt)}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Profile Button - Icon only */}
      <button
        type="button"
        className="topbarProfileButton"
        onClick={() => navigate("/profile")}
        aria-label="Open profile"
        title={profileLabel}
      >
        <CircleUserRound size={24} />
      </button>

      <div className="topbarLogoutWrap" ref={logoutPanelRef}>
        <button
          type="button"
          className={`topbarLogoutButton ${isLogoutOpen ? "topbarLogoutButtonActive" : ""}`}
          onClick={handleToggleLogout}
          aria-label="Logout"
          aria-expanded={isLogoutOpen}
          title="Logout"
        >
          <LogOut size={24} />
        </button>

        {isLogoutOpen && (
          <div className="topbarLogoutPanel">
            <h4 className="topbarLogoutTitle">Logout</h4>
            <p className="topbarLogoutText">Do you want to logout from Pennywise?</p>

            <div className="topbarLogoutActions">
              <button
                type="button"
                className="topbarLogoutCancel"
                onClick={() => setIsLogoutOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="topbarLogoutConfirm"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function AppLayout() {
  const location = useLocation();
  const storedUser = getStoredUser();
  const userId = storedUser?.id ?? storedUser?.user_id ?? null;
  const [isCollapsed, setIsCollapsed] = useState(false);
  const isMobile = useIsMobile();
  const [notifications, setNotifications] = useState(readStoredNotifications);
  const [notificationHistory, setNotificationHistory] = useState(readStoredNotificationHistory);
  const [clearedNotificationIds, setClearedNotificationIds] = useState(
    readStoredClearedNotificationIds
  );
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(
    readStoredDismissedNotificationIds
  );
  const notificationHistoryRef = useRef(notificationHistory);
  const clearedNotificationIdsRef = useRef(clearedNotificationIds);
  const dismissedNotificationIdsRef = useRef(dismissedNotificationIds);

  // Identify auth routes to remove sidebar and margins
  const isAuthRoute = ["/login", "/signup", "/forgot-password"].includes(location.pathname);

  // Define sidebar width to match your CSS exactly
  const effectiveCollapsed = isMobile ? true : isCollapsed;
  const sidebarWidth = effectiveCollapsed ? "70px" : "260px";

  const refreshNotifications = useCallback(async () => {
    if (!userId) {
      setNotifications([]);
      setNotificationHistory([]);
      setClearedNotificationIds([]);
      notificationHistoryRef.current = [];
      clearedNotificationIdsRef.current = [];
      return [];
    }

    try {
      const response = await fetch(`${API_BASE_URL}/alerts/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          user_id: userId
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load notifications.");
      }

      const nextNotifications = mapTriggeredAlertsToNotifications(data);
      const nextClearedNotificationIds = keepClearedIdsForActiveNotifications(
        clearedNotificationIdsRef.current,
        nextNotifications
      );
      clearedNotificationIdsRef.current = nextClearedNotificationIds;
      setClearedNotificationIds(nextClearedNotificationIds);
      const visibleNotifications = filterNotificationsByIds(
        nextNotifications,
        nextClearedNotificationIds
      );
      const mergedHistory = mergeNotificationHistory(
        filterNotificationsByIds(notificationHistoryRef.current, nextClearedNotificationIds),
        visibleNotifications
      );
      notificationHistoryRef.current = mergedHistory;
      setNotificationHistory(mergedHistory);

      const historyById = new Map(
        mergedHistory.map((notification) => [
          normalizeNotificationId(notification.id),
          notification
        ])
      );
      const enrichedNotifications = visibleNotifications.map((notification) => ({
        ...notification,
        triggeredAt: historyById.get(normalizeNotificationId(notification.id))?.triggeredAt
      }));
      const nextNotificationIds = enrichedNotifications.map((notification) => notification.id);
      const nextDismissedNotificationIds = dismissedNotificationIdsRef.current.filter((id) =>
        nextNotificationIds.includes(id)
      );

      setNotifications(enrichedNotifications);
      dismissedNotificationIdsRef.current = nextDismissedNotificationIds;
      setDismissedNotificationIds(nextDismissedNotificationIds);

      return enrichedNotifications;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  }, [userId]);

  const handleSpendingChange = useCallback(
    (currentSpending) => {
      window.localStorage.setItem(CURRENT_SPENDING_KEY, String(currentSpending));
      refreshNotifications();
    },
    [refreshNotifications]
  );

  const dismissNotification = useCallback((notificationId) => {
    const normalizedNotificationId = normalizeNotificationId(notificationId);

    setDismissedNotificationIds((previousDismissedIds) =>
      {
        const nextDismissedNotificationIds = previousDismissedIds.includes(normalizedNotificationId)
          ? previousDismissedIds
          : [...previousDismissedIds, normalizedNotificationId];

        dismissedNotificationIdsRef.current = nextDismissedNotificationIds;
        window.localStorage.setItem(
          DISMISSED_ALERT_STORAGE_KEY,
          JSON.stringify(nextDismissedNotificationIds)
        );

        return nextDismissedNotificationIds;
      }
    );
  }, []);

  useEffect(() => {
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    window.localStorage.setItem(
      ALERT_HISTORY_STORAGE_KEY,
      JSON.stringify(notificationHistory)
    );
    notificationHistoryRef.current = notificationHistory;
  }, [notificationHistory]);

  useEffect(() => {
    clearedNotificationIdsRef.current = clearedNotificationIds;
    window.localStorage.setItem(
      CLEARED_ALERT_STORAGE_KEY,
      JSON.stringify(clearedNotificationIds)
    );
  }, [clearedNotificationIds]);

  useEffect(() => {
    dismissedNotificationIdsRef.current = dismissedNotificationIds;
    window.localStorage.setItem(
      DISMISSED_ALERT_STORAGE_KEY,
      JSON.stringify(dismissedNotificationIds)
    );
  }, [dismissedNotificationIds]);

  useEffect(() => {
    if (!isAuthRoute) {
      refreshNotifications();
    }
  }, [isAuthRoute, location.pathname, refreshNotifications]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return undefined;
    }

    const handleAlertsUpdated = () => {
      refreshNotifications();
    };

    window.addEventListener(ALERTS_UPDATED_EVENT, handleAlertsUpdated);

    return () => {
      window.removeEventListener(ALERTS_UPDATED_EVENT, handleAlertsUpdated);
    };
  }, [refreshNotifications]);

  const clearNotificationHistory = useCallback(() => {
    const nextClearedNotificationIds = keepClearedIdsForActiveNotifications(
      [...clearedNotificationIdsRef.current, ...notifications.map((notification) => notification.id)],
      notifications
    );

    clearedNotificationIdsRef.current = nextClearedNotificationIds;
    setClearedNotificationIds(nextClearedNotificationIds);
    setNotifications([]);
    notificationHistoryRef.current = [];
    setNotificationHistory([]);
    window.localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify([]));
    window.localStorage.setItem(ALERT_HISTORY_STORAGE_KEY, JSON.stringify([]));
  }, [notifications]);

  const visibleNotifications = filterNotificationsByIds(notifications, clearedNotificationIds);
  const visibleNotificationHistory = filterNotificationsByIds(
    notificationHistory,
    clearedNotificationIds
  );
  const popupNotifications = visibleNotifications.filter(
    (notification) => !dismissedNotificationIds.includes(notification.id)
  );

  return (
    <div style={{ display: "flex", backgroundColor: "#050a15", minHeight: "100vh", width: "100%" }}>
      {/* Sidebar only shows on app pages */}
      {!isAuthRoute && (
        <Sidebar isCollapsed={effectiveCollapsed} setIsCollapsed={setIsCollapsed} />
      )}

      <div 
        className="page-content" 
        style={{ 
          flex: 1,
          marginLeft: isAuthRoute ? "0px" : sidebarWidth,
          transition: "margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          width: isAuthRoute ? "100%" : `calc(100% - ${sidebarWidth})`,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box"
        }}
      >
        {!isAuthRoute && (
          <TopBar
            notifications={visibleNotifications}
            notificationHistory={visibleNotificationHistory}
            refreshNotifications={refreshNotifications}
            clearNotificationHistory={clearNotificationHistory}
          />
        )}

        <div className="route-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/terms" element={<TermsOfService />} />
            <Route path="/privacy" element={<PrivacyPolicy />} />
            <Route
              path="/"
              element={
                <PrivateRoute>
                  <Records
                    notifications={popupNotifications}
                    dismissNotification={dismissNotification}
                    onSpendingChange={handleSpendingChange}
                  />
                </PrivateRoute>
              }
            />
            <Route path="/transactions" element={<PrivateRoute><Transactions /></PrivateRoute>} />
            <Route path="/category" element={<PrivateRoute><Category /></PrivateRoute>} />
            <Route path="/budget" element={<PrivateRoute><Budget /></PrivateRoute>} />
            <Route path="/analytics" element={<PrivateRoute><Analytics /></PrivateRoute>} />
            <Route path="/alerts" element={<PrivateRoute><Alerts /></PrivateRoute>} />
            <Route path="/profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <HashRouter>
      <AppLayout />
    </HashRouter>
  );
}

export default App;

