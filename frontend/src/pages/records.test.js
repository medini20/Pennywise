import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Records from "./records";

const API_BASE_URL = "http://localhost:5001";
const USER_ID = 42;
const FOOD_ICON = "\uD83C\uDF7D\uFE0F";
const SALARY_ICON = "\uD83D\uDCB5";
const TRAVEL_ICON = "\u2708\uFE0F";

const createJsonResponse = (data, ok = true, status = 200) =>
  Promise.resolve({
    ok,
    status,
    json: () => Promise.resolve(data)
  });

const formatDateValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
};

const getCurrentMonthDate = (day = 15) => {
  const today = new Date();
  return formatDateValue(new Date(today.getFullYear(), today.getMonth(), day));
};

const getAlternateMonthIndex = () => {
  const today = new Date();
  return today.getMonth() === 11 ? 10 : today.getMonth() + 1;
};

const getAlternateMonthDate = (day = 15) => {
  const today = new Date();
  return formatDateValue(new Date(today.getFullYear(), getAlternateMonthIndex(), day));
};

const buildTransaction = ({
  transactionId = 1,
  transactionDate = getCurrentMonthDate(),
  createdAt = `${transactionDate}T10:30:00.000Z`,
  categoryName = "Food",
  categoryIcon = FOOD_ICON,
  description = "Lunch",
  amount = 250,
  type = "expense",
  recurringPaymentId = null
} = {}) => ({
  transaction_id: transactionId,
  transaction_date: transactionDate,
  created_at: createdAt,
  recurring_payment_id: recurringPaymentId,
  category_name: categoryName,
  category_icon: categoryIcon,
  description,
  amount,
  type
});

