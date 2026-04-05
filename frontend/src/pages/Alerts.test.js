import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import AlertsView from "./Alerts";

jest.mock("../components/AestheticDatePicker", () => ({
  __esModule: true,
  default: function MockAestheticDatePicker({ value, onChange }) {
    return (
      <input
        type="date"
        value={value || ""}
        onChange={(event) => onChange(event.target.value)}
      />
    );
  }
}));

const createJsonResponse = (data, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: async () => data
  });

const createFetchMock = ({
  budgetSaveError,
  addAlertError,
  deleteAlertError,
  ...overrides
} = {}) => {
  const state = {
    budget: 5000,
    budget_id: 12,
    start_date: "2026-04-01",
    end_date: "2026-04-30",
    current_spending: 1200,
    alerts: [],
    available_category_budgets: [
      {
        budget_id: 101,
        name: "Food",
        amount: 2000,
        icon: "F",
        color: "#06b6d4",
        start_date: "2026-04-01",
        end_date: "2026-04-30"
      },
      {
        budget_id: 202,
        name: "Transport",
        amount: 1500,
        icon: "T",
        color: "#8b5cf6",
        start_date: "2026-04-01",
        end_date: "2026-04-30"
      }
    ],
    ...overrides
  };

  const fetchMock = jest.fn(async (url, options = {}) => {
    const method = options.method || "GET";
    fetchMock.requests.push({ url, options: { ...options, method } });

    if (url.includes("/alerts/data")) {
      return createJsonResponse({
        budget: state.budget,
        budget_id: state.budget_id,
        start_date: state.start_date,
        end_date: state.end_date,
        current_spending: state.current_spending,
        alerts: state.alerts,
        available_category_budgets: state.available_category_budgets
      });
    }

    if (url.includes("/budget/list")) {
      return createJsonResponse(state.available_category_budgets);
    }

    if (url.includes("/alerts/budget") && method === "POST") {
      if (budgetSaveError) {
        return createJsonResponse({ error: budgetSaveError }, false, 400);
      }

      const body = JSON.parse(options.body);

      state.budget = body.amount;
      state.budget_id = body.budget_id ?? state.budget_id;
      state.start_date = body.start_date;
      state.end_date = body.end_date;

      return createJsonResponse({
        message: "Budget saved successfully."
      });
    }

    if (url.endsWith("/alerts") && method === "POST") {
      if (addAlertError) {
        return createJsonResponse({ error: addAlertError }, false, 400);
      }

      const body = JSON.parse(options.body);
      const selectedBudget = state.available_category_budgets.find(
        (budgetItem) => String(budgetItem.budget_id) === String(body.budget_id)
      );

      state.alerts = [
        ...state.alerts,
        {
          id: state.alerts.length + 1,
          percentage: body.threshold_percent,
          threshold_amount: selectedBudget
            ? selectedBudget.amount * (body.threshold_percent / 100)
            : state.budget * (body.threshold_percent / 100),
          scope: body.scope,
          budget_id: body.budget_id,
          budget_name: selectedBudget?.name,
          budget_icon: selectedBudget?.icon,
          budget_color: selectedBudget?.color,
          budget_amount: selectedBudget?.amount,
          start_date: selectedBudget?.start_date ?? state.start_date,
          end_date: selectedBudget?.end_date ?? state.end_date,
          triggered: false
        }
      ];

      return createJsonResponse({
        message: "Alert added successfully."
      });
    }

    if (url.includes("/alerts/") && method === "DELETE") {
      if (deleteAlertError) {
        return createJsonResponse({ error: deleteAlertError }, false, 400);
      }

      const alertIdMatch = url.match(/\/alerts\/(\d+)/);
      const alertId = Number(alertIdMatch?.[1]);

      state.alerts = state.alerts.filter((alert) => alert.id !== alertId);

      return createJsonResponse({
        message: "Alert deleted successfully."
      });
    }

    return createJsonResponse(
      { error: `Unhandled request: ${method} ${url}` },
      false,
      404
    );
  });

  fetchMock.requests = [];
  return fetchMock;
};

const findRequest = (fetchMock, path, method) =>
  fetchMock.requests.find(
    (request) => request.url.includes(path) && request.options.method === method
  );

