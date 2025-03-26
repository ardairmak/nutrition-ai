import { Request, Response } from "express";
import {
  registerUser,
  verifyUser,
  getUserProfile,
  updateUserProfile,
} from "../src/controllers/userController";
import prisma from "../src/config/prisma";
import bcrypt from "bcrypt";

// Mock the prisma client
jest.mock("../src/config/prisma", () => ({
  user: {
    findUnique: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
  },
}));

// Mock bcrypt
jest.mock("bcrypt", () => ({
  hash: jest.fn().mockResolvedValue("hashed-password"),
}));

// Mock logger
jest.mock("../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

describe("User Controller", () => {
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

  describe("registerUser", () => {
    it("should return 400 if user already exists", async () => {
      // Arrange
      mockRequest.body = {
        email: "existing@example.com",
        password: "password",
        firstName: "Existing",
        lastName: "User",
        phoneNumber: "+1234567890",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue({
        id: "1",
        email: "existing@example.com",
      });

      // Act
      await registerUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "User with that email already exists",
      });
    });

    it("should create a new user successfully", async () => {
      // Arrange
      mockRequest.body = {
        email: "new@example.com",
        password: "password",
        firstName: "New",
        lastName: "User",
        phoneNumber: "+1234567890",
      };

      (prisma.user.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.user.create as jest.Mock).mockResolvedValue({
        id: "2",
        email: "new@example.com",
        firstName: "New",
        lastName: "User",
      });

      // Act
      await registerUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(responseObject).toHaveProperty(
        "message",
        "User registered successfully. Please verify your account."
      );
      expect(responseObject).toHaveProperty("user");
      expect(responseObject.user).toHaveProperty("email", "new@example.com");
    });
  });

  describe("verifyUser", () => {
    it("should return 400 if verification code is invalid", async () => {
      // Arrange
      mockRequest.body = {
        phoneNumber: "+1234567890",
        code: "123456",
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(null);

      // Act
      await verifyUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: "Invalid or expired verification code",
      });
    });

    it("should verify user successfully", async () => {
      // Arrange
      mockRequest.body = {
        phoneNumber: "+1234567890",
        code: "123456",
      };

      const mockUser = {
        id: "1",
        phoneNumber: "+1234567890",
        verificationCode: "123456",
        verificationExpiresAt: new Date(Date.now() + 3600000),
      };

      (prisma.user.findFirst as jest.Mock).mockResolvedValue(mockUser);
      (prisma.user.update as jest.Mock).mockResolvedValue({
        ...mockUser,
        isVerified: true,
        verificationCode: null,
        verificationExpiresAt: null,
      });

      // Act
      await verifyUser(mockRequest as Request, mockResponse as Response);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(200);
      expect(mockResponse.json).toHaveBeenCalledWith({
        message: "Account verified successfully",
      });
    });
  });
});
