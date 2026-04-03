import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import Profile from "./Profile";
import {
  clearStoredSession,
  getStoredToken,
  getStoredUser,
  setStoredToken,
  updateStoredUser
} from "../services/authStorage";

const mockNavigate = jest.fn();

jest.mock(
  "react-router-dom",
  () => ({
    useNavigate: () => mockNavigate
  }),
  { virtual: true }
);

jest.mock("react-webcam", () => () => <div data-testid="webcam" />);

jest.mock("../services/authStorage", () => ({
  clearStoredSession: jest.fn(),
  getStoredToken: jest.fn(),
  getStoredUser: jest.fn(),
  setStoredToken: jest.fn(),
  updateStoredUser: jest.fn()
}));

const createJsonResponse = (body, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: jest.fn().mockResolvedValue(body)
});

describe("Profile page", () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    jest.clearAllMocks();

    getStoredUser.mockReturnValue({
      id: 1,
      username: "Local User",
      email: "local@example.com"
    });
    getStoredToken.mockReturnValue("valid-token");
    global.fetch = jest.fn().mockResolvedValue(
      createJsonResponse({
        username: "Server User",
        email: "server@example.com"
      })
    );
  });

  afterAll(() => {
    global.fetch = originalFetch;
  });

  test("loads profile details from API", async () => {
    render(<Profile />);

    expect(global.fetch).toHaveBeenCalledWith(
      "http://localhost:5001/api/profile",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer valid-token"
        })
      })
    );

    expect(
      await screen.findByRole("heading", { name: "Server User" })
    ).toBeInTheDocument();
    expect(screen.getAllByText("server@example.com").length).toBeGreaterThan(0);

    await waitFor(() => {
      expect(updateStoredUser).toHaveBeenCalledWith({
        username: "Server User",
        email: "server@example.com"
      });
    });
  });

  test("redirects to login when token is missing", async () => {
    getStoredToken.mockReturnValue(null);

    render(<Profile />);

    await waitFor(() => {
      expect(clearStoredSession).toHaveBeenCalledTimes(1);
      expect(mockNavigate).toHaveBeenCalledWith("/login");
    });
    expect(global.fetch).not.toHaveBeenCalled();
  });

  test("shows validation when username is empty during profile save", async () => {
    render(<Profile />);
    await screen.findByRole("heading", { name: "Server User" });

    await userEvent.click(screen.getByRole("button", { name: /edit username/i }));
    const usernameInput = screen.getByPlaceholderText("Enter username");
    await userEvent.clear(usernameInput);
    await userEvent.click(screen.getByRole("button", { name: /save username/i }));

    expect(await screen.findByText("Username is required.")).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  test("updates profile successfully and syncs storage", async () => {
    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          username: "Server User",
          email: "server@example.com"
        })
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          message: "Profile updated successfully",
          token: "fresh-token",
          user: {
            username: "Edited User",
            email: "edited@example.com"
          }
        })
      );

    render(<Profile />);
    await screen.findByRole("heading", { name: "Server User" });

    await userEvent.click(screen.getByRole("button", { name: /edit username/i }));
    const usernameInput = screen.getByPlaceholderText("Enter username");
    await userEvent.clear(usernameInput);
    await userEvent.type(usernameInput, "Edited User");
    await userEvent.click(screen.getByRole("button", { name: /save username/i }));

    expect(await screen.findByText("Profile updated successfully")).toBeInTheDocument();
    expect(await screen.findByRole("heading", { name: "Edited User" })).toBeInTheDocument();

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const updateCall = global.fetch.mock.calls[1];
    expect(updateCall[0]).toBe("http://localhost:5001/api/profile");
    expect(updateCall[1].method).toBe("PUT");
    expect(JSON.parse(updateCall[1].body)).toEqual({
      username: "Edited User",
      email: "server@example.com"
    });

    expect(setStoredToken).toHaveBeenCalledWith("fresh-token");
    expect(updateStoredUser).toHaveBeenLastCalledWith({
      username: "Edited User",
      name: "Edited User",
      email: "edited@example.com"
    });
  });

  test("shows validation when new password confirmation does not match", async () => {
    render(<Profile />);
    await screen.findByRole("heading", { name: "Server User" });

    await userEvent.click(screen.getByRole("button", { name: "Reset" }));
    await userEvent.type(screen.getByLabelText("Old Password"), "old-password");
    await userEvent.type(screen.getByLabelText("New Password"), "new-password");
    await userEvent.type(
      screen.getByLabelText("Confirm New Password"),
      "different-password"
    );
    await userEvent.click(screen.getByRole("button", { name: /save new password/i }));

    expect(
      await screen.findByText("New password and confirmation do not match.")
    ).toBeInTheDocument();
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
