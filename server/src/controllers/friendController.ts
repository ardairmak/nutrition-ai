import { Request, Response } from "express";
import { prisma } from "../db";
import { logger } from "../utils/logger";
import { AuthRequest } from "../middleware/auth";

// Send friend request
export const sendFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ error: "User ID and friend ID are required" });
    }

    // Check if users exist
    const [user, friend] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.user.findUnique({ where: { id: friendId } }),
    ]);

    if (!user || !friend) {
      return res.status(404).json({ error: "User or friend not found" });
    }

    // Check if friend request already exists
    const existingRequest = await prisma.userFriend.findFirst({
      where: {
        OR: [
          { userId, friendId },
          { userId: friendId, friendId: userId },
        ],
      },
    });

    if (existingRequest) {
      return res.status(400).json({ error: "Friend request already exists" });
    }

    // Create friend request
    const friendRequest = await prisma.userFriend.create({
      data: {
        userId,
        friendId,
        status: "PENDING",
      },
    });

    return res.status(201).json(friendRequest);
  } catch (error) {
    logger.error(`Error sending friend request: ${error}`);
    return res.status(500).json({ error: "Failed to send friend request" });
  }
};

// Accept friend request
export const acceptFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ error: "User ID and friend ID are required" });
    }

    // Find and update the friend request
    const friendRequest = await prisma.userFriend.findFirst({
      where: {
        userId: friendId,
        friendId: userId,
        status: "PENDING",
      },
    });

    if (!friendRequest) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    // Update friend request status
    const updatedRequest = await prisma.userFriend.update({
      where: { id: friendRequest.id },
      data: { status: "ACCEPTED" },
    });

    return res.status(200).json(updatedRequest);
  } catch (error) {
    logger.error(`Error accepting friend request: ${error}`);
    return res.status(500).json({ error: "Failed to accept friend request" });
  }
};

// Reject friend request
export const rejectFriendRequest = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ error: "User ID and friend ID are required" });
    }

    // Find and delete the friend request
    const friendRequest = await prisma.userFriend.findFirst({
      where: {
        userId: friendId,
        friendId: userId,
        status: "PENDING",
      },
    });

    if (!friendRequest) {
      return res.status(404).json({ error: "Friend request not found" });
    }

    await prisma.userFriend.delete({
      where: { id: friendRequest.id },
    });

    return res.status(200).json({ message: "Friend request rejected" });
  } catch (error) {
    logger.error(`Error rejecting friend request: ${error}`);
    return res.status(500).json({ error: "Failed to reject friend request" });
  }
};

// Get friend list
export const getFriends = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get all accepted friend relationships
    const friends = await prisma.userFriend.findMany({
      where: {
        OR: [
          { userId, status: "ACCEPTED" },
          { friendId: userId, status: "ACCEPTED" },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
        friend: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
          },
        },
      },
    });

    // Transform the response to get friend details
    const friendList = friends.map((friend) => {
      const friendDetails =
        friend.userId === userId ? friend.friend : friend.user;
      return {
        id: friendDetails.id,
        firstName: friendDetails.firstName,
        lastName: friendDetails.lastName,
        profilePicture: friendDetails.profilePicture,
      };
    });

    return res.status(200).json(friendList);
  } catch (error) {
    logger.error(`Error getting friends: ${error}`);
    return res.status(500).json({ error: "Failed to get friends" });
  }
};

// Get pending friend requests
export const getFriendRequests = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;

    if (!userId) {
      return res.status(400).json({ error: "User ID is required" });
    }

    // Get all pending friend requests where the current user is the recipient
    const requests = await prisma.userFriend.findMany({
      where: {
        friendId: userId,
        status: "PENDING",
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            profilePicture: true,
            email: true,
          },
        },
      },
    });

    // Transform the response to get request details
    const requestList = requests.map((request) => ({
      id: request.id,
      user: request.user,
    }));

    return res.status(200).json(requestList);
  } catch (error) {
    logger.error(`Error getting friend requests: ${error}`);
    return res.status(500).json({ error: "Failed to get friend requests" });
  }
};

// Remove friend
export const removeFriend = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.body;

    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ error: "User ID and friend ID are required" });
    }

    // Find and delete the friend relationship
    const friendRelationship = await prisma.userFriend.findFirst({
      where: {
        OR: [
          { userId, friendId, status: "ACCEPTED" },
          { userId: friendId, friendId: userId, status: "ACCEPTED" },
        ],
      },
    });

    if (!friendRelationship) {
      return res.status(404).json({ error: "Friend relationship not found" });
    }

    await prisma.userFriend.delete({
      where: { id: friendRelationship.id },
    });

    return res.status(200).json({ message: "Friend removed successfully" });
  } catch (error) {
    logger.error(`Error removing friend: ${error}`);
    return res.status(500).json({ error: "Failed to remove friend" });
  }
};

