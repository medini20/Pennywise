import React, { useCallback, useEffect, useRef, useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate, useNavigate } from "react-router-dom";
import { Bell, CircleUserRound, LogOut } from "lucide-react";
import { clearStoredSession, getStoredUser, hasValidSession } from "./services/authStorage";
import "./App.css";

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

const API_BASE_URL = "http://localhost:5001";
const CURRENT_SPENDING_KEY = "currentSpending";
const ALERT_STORAGE_KEY = "pennywise-triggered-alerts";
const DISMISSED_ALERT_STORAGE_KEY = "pennywise-dismissed-triggered-alerts";

const formatCurrency = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;
const normalizeNotificationId = (value) => String(value ?? "");

const mapTriggeredAlertsToNotifications = (summary) => {
  const triggeredAlerts = Array.isArray(summary?.triggered_alerts)
    ? summary.triggered_alerts
    : [];

  return triggeredAlerts.map((alert) => ({
    id: normalizeNotificationId(alert.id),
    percentage: alert.percentage,
    message:
      alert.scope === "category"
        ? `${alert.budget_name} reached ${alert.percentage}% of its budget`
        : `Spending reached ${alert.percentage}% of your monthly budget`,
    detail:
      alert.scope === "category"
        ? `${formatCurrency(alert.current_spending)} spent out of ${formatCurrency(alert.budget_amount)}`
        : `${formatCurrency(summary.current_spending)} spent out of ${formatCurrency(summary.budget)}`
  }));
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
          ...notification,
          id: normalizeNotificationId(notification.id)
        }))
      : [];
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

    return Array.isArray(parsedValue)
      ? parsedValue
          .map((value) => normalizeNotificationId(value))
          .filter((value) => value.length > 0)
      : [];
  } catch (error) {
    return [];
  }
};

const PrivateRoute = ({ children }) => {
  const isLoggedIn = hasValidSession();

  return isLoggedIn ? children : <Navigate to="/login" />;
};

function TopBar({ notifications, refreshNotifications }) {
  const navigate = useNavigate();
  const storedUser = getStoredUser();
  const profileLabel = storedUser?.name || storedUser?.username || storedUser?.email || "Profile";
  const [isNotificationOpen, setIsNotificationOpen] = useState(false);
  const [isLogoutOpen, setIsLogoutOpen] = useState(false);
  const [isRefreshingNotifications, setIsRefreshingNotifications] = useState(false);
  const notificationPanelRef = useRef(null);
  const logoutPanelRef = useRef(null);

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
            </div>

            {isRefreshingNotifications ? (
              <p className="topbarNotificationEmpty">Loading notifications...</p>
            ) : notifications.length === 0 ? (
              <p className="topbarNotificationEmpty">
                You will see triggered budget alerts here whenever spending crosses one of your thresholds.
              </p>
            ) : (
              <div className="topbarNotificationList">
                {notifications.map((notification) => (
                  <div className="topbarNotificationItem" key={notification.id}>
                    <span className="topbarNotificationMarker" />
                    <div className="topbarNotificationCopy">
                      <strong>{notification.message}</strong>
                      <span>{notification.detail}</span>
                    </div>
                  </div>
                ))}
              </div>
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
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [notifications, setNotifications] = useState(readStoredNotifications);
  const [dismissedNotificationIds, setDismissedNotificationIds] = useState(
    readStoredDismissedNotificationIds
  );
  const dismissedNotificationIdsRef = useRef(dismissedNotificationIds);

  // Identify auth routes to remove sidebar and margins
  const isAuthRoute = ["/login", "/signup", "/forgot-password"].includes(location.pathname);

  // Define sidebar width to match your CSS exactly
  const sidebarWidth = isCollapsed ? "70px" : "260px";

  const refreshNotifications = useCallback(async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/alerts/check`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({})
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Unable to load notifications.");
      }

      const nextNotifications = mapTriggeredAlertsToNotifications(data);
      const nextNotificationIds = nextNotifications.map((notification) => notification.id);
      const nextDismissedNotificationIds = dismissedNotificationIdsRef.current.filter((id) =>
        nextNotificationIds.includes(id)
      );

      setNotifications(nextNotifications);
      dismissedNotificationIdsRef.current = nextDismissedNotificationIds;
      setDismissedNotificationIds(nextDismissedNotificationIds);

      return nextNotifications;
    } catch (error) {
      console.error(error.message);
      return [];
    }
  }, []);

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
  }, [isAuthRoute, refreshNotifications]);

  const popupNotifications = notifications.filter(
    (notification) => !dismissedNotificationIds.includes(notification.id)
  );

  return (
    <div style={{ display: "flex", backgroundColor: "#050a15", minHeight: "100vh", width: "100%" }}>
      {/* Sidebar only shows on app pages */}
      {!isAuthRoute && (
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      )}

      <div 
        className="page-content" 
        style={{ 
          flex: 1, 
          // CRITICAL: 0px for login, sidebarWidth for app
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
            notifications={notifications}
            refreshNotifications={refreshNotifications}
          />
        )}

        <div className="route-content">
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
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
          </Routes>
        </div>
      </div>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AppLayout />
    </BrowserRouter>
  );
}

export default App;
