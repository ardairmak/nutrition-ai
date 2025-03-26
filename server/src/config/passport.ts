import passport from "passport";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import prisma from "./prisma";
import { logger } from "../utils/logger";

// Configure Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
      scope: ["email", "profile"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Check if user exists
        let user = await prisma.user.findFirst({
          where: {
            email: profile.emails?.[0]?.value,
          },
        });

        if (!user) {
          // Create new user if not found
          user = await prisma.user.create({
            data: {
              email: profile.emails?.[0]?.value || `${profile.id}@google.com`,
              passwordHash: "", // No password for OAuth users
              firstName: profile.name?.givenName || profile.displayName || "",
              lastName: profile.name?.familyName || "",
              phoneNumber: "", // Required by schema but we may not have it from Google
              isVerified: true, // Google accounts are pre-verified
              profilePicture: profile.photos?.[0]?.value,
              dietaryPreferences: [],
              allergies: [],
            },
          });

          logger.info(`New user created via Google OAuth: ${user.id}`);
        } else {
          // Update existing user with latest Google profile data
          user = await prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              firstName:
                profile.name?.givenName ||
                profile.displayName ||
                user.firstName,
              lastName: profile.name?.familyName || user.lastName,
              profilePicture: profile.photos?.[0]?.value || user.profilePicture,
              isVerified: true,
              lastLogin: new Date(),
            },
          });

          logger.info(`User logged in via Google OAuth: ${user.id}`);
        }

        return done(null, {
          id: user.id,
          email: user.email,
        });
      } catch (error) {
        logger.error(`Google OAuth error: ${error}`);
        return done(error as Error);
      }
    }
  )
);

// Serialization and deserialization for session management
passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user: Express.User, done) => {
  done(null, user);
});

export default passport;
