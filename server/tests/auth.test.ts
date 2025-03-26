import { Request, Response } from "express";
import {
  loginUser,
  requestPasswordReset,
  resetPassword,
} from "../src/controllers/authController";
import prisma from "../src/config/prisma";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// Mock the prisma client
jest.mock("../src/config/prisma", () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock("bcrypt", () => ({
  compare: jest.fn(),
  hash: jest.fn(),
}));

// Mock logger
jest.mock("../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("Authentication Controller", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let responseObject: any = {};

  beforeEach(() => {
    mockRequest = {};
    responseObject = {};
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockImplementation((result) => {
        responseObject = result;
        return mockResponse;
      }),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("loginUser", () => {
    it("should return 401 if user not found", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", password: "password" };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);

      // Act
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });

    it("should return 403 if user is not verified", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", password: "password" };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "1",
        email: "test@example.com",
        isVerified: false,
      });

      // Act
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(403);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Account not verified. Please verify your account first.",
      });
    });

    it("should return 401 if password is invalid", async () => {
      // Arrange
      mockRequest.body = {
        email: "test@example.com",
        password: "wrong-password",
      };
      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "1",
        email: "test@example.com",
        isVerified: true,
        passwordHash: "hashed-password",
      });
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      // Act
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(401);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid credentials",
      });
    });

    it("should return 200 and token if login is successful", async () => {
      // Arrange
      mockRequest.body = { email: "test@example.com", password: "password" };
      const mockUser = {
        id: "1",
        email: "test@example.com",
        firstName: "Test",
        lastName: "User",
        isVerified: true,
        passwordHash: "hashed-password",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(mockUser);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (prisma.user.update as jest.Mock).mockResolvedValue(mockUser);

      // Act
      await loginUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(responseObject).toHaveProperty("token");
      expect(responseObject).toHaveProperty("message", "Login successful");
    });
  });
});