// Get friend profile data
export const getFriendProfile = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.id;
    const { friendId } = req.params;

    if (!userId || !friendId) {
      return res
        .status(400)
        .json({ error: "User ID and friend ID are required" });
    }

    // Check if they are friends
    const friendship = await prisma.userFriend.findFirst({
      where: {
        OR: [
          { userId, friendId, status: "ACCEPTED" },
          { userId: friendId, friendId: userId, status: "ACCEPTED" },
        ],
      },
    });

    if (!friendship) {
      return res
        .status(403)
        .json({ error: "You are not friends with this user" });
    }

    // Get friend's basic info
    const friend = await prisma.user.findUnique({
      where: { id: friendId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        profilePicture: true,
        createdAt: true,
        activityLevel: true,
        fitnessGoals: true,
      },
    });

    if (!friend) {
      return res.status(404).json({ error: "Friend not found" });
    }

    // Calculate login streak (simplified - count recent days with meals)
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // Get meals from last 30 days to calculate streak
    const recentMeals = await prisma.mealEntry.findMany({
      where: {
        userId: friendId,
        createdAt: {
          gte: thirtyDaysAgo,
        },
      },
      select: {
        createdAt: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Calculate login streak (days with at least one meal)
    let loginStreak = 0;
    const mealDates = new Set(
      recentMeals.map(
        (meal: { createdAt: Date }) =>
          meal.createdAt.toISOString().split("T")[0]
      )
    );

    // Check consecutive days from today backwards
    for (let i = 0; i < 30; i++) {
      const checkDate = new Date(today.getTime() - i * 24 * 60 * 60 * 1000);
      const dateString = checkDate.toISOString().split("T")[0];

      if (mealDates.has(dateString)) {
        loginStreak++;
      } else {
        break; // Streak broken
      }
    }

    // Get total meals logged
    const totalMealsLogged = await prisma.mealEntry.count({
      where: { userId: friendId },
    });

    // Get days active this month
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysActiveThisMonth = await prisma.mealEntry.groupBy({
      by: ["createdAt"],
      where: {
        userId: friendId,
        createdAt: {
          gte: startOfMonth,
        },
      },
      _count: {
        id: true,
      },
    });

    // Count unique days
    const uniqueDaysThisMonth = new Set(
      daysActiveThisMonth.map(
        (day: { createdAt: Date }) => day.createdAt.toISOString().split("T")[0]
      )
    ).size;

    // Format activity level for display
    const formatActivityLevel = (level: string | null) => {
      if (!level) return "Not Set";
      return level
        .split("_")
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(" ");
    };

    // Format fitness goals for display
    const formatFitnessGoals = (goals: string[] | null) => {
      if (!goals || !Array.isArray(goals)) return [];

      const goalMap: { [key: string]: string } = {
        lose_weight: "Lose Weight",
        gain_muscle: "Gain Muscle",
        maintain_weight: "Maintain Weight",
        improve_endurance: "Improve Endurance",
        increase_strength: "Increase Strength",
        improve_flexibility: "Improve Flexibility",
        healthy_eating: "Healthy Eating",
        better_sleep: "Better Sleep",
        reduce_stress: "Reduce Stress",
        improve_overall_health: "Improve Overall Health",
        build_lean_muscle: "Build Lean Muscle",
        tone_body: "Tone Body",
        improve_cardiovascular_health: "Improve Cardiovascular Health",
        increase_energy: "Increase Energy",
        improve_mental_health: "Improve Mental Health",
      };

      return goals.map(
        (goal) =>
          goalMap[goal] ||
          goal
            .split("_")
            .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
      );
    };

    const profileData = {
      joinDate: friend.createdAt.toISOString(),
      loginStreak,
      totalMealsLogged,
      daysActiveThisMonth: uniqueDaysThisMonth,
      activityLevel: formatActivityLevel(friend.activityLevel),
      fitnessGoals: formatFitnessGoals(friend.fitnessGoals),
      // Keep achievements as mock for now
      achievements: [
        {
          id: "1",
          name: "First Week",
          icon: "calendar-week",
          earnedAt: "2024-01-22",
        },
        { id: "2", name: "Meal Master", icon: "food", earnedAt: "2024-02-01" },
        {
          id: "3",
          name: "Streak Keeper",
          icon: "fire",
          earnedAt: "2024-02-15",
        },
      ].slice(0, Math.floor(Math.random() * 3) + 1),
    };

    return res.status(200).json(profileData);
  } catch (error) {
    logger.error(`Error getting friend profile: ${error}`);
    return res.status(500).json({ error: "Failed to get friend profile" });
  }
};
