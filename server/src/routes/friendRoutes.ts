import { Router } from "express";
import { authenticate } from "../middleware/auth";
import * as friendController from "../controllers/friendController";
import { AuthRequest } from "../middleware/auth";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Friend request routes
router.get("/requests", (req, res) =>
  friendController.getFriendRequests(req as AuthRequest, res)
);
router.post("/request", (req, res) =>
  friendController.sendFriendRequest(req as AuthRequest, res)
);
router.post("/accept", (req, res) =>
  friendController.acceptFriendRequest(req as AuthRequest, res)
);
router.post("/reject", (req, res) =>
  friendController.rejectFriendRequest(req as AuthRequest, res)
);

// Friend management routes
router.get("/", (req, res) =>
  friendController.getFriends(req as AuthRequest, res)
);
router.get("/:friendId/profile", (req, res) =>
  friendController.getFriendProfile(req as AuthRequest, res)
);
router.delete("/", (req, res) =>
  friendController.removeFriend(req as AuthRequest, res)
);

export default router;
