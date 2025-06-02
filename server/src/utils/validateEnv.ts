import { logger } from "./logger";

interface RequiredEnvVars {
  JWT_SECRET: string;
  DATABASE_URL: string;
  OPENAI_API_KEY?: string;
  AWS_ACCESS_KEY_ID?: string;
  AWS_SECRET_ACCESS_KEY?: string;
  SESSION_SECRET: string;
}

export function validateEnv(): RequiredEnvVars {
  const errors: string[] = [];

  // Critical secrets that must exist
  const requiredVars = ["JWT_SECRET", "DATABASE_URL", "SESSION_SECRET"];

  requiredVars.forEach((varName) => {
    if (!process.env[varName]) {
      errors.push(`Missing required environment variable: ${varName}`);
    }
  });

  // Check JWT_SECRET strength
  if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
    errors.push("JWT_SECRET must be at least 32 characters long");
  }

  // Check for default/weak secrets
  const weakSecrets = ["session-secret", "your-secret-key", "secret"];
  if (
    process.env.SESSION_SECRET &&
    weakSecrets.includes(process.env.SESSION_SECRET)
  ) {
    errors.push("SESSION_SECRET is using a default/weak value");
  }

  if (errors.length > 0) {
    logger.error("Environment validation failed:");
    errors.forEach((error) => logger.error(`  - ${error}`));
    process.exit(1);
  }

  logger.info("✅ Environment validation passed");

  return {
    JWT_SECRET: process.env.JWT_SECRET!,
    DATABASE_URL: process.env.DATABASE_URL!,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    SESSION_SECRET: process.env.SESSION_SECRET!,
  };
}
