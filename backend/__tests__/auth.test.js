const request = require("supertest");
const app = require("../server");
const db = require("../config/db");

/* ───────────── 1. AUTHENTICATION ───────────── */

describe("1. AUTHENTICATION", () => {

  /* ── a) SIGN UP / REGISTER ── */
  describe("a) REGISTER", () => {

    // Initialising test database
    const testUser = {
      username: "testuser_unit",
      email: "testuser_unit@pennywise.com",
      password: "SecurePass@123"
    };
    const existingUser = {
      username: "testuser_pennywise",
      email: "testuser_pennywise@test.com",
      password: "Test@1234"
    };

    // Test whether new user registration returns OTP
    it("should register a new user and return OTP", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send(testUser);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain("User registered");
      expect(response.body.otp).toBeDefined();
    });

    // Test whether it gives error for existing email
    it("should return error for already registered email", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send(existingUser);

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email already exists");
    });

    // Test whether it gives error for existing username
    it("should return error for already taken username", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({
          username: "testuser_pennywise",
          email: "newemail_unique@test.com",
          password: "SecurePass@123"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Username already taken");
    });

    // Test that form can't be submitted with empty fields
    it("should return error when required fields are missing", async () => {
      const response = await request(app)
        .post("/auth/signup")
        .send({ email: "incomplete@test.com" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Username, email, and password are required"
      );
    });
  });

  /* ── b) LOGIN ── */
  describe("b) LOGIN", () => {

    // Initialising test credentials
    const validUser = {
      username: "testuser_pennywise",
      password: "Test@1234"
    };

    // Test whether user is able to login with correct credentials
    it("should login successfully with valid credentials", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send(validUser);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe("Login successful");
      expect(response.body.token).toBeDefined();
      expect(response.body.user).toBeDefined();
      expect(response.body.user.username).toBe("testuser_pennywise");
    });

    // Test whether login is failing by entering wrong credentials
    it("should return error for invalid credentials", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          username: "nonexistentuser",
          password: "wrongpassword"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid username or password");
    });

    // Test whether login fails with wrong password for existing user
    it("should return error for wrong password", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({
          username: "testuser_pennywise",
          password: "WrongPassword@999"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid username or password");
    });

    // Test that form can't be submitted with empty fields
    it("should return error when fields are empty", async () => {
      const response = await request(app)
        .post("/auth/login")
        .send({ username: "", password: "" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Username and password are required"
      );
    });
  });

  /* ── c) FORGOT / RESET PASSWORD ── */
  describe("c) FORGOT PASSWORD", () => {

    // Test whether OTP is sent for valid email
    it("should send OTP for password reset to valid email", async () => {
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "testuser_pennywise@test.com" });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain("OTP");
      expect(response.body.otp).toBeDefined();
    });

    // Test whether error is thrown for non-existent email
    it("should return error for non-existent email", async () => {
      const response = await request(app)
        .post("/auth/forgot-password")
        .send({ email: "nouser@pennywise.com" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("User not found");
    });

    // Test whether password reset fails with invalid OTP
    it("should return error for invalid OTP on reset", async () => {
      const response = await request(app)
        .post("/auth/reset-password")
        .send({
          email: "testuser_pennywise@test.com",
          otpCode: "000000",
          newPassword: "NewSecure@456"
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid or expired OTP");
    });

    // Test that form can't be submitted with missing fields
    it("should return error when reset fields are missing", async () => {
      const response = await request(app)
        .post("/auth/reset-password")
        .send({ email: "testuser_pennywise@test.com" });

      expect(response.status).toBe(400);
      expect(response.body.error).toBe(
        "Email, OTP code, and new password are required"
      );
    });
  });

  // Cleanup
  afterAll(async () => {
    try {
      await db.promise().query(
        "DELETE FROM users WHERE email = ?",
        ["testuser_unit@pennywise.com"]
      );
    } catch (e) { /* ignore */ }
    await db.promise().end();
  });
});