describe("Records transaction flow", () => {
  let fetchMock;
  let alertSpy;

  const transactionsUrl = `${API_BASE_URL}/api/transactions?user_id=${USER_ID}`;
  const categoriesUrl = `${API_BASE_URL}/api/categories?user_id=${USER_ID}`;
  const addCategoryUrl = `${API_BASE_URL}/api/categories`;
  const addTransactionUrl = `${API_BASE_URL}/api/transactions/add`;

  const mockRecordsFetch = ({
    transactions = [],
    categories = [],
    addCategoryResponse = {
      name: "Travel",
      icon: TRAVEL_ICON
    },
    addTransactionResponse = {
      transaction_id: 555,
      created_at: `${getCurrentMonthDate()}T12:00:00.000Z`
    },
    updateTransactionResponse = {
      message: "Transaction updated successfully."
    },
    deleteTransactionResponse = {
      message: "Transaction deleted successfully."
    }
  } = {}) => {
    fetchMock.mockImplementation((url, options = {}) => {
      const method = options.method || "GET";

      if (url === transactionsUrl && method === "GET") {
        return createJsonResponse(transactions);
      }

      if (url === categoriesUrl && method === "GET") {
        return createJsonResponse(categories);
      }

      if (url === addCategoryUrl && method === "POST") {
        return createJsonResponse(addCategoryResponse);
      }

      if (url === addTransactionUrl && method === "POST") {
        return createJsonResponse(addTransactionResponse);
      }

      if (url.startsWith(`${API_BASE_URL}/api/transactions/`) && method === "PUT") {
        return createJsonResponse(updateTransactionResponse);
      }

      if (url.startsWith(`${API_BASE_URL}/api/transactions/`) && method === "DELETE") {
        return createJsonResponse(deleteTransactionResponse);
      }

      return createJsonResponse({});
    });
  };

  const renderRecords = (config = {}) => {
    mockRecordsFetch(config);
    return render(<Records />);
  };

  const openAddTransactionModal = async (user) => {
    await user.click(screen.getByRole("button", { name: /\+ add transaction/i }));
    await waitFor(() => expect(findRequest(categoriesUrl, "GET")).toBeTruthy());
  };

  const openAddCategoryModal = async (user) => {
    await openAddTransactionModal(user);
    await user.click(await screen.findByText(/\+ add categories/i));
  };

  const openTransactionActions = async (user, description) => {
    const row = screen.getByText(description).closest(".transaction");

    expect(row).not.toBeNull();

    await user.click(row);

    return row;
  };

  const findRequest = (matcher, method) =>
    fetchMock.mock.calls.find(([url, options = {}]) => {
      const currentMethod = options.method || "GET";
      const urlMatches =
        typeof matcher === "string" ? url === matcher : matcher(url, options);

      return urlMatches && currentMethod === method;
    });

  beforeEach(() => {
    localStorage.clear();
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: USER_ID,
        name: "Test User"
      })
    );

    fetchMock = jest.fn();
    global.fetch = fetchMock;
    alertSpy = jest.spyOn(window, "alert").mockImplementation(() => {});
  });

  afterEach(() => {
    alertSpy.mockRestore();
    jest.clearAllMocks();
  });

  test("displays current month transactions and hides transactions from other months", async () => {
    renderRecords({
      transactions: [
        buildTransaction({
          transactionId: 1,
          description: "Lunch"
        }),
        buildTransaction({
          transactionId: 2,
          transactionDate: getAlternateMonthDate(),
          createdAt: `${getAlternateMonthDate()}T08:00:00.000Z`,
          categoryName: "Salary",
          categoryIcon: SALARY_ICON,
          description: "Old salary",
          amount: 5000,
          type: "income"
        })
      ]
    });

    expect(await screen.findByText("Lunch")).toBeInTheDocument();
    expect(screen.queryByText("Old salary")).not.toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledWith(transactionsUrl);
  });

  test("filters transactions when the income, expense, and balance cards are clicked", async () => {
    const user = userEvent;

    renderRecords({
      transactions: [
        buildTransaction({
          transactionId: 3,
          description: "Groceries",
          amount: 400
        }),
        buildTransaction({
          transactionId: 4,
          categoryName: "Salary",
          categoryIcon: SALARY_ICON,
          description: "Paycheck",
          amount: 12000,
          type: "income"
        })
      ]
    });

    expect(await screen.findByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Paycheck")).toBeInTheDocument();

    await user.click(screen.getByText("Income"));

    expect(screen.getByText("Paycheck")).toBeInTheDocument();
    expect(screen.queryByText("Groceries")).not.toBeInTheDocument();

    await user.click(screen.getByText("Expenses"));

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.queryByText("Paycheck")).not.toBeInTheDocument();

    await user.click(screen.getByText("Balance"));

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Paycheck")).toBeInTheDocument();
  });

  test("filters transactions when a different month is selected from the dropdown", async () => {
    const user = userEvent;
    const alternateMonthDate = getAlternateMonthDate();

    renderRecords({
      transactions: [
        buildTransaction({
          transactionId: 5,
          description: "Monthly groceries"
        }),
        buildTransaction({
          transactionId: 6,
          transactionDate: alternateMonthDate,
          createdAt: `${alternateMonthDate}T09:00:00.000Z`,
          description: "Trip booking",
          amount: 3200
        })
      ]
    });

    expect(await screen.findByText("Monthly groceries")).toBeInTheDocument();
    expect(screen.queryByText("Trip booking")).not.toBeInTheDocument();

    await user.selectOptions(
      screen.getByRole("combobox", { name: /month/i }),
      String(getAlternateMonthIndex())
    );

    expect(await screen.findByText("Trip booking")).toBeInTheDocument();
    expect(screen.queryByText("Monthly groceries")).not.toBeInTheDocument();
  });

  test("opens the add transaction modal when the add transaction button is clicked", async () => {
    const user = userEvent;

    renderRecords();

    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();

    await openAddTransactionModal(user);

    expect(await screen.findByRole("heading", { name: "Add" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("0")).toBeInTheDocument();
    expect(screen.getByText(/\+ add categories/i)).toBeInTheDocument();
  });

  test("opens the nested add category modal from the transaction modal", async () => {
    const user = userEvent;

    renderRecords();

    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();

    await openAddCategoryModal(user);

    expect(
      await screen.findByRole("heading", { name: /add category/i })
    ).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/enter category name/i)).toBeInTheDocument();
  });

  test("adds a new category successfully from the nested add category modal", async () => {
    const user = userEvent;

    renderRecords();

    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();

    await openAddCategoryModal(user);

    await user.type(screen.getByPlaceholderText(/enter category name/i), "Travel");
    await user.click(screen.getByText(TRAVEL_ICON));
    await user.click(screen.getByRole("button", { name: /add category/i }));

    expect(await screen.findByText("Travel")).toBeInTheDocument();

    const categoryRequest = findRequest(addCategoryUrl, "POST");

    expect(categoryRequest).toBeTruthy();
    expect(JSON.parse(categoryRequest[1].body)).toEqual({
      user_id: USER_ID,
      name: "Travel",
      type: "expense",
      icon: TRAVEL_ICON
    });

    await waitFor(() =>
      expect(screen.queryByPlaceholderText(/enter category name/i)).not.toBeInTheDocument()
    );
  });

  test("saves a new transaction successfully and renders it on the records page", async () => {
    const user = userEvent;
    const today = formatDateValue(new Date());

    renderRecords({
      addTransactionResponse: {
        transaction_id: 555,
        created_at: `${today}T12:00:00.000Z`
      }
    });

    expect(await screen.findByText(/no transactions yet/i)).toBeInTheDocument();

    await openAddTransactionModal(user);
    await user.click(screen.getByText("Food"));
    await user.type(screen.getByPlaceholderText("0"), "250");
    await user.type(screen.getByPlaceholderText(/enter a note/i), "Flight ticket");
    await user.click(screen.getByRole("button", { name: "OK" }));

    expect(await screen.findByText("Flight ticket")).toBeInTheDocument();

    const transactionRequest = findRequest(addTransactionUrl, "POST");

    expect(transactionRequest).toBeTruthy();
    expect(JSON.parse(transactionRequest[1].body)).toEqual({
      user_id: USER_ID,
      amount: 250,
      type: "expense",
      category: "Food",
      categoryIcon: FOOD_ICON,
      description: "Flight ticket",
      transaction_date: today,
      recurring: false,
      recurringFrequency: "Monthly"
    });
  });

  test("opens the edit flow and updates an existing transaction", async () => {
    const user = userEvent;
    const editableTransaction = buildTransaction({
      transactionId: 7,
      description: "Lunch",
      amount: 250
    });

    renderRecords({
      transactions: [editableTransaction]
    });

    expect(await screen.findByText("Lunch")).toBeInTheDocument();

    const row = await openTransactionActions(user, "Lunch");

    expect(within(row).getByTitle("Edit")).toBeInTheDocument();
    expect(within(row).getByTitle("Delete")).toBeInTheDocument();

    await user.click(within(row).getByTitle("Edit"));

    expect(await screen.findByRole("heading", { name: "Edit" })).toBeInTheDocument();

    const amountInput = screen.getByPlaceholderText("0");
    const noteInput = screen.getByPlaceholderText(/enter a note/i);

    await user.clear(amountInput);
    await user.type(amountInput, "300");
    await user.clear(noteInput);
    await user.type(noteInput, "Dinner");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Dinner")).toBeInTheDocument();
    expect(screen.queryByText("Lunch")).not.toBeInTheDocument();

    const updateRequest = findRequest(
      (url) => url === `${API_BASE_URL}/api/transactions/7`,
      "PUT"
    );

    expect(updateRequest).toBeTruthy();
    expect(JSON.parse(updateRequest[1].body)).toEqual({
      user_id: USER_ID,
      amount: 300,
      type: "expense",
      category: "Food",
      categoryIcon: FOOD_ICON,
      description: "Dinner",
      transaction_date: getCurrentMonthDate()
    });
  });

  test("opens the delete confirmation and removes a transaction when confirmed", async () => {
    const user = userEvent;

    renderRecords({
      transactions: [
        buildTransaction({
          transactionId: 8,
          description: "Snacks",
          amount: 120
        })
      ]
    });

    expect(await screen.findByText("Snacks")).toBeInTheDocument();

    const row = await openTransactionActions(user, "Snacks");

    await user.click(within(row).getByTitle("Delete"));

    expect(
      await screen.findByText(/do you want to delete this transaction\?/i)
    ).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Yes" }));

    await waitFor(() =>
      expect(screen.queryByText("Snacks")).not.toBeInTheDocument()
    );

    const deleteRequest = findRequest(
      (url) => url === `${API_BASE_URL}/api/transactions/8?user_id=${USER_ID}`,
      "DELETE"
    );

    expect(deleteRequest).toBeTruthy();
  });
});
