import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";

jest.mock(
  "react-router-dom",
  () => ({
    BrowserRouter: ({ children }) => children,
    Routes: ({ children }) => children,
    Route: () => null,
    useLocation: () => ({ pathname: "/" }),
    Navigate: () => null,
    useNavigate: () => jest.fn(),
    Link: ({ children }) => children
  }),
  { virtual: true }
);

import {
  buildNotificationInstanceId,
  filterNotificationsByIds,
  groupNotificationHistoryByDate,
  keepClearedIdsForActiveNotifications,
  mapTriggeredAlertsToNotifications,
  mergeNotificationHistory,
  TopBar
} from "./App";

const INR_SYMBOL = "\u20B9";

describe("alert notification retriggering", () => {
  test("creates a new notification instance when overall spending changes", () => {
    const alert = {
      id: 7,
      percentage: 80,
      scope: "overall",
      current_spending: 800
    };

    const firstId = buildNotificationInstanceId(alert, {
      current_spending: 800
    });
    const secondId = buildNotificationInstanceId(
      {
        ...alert,
        current_spending: 900
      },
      {
        current_spending: 900
      }
    );

    expect(firstId).not.toBe(secondId);
  });

  test("creates a new notification instance when category spending changes", () => {
    const firstId = buildNotificationInstanceId(
      {
        id: 5,
        percentage: 60,
        scope: "category",
        current_spending: 300
      },
      {}
    );
    const secondId = buildNotificationInstanceId(
      {
        id: 5,
        percentage: 60,
        scope: "category",
        current_spending: 420
      },
      {}
    );

    expect(firstId).not.toBe(secondId);
  });

  test("maps triggered alerts into readable notifications", () => {
    const notifications = mapTriggeredAlertsToNotifications({
      budget: 1000,
      current_spending: 800,
      triggered_alerts: [
        {
          id: 7,
          percentage: 80,
          scope: "overall",
          current_spending: 800
        }
      ]
    });

    expect(notifications).toHaveLength(1);
    expect(notifications[0].message).toMatch(/spending reached 80%/i);
    expect(notifications[0].detail).toMatch(/spent out of/i);
  });

  test("stores newly triggered alerts in history without duplicating the same notification instance", () => {
    const now = new Date("2026-04-03T10:15:00.000Z");
    const existingHistory = [
      {
        id: "7:800.00",
        message: "Spending reached 80% of your monthly budget",
        detail: `${INR_SYMBOL}800 spent out of ${INR_SYMBOL}1,000`,
        triggeredAt: "2026-04-03T09:00:00.000Z"
      }
    ];
    const nextNotifications = [
      {
        id: "7:800.00",
        message: "Spending reached 80% of your monthly budget",
        detail: `${INR_SYMBOL}800 spent out of ${INR_SYMBOL}1,000`
      },
      {
        id: "8:600.00",
        message: "Food reached 60% of its budget",
        detail: `${INR_SYMBOL}600 spent out of ${INR_SYMBOL}1,000`
      }
    ];

    const history = mergeNotificationHistory(existingHistory, nextNotifications, now);

    expect(history).toHaveLength(2);
    expect(history[0]).toMatchObject({
      id: "8:600.00",
      triggeredAt: "2026-04-03T10:15:00.000Z"
    });
    expect(history[1]).toMatchObject({
      id: "7:800.00",
      triggeredAt: "2026-04-03T09:00:00.000Z"
    });
  });

  test("groups notification history day-wise", () => {
    const groups = groupNotificationHistoryByDate(
      [
        {
          id: "1",
          message: "Latest",
          detail: "detail",
          triggeredAt: "2026-04-03T11:30:00.000Z"
        },
        {
          id: "2",
          message: "Yesterday",
          detail: "detail",
          triggeredAt: "2026-04-02T08:00:00.000Z"
        },
        {
          id: "3",
          message: "Older today",
          detail: "detail",
          triggeredAt: "2026-04-03T08:15:00.000Z"
        }
      ],
      new Date("2026-04-03T12:00:00.000Z")
    );

    expect(groups).toHaveLength(2);
    expect(groups[0].label).toBe("Today");
    expect(groups[0].items.map((item) => item.id)).toEqual(["1", "3"]);
    expect(groups[1].label).toBe("Yesterday");
    expect(groups[1].items.map((item) => item.id)).toEqual(["2"]);
  });

  test("filters cleared notifications out of the topbar state", () => {
    const visibleNotifications = filterNotificationsByIds(
      [
        { id: "7:800.00", message: "Active" },
        { id: "8:600.00", message: "History" }
      ],
      ["8:600.00"]
    );

    expect(visibleNotifications).toEqual([{ id: "7:800.00", message: "Active" }]);
  });

  test("keeps cleared notification ids only while the same alert instance stays active", () => {
    const retainedIds = keepClearedIdsForActiveNotifications(
      ["7:800.00", "8:600.00"],
      [{ id: "8:600.00" }, { id: "9:400.00" }]
    );

    expect(retainedIds).toEqual(["8:600.00"]);
  });

  test("shows active alerts, day-wise history, and a clear notifications action in the topbar panel", async () => {
    const refreshNotifications = jest.fn().mockResolvedValue([]);
    const clearNotificationHistory = jest.fn();

    render(
      <TopBar
        notifications={[
          {
            id: "7:800.00",
            message: "Spending reached 80% of your monthly budget",
            detail: `${INR_SYMBOL}800 spent out of ${INR_SYMBOL}1,000`,
            triggeredAt: "2026-04-03T10:15:00.000Z"
          }
        ]}
        notificationHistory={[
          {
            id: "7:800.00",
            message: "Spending reached 80% of your monthly budget",
            detail: `${INR_SYMBOL}800 spent out of ${INR_SYMBOL}1,000`,
            triggeredAt: "2026-04-03T10:15:00.000Z"
          },
          {
            id: "8:600.00",
            message: "Food reached 60% of its budget",
            detail: `${INR_SYMBOL}600 spent out of ${INR_SYMBOL}1,000`,
            triggeredAt: "2026-04-02T08:00:00.000Z"
          }
        ]}
        refreshNotifications={refreshNotifications}
        clearNotificationHistory={clearNotificationHistory}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /open notifications/i }));

    expect(await screen.findByText(/active right now/i)).toBeInTheDocument();
    expect(screen.getByText(/alert history/i)).toBeInTheDocument();
    expect(screen.getByText(/2 Apr 2026/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /clear notifications/i }));
    expect(clearNotificationHistory).toHaveBeenCalledTimes(1);
  });
});