describe("AlertsView", () => {
  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem("user", JSON.stringify({ id: 7, name: "Test User" }));
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  it("fills and submits the monthly budget form", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /edit budget/i }));
    fireEvent.change(screen.getByLabelText(/monthly budget/i), {
      target: { value: "8000" }
    });
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "2026-04-05" }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "2026-05-05" }
    });
    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    expect(await screen.findByText(/budget saved successfully/i)).toBeInTheDocument();

    const saveBudgetRequest = findRequest(fetchMock, "/alerts/budget", "POST");

    expect(saveBudgetRequest).toBeDefined();
    expect(JSON.parse(saveBudgetRequest.options.body)).toEqual({
      amount: 8000,
      user_id: 7,
      budget_id: 12,
      start_date: "2026-04-05",
      end_date: "2026-05-05"
    });
    expect(screen.getByText(/\u20b98,000/i)).toBeInTheDocument();
  });

  it("fills and submits a category-specific alert form", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /^add alert$/i }));
    expect(
      await screen.findByText(/get notified when your spending reaches/i)
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole("button", { name: /toggle category-specific alert/i })
    );
    fireEvent.click(screen.getByRole("button", { name: /food/i }));

    const percentageInput = screen.getByLabelText(/alert percentage/i);
    fireEvent.change(percentageInput, {
      target: { value: "75" }
    });
    fireEvent.keyDown(percentageInput, {
      key: "Enter",
      code: "Enter",
      charCode: 13
    });

    expect(await screen.findByText(/alert added successfully/i)).toBeInTheDocument();

    const addAlertRequest = findRequest(fetchMock, "/alerts", "POST");

    expect(addAlertRequest).toBeDefined();
    expect(JSON.parse(addAlertRequest.options.body)).toEqual({
      threshold_percent: 75,
      scope: "category",
      user_id: 7,
      budget_id: 101
    });
    expect(screen.getByText(/75% alert/i)).toBeInTheDocument();
    expect(
      screen.getByText(/alert when food spending reaches \u20b91,500/i)
    ).toBeInTheDocument();
  });

  it("shows a validation error when alert percentage is empty", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /^add alert$/i }));
    fireEvent.click(screen.getAllByRole("button", { name: /^add alert$/i })[1]);

    expect(await screen.findByText(/please enter a valid number/i)).toBeInTheDocument();
    expect(findRequest(fetchMock, "/alerts", "POST")).toBeUndefined();
  });

  it("shows a validation error when budget dates are missing", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /edit budget/i }));
    fireEvent.change(screen.getByLabelText(/start date/i), {
      target: { value: "" }
    });
    fireEvent.change(screen.getByLabelText(/end date/i), {
      target: { value: "" }
    });
    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    expect(
      await screen.findByText(/please choose both a start date and an end date/i)
    ).toBeInTheDocument();
    expect(findRequest(fetchMock, "/alerts/budget", "POST")).toBeUndefined();
  });

  it("shows a validation error when the loaded budget range is inverted", async () => {
    const fetchMock = createFetchMock({
      start_date: "2026-05-10",
      end_date: "2026-05-01"
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /edit budget/i }));
    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    expect(
      await screen.findByText(/start date must be on or before end date/i)
    ).toBeInTheDocument();
    expect(findRequest(fetchMock, "/alerts/budget", "POST")).toBeUndefined();
  });

  it("shows the backend error when saving the budget fails", async () => {
    const fetchMock = createFetchMock({
      budgetSaveError: "Unable to save the budget on the server."
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /edit budget/i }));
    fireEvent.click(screen.getByRole("button", { name: /save budget/i }));

    expect(
      await screen.findByText(/unable to save the budget on the server/i)
    ).toBeInTheDocument();
  });

  it("shows validation errors for zero and over-100 alert percentages", async () => {
    const fetchMock = createFetchMock();
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /^add alert$/i }));

    const percentageInput = screen.getByLabelText(/alert percentage/i);

    fireEvent.change(percentageInput, {
      target: { value: "0" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^add alert$/i })[1]);
    expect(
      await screen.findByText(/please enter a value greater than 0/i)
    ).toBeInTheDocument();

    fireEvent.change(percentageInput, {
      target: { value: "101" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^add alert$/i })[1]);
    expect(
      await screen.findByText(/please enter a value less than or equal to 100/i)
    ).toBeInTheDocument();
    expect(findRequest(fetchMock, "/alerts", "POST")).toBeUndefined();
  });

  it("requires a real category selection before saving a category-specific alert", async () => {
    const fetchMock = createFetchMock({
      available_category_budgets: [
        {
          budget_id: "",
          name: "Food",
          amount: 2000,
          icon: "F",
          color: "#06b6d4",
          start_date: "2026-04-01",
          end_date: "2026-04-30"
        }
      ]
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /^add alert$/i }));
    fireEvent.click(
      screen.getByRole("button", { name: /toggle category-specific alert/i })
    );
    fireEvent.change(screen.getByLabelText(/alert percentage/i), {
      target: { value: "50" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^add alert$/i })[1]);

    expect(
      await screen.findByText(/please choose a budget category first/i)
    ).toBeInTheDocument();
    expect(findRequest(fetchMock, "/alerts", "POST")).toBeUndefined();
  });

  it("shows the backend error when adding an alert fails", async () => {
    const fetchMock = createFetchMock({
      addAlertError: "Unable to add alert from backend."
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    await screen.findByText(/no alert thresholds yet/i);

    fireEvent.click(screen.getByRole("button", { name: /^add alert$/i }));
    fireEvent.change(screen.getByLabelText(/alert percentage/i), {
      target: { value: "55" }
    });
    fireEvent.click(screen.getAllByRole("button", { name: /^add alert$/i })[1]);

    expect(
      await screen.findByText(/unable to add alert from backend/i)
    ).toBeInTheDocument();
  });

  it("shows a triggered symbol beside triggered overall and category alerts", async () => {
    const fetchMock = createFetchMock({
      alerts: [
        {
          id: 21,
          percentage: 90,
          scope: "overall",
          threshold_amount: 4500,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          triggered: true
        },
        {
          id: 22,
          percentage: 75,
          scope: "category",
          budget_id: 101,
          budget_name: "Food",
          budget_icon: "F",
          budget_color: "#06b6d4",
          budget_amount: 2000,
          threshold_amount: 1500,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          triggered: "1"
        }
      ]
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    expect(await screen.findByText(/90% alert/i)).toBeInTheDocument();
    expect(screen.getByText(/75% alert/i)).toBeInTheDocument();
    expect(screen.getAllByLabelText(/triggered alert/i)).toHaveLength(2);
  });

  it("deletes an existing alert successfully", async () => {
    const fetchMock = createFetchMock({
      alerts: [
        {
          id: 9,
          percentage: 60,
          scope: "overall",
          threshold_amount: 3000,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          triggered: false
        }
      ]
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    expect(await screen.findByText(/60% alert/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete 60% alert/i }));
    expect(await screen.findByText(/are you sure you want to delete the 60% alert/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm delete alert/i }));

    expect(await screen.findByText(/alert deleted successfully/i)).toBeInTheDocument();
    expect(screen.queryByText(/60% alert/i)).not.toBeInTheDocument();

    const deleteRequest = findRequest(fetchMock, "/alerts/9", "DELETE");
    expect(deleteRequest).toBeDefined();
  });

  it("shows the backend error when deleting an alert fails", async () => {
    const fetchMock = createFetchMock({
      deleteAlertError: "Unable to delete alert from backend.",
      alerts: [
        {
          id: 11,
          percentage: 90,
          scope: "overall",
          threshold_amount: 4500,
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          triggered: false
        }
      ]
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    expect(await screen.findByText(/90% alert/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete 90% alert/i }));
    expect(await screen.findByText(/are you sure you want to delete the 90% alert/i)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /confirm delete alert/i }));

    expect(
      await screen.findByText(/unable to delete alert from backend/i)
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /delete 90% alert/i })).toBeInTheDocument();
  });

  it("closes the delete popup without deleting when cancel is clicked", async () => {
    const fetchMock = createFetchMock({
      alerts: [
        {
          id: 12,
          percentage: 70,
          scope: "category",
          budget_name: "Food",
          threshold_amount: 1400,
          budget_amount: 2000,
          budget_icon: "F",
          start_date: "2026-04-01",
          end_date: "2026-04-30",
          triggered: false
        }
      ]
    });
    global.fetch = fetchMock;

    render(<AlertsView />);

    expect(await screen.findByText(/70% alert/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /delete 70% alert/i }));
    expect(
      await screen.findByText(/are you sure you want to delete the 70% food alert/i)
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /^cancel$/i }));

    expect(
      screen.queryByText(/are you sure you want to delete the 70% food alert/i)
    ).not.toBeInTheDocument();
    expect(findRequest(fetchMock, "/alerts/12", "DELETE")).toBeUndefined();
    expect(screen.getByText(/70% alert/i)).toBeInTheDocument();
  });
});
