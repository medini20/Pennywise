jest.mock("../../config/db", () => {
  const query = jest.fn();
  return {
    promise: () => ({ query }),
    __query: query
  };
});

jest.mock("bcrypt", () => ({
  hash: jest.fn(async (value) => `hashed:${value}`),
  compare: jest.fn(async () => false)
}));

jest.mock("../../utils/emailService", () => ({
  sendOTP: jest.fn(),
  isEmailProviderConfigured: jest.fn(() => false)
}));

jest.mock("jsonwebtoken", () => ({
  sign: jest.fn(() => "test-token")
}));

jest.mock("google-auth-library", () => ({
  OAuth2Client: jest.fn().mockImplementation(() => ({
    verifyIdToken: jest.fn()
  }))
}));

const db = require("../../config/db");
const emailService = require("../../utils/emailService");
const userController = require("./userController");

const createResponse = () => {
  const response = {
    statusCode: 200,
    body: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    }
  };

  return response;
};

describe("userController OTP protections", () => {
  beforeEach(() => {
    db.__query.mockReset();
    emailService.sendOTP.mockReset();
    userController.__test__.clearOtpSecurityState();
  });

  test("locks signup OTP verification after repeated invalid attempts", async () => {
    db.__query.mockResolvedValue([[]]);
    const request = {
      body: { email: "user@example.com", otpCode: "000000" },
      ip: "127.0.0.1",
      headers: {}
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = createResponse();
      // eslint-disable-next-line no-await-in-loop
      await userController.verifyOtp(request, response);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe("Invalid or expired OTP");
    }

    const blockedResponse = createResponse();
    await userController.verifyOtp(request, blockedResponse);

    expect(blockedResponse.statusCode).toBe(429);
    expect(blockedResponse.body.error).toMatch(/Too many invalid OTP attempts/i);
  });

  test("locks password reset OTP verification after repeated invalid attempts", async () => {
    db.__query.mockResolvedValue([[]]);
    const request = {
      body: {
        email: "user@example.com",
        otpCode: "000000",
        newPassword: "SecurePass@123"
      },
      ip: "127.0.0.1",
      headers: {}
    };

    for (let attempt = 0; attempt < 5; attempt += 1) {
      const response = createResponse();
      // eslint-disable-next-line no-await-in-loop
      await userController.resetPassword(request, response);
      expect(response.statusCode).toBe(400);
      expect(response.body.error).toBe("Invalid or expired OTP");
    }

    const blockedResponse = createResponse();
    await userController.resetPassword(request, blockedResponse);

    expect(blockedResponse.statusCode).toBe(429);
    expect(blockedResponse.body.error).toMatch(/Too many invalid OTP attempts/i);
  });

  test("rejects password reset OTP requests when email delivery is not configured", async () => {
    db.__query
      .mockResolvedValueOnce([[{ user_id: 7, email: "user@example.com" }]])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}])
      .mockResolvedValueOnce([{}]);
    emailService.sendOTP.mockResolvedValue({
      success: true,
      deliveryConfirmed: false,
      previewMode: true
    });

    const request = {
      body: { email: "user@example.com" },
      ip: "127.0.0.1",
      headers: {}
    };
    const response = createResponse();

    await userController.forgotPassword(request, response);

    expect(response.statusCode).toBe(503);
    expect(response.body.error).toMatch(/not configured|couldn't send/i);
    expect(db.__query.mock.calls[1][0]).toContain(
      "DELETE FROM otps WHERE email = ? AND purpose = 'PASSWORD_RESET'"
    );
    expect(db.__query.mock.calls[3][0]).toContain(
      "DELETE FROM otps WHERE email = ? AND purpose = 'PASSWORD_RESET'"
    );
  });

  test("rejects weak passwords during signup", async () => {
    const request = {
      body: {
        name: "sampleuser",
        email: "user@example.com",
        password: "weakpass"
      }
    };
    const response = createResponse();

    await userController.signup(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/at least 8 characters/i);
    expect(response.body.error).toMatch(/uppercase/i);
  });

  test("rejects weak passwords during change password", async () => {
    const request = {
      user: { id: 1 },
      body: {
        oldPassword: "OldPass@123",
        newPassword: "weakpass"
      }
    };
    const response = createResponse();

    await userController.changePassword(request, response);

    expect(response.statusCode).toBe(400);
    expect(response.body.error).toMatch(/at least 8 characters/i);
    expect(response.body.error).toMatch(/special character/i);
  });
});
