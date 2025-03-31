import { User } from "@prisma/client";
import "express-session";

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role?: string;
      };
    }
  }
}

declare module "express-session" {
  interface SessionData {
    isMobile?: boolean;
    redirectUri?: string;
  }
}
