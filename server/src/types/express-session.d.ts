// Type definitions for express-session
import "express-session";

declare module "express-session" {
  interface Session {
    isMobile?: boolean;
    redirectUri?: string;
  }
}
