import { Request, Response } from "express";
import { googleAuthCallback } from "../src/controllers/authController";
import jwt from "jsonwebtoken";
import { logger } from "../src/utils/logger";

// Mock logger
jest.mock("../src/utils/logger", () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
  },
}));

// Mock jwt
jest.mock("jsonwebtoken", () => ({
  sign: jest.fn().mockReturnValue("mock-jwt-token"),
}));

describe("Google OAuth Authentication", () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;

  beforeEach(() => {
    // Reset process.env
    process.env.CLIENT_URL = "http://localhost:19006";
    process.env.JWT_SECRET = "test-secret";

    mockRequest = {
      user: { id: "google-user-id", email: "google-user@example.com" },
    };

    mockResponse = {
      redirect: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should redirect to client with token if authentication succeeds", () => {
    // Act
    googleAuthCallback(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(jwt.sign).toHaveBeenCalledWith(
      { id: "google-user-id", email: "google-user@example.com" },
      "test-secret"
    );
    expect(mockResponse.redirect).toHaveBeenCalledWith(
      "http://localhost:19006/auth?token=mock-jwt-token"
    );
  });

  it("should redirect to client with error if user is not available", () => {
    // Arrange
    mockRequest.user = undefined;

    // Act
    googleAuthCallback(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(mockResponse.redirect).toHaveBeenCalledWith(
      "http://localhost:19006/auth?error=Authentication failed"
    );
  });

  it("should redirect to client with error if an exception occurs", () => {
    // Arrange
    (jwt.sign as jest.Mock).mockImplementationOnce(() => {
      throw new Error("JWT error");
    });

    // Act
    googleAuthCallback(mockRequest as Request, mockResponse as Response);

    // Assert
    expect(logger.error).toHaveBeenCalled();
    expect(mockResponse.redirect).toHaveBeenCalledWith(
      "http://localhost:19006/auth?error=Authentication failed"
    );
  });
});
