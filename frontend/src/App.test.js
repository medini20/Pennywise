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
  mapTriggeredAlertsToNotifications
} from "./App";

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
});
