// Meal Tracking Service for Smart Notifications
// This service checks user's meal logging activity

import { format, startOfDay, endOfDay } from "date-fns";
import { getAuthToken } from "./api";
import { API_URL } from "../config/constants";

export class MealTrackingService {
  private static instance: MealTrackingService;

  public static getInstance(): MealTrackingService {
    if (!MealTrackingService.instance) {
      MealTrackingService.instance = new MealTrackingService();
    }
    return MealTrackingService.instance;
  }

  // Check if user has logged any meals today
  async hasLoggedMealsToday(): Promise<boolean> {
    try {
      const token = await getAuthToken();
      if (!token) {
        return false;
      }

      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      const response = await fetch(
        `${API_URL}/meals/entries?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        return false;
      }

      const data = await response.json();
      const mealsToday = data.meals || [];

      return mealsToday.length > 0;
    } catch (error) {
      return false;
    }
  }

  // Get user's current streak
  async getUserStreak(): Promise<number> {
    try {
      const token = await getAuthToken();
      if (!token) return 0;

      const response = await fetch(`${API_URL}/users/dashboard-data`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return 0;

      const data = await response.json();
      return data.dashboardData?.streak || 0;
    } catch (error) {
      return 0;
    }
  }

  // Get meal count for today
  async getTodayMealCount(): Promise<number> {
    try {
      const token = await getAuthToken();
      if (!token) return 0;

      const today = new Date();
      const startDate = startOfDay(today).toISOString();
      const endDate = endOfDay(today).toISOString();

      const response = await fetch(
        `${API_URL}/meals/entries?startDate=${startDate}&endDate=${endDate}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) return 0;

      const data = await response.json();
      return (data.meals || []).length;
    } catch (error) {
      return 0;
    }
  }

  // Check if it's been more than X hours since last meal
  async getHoursSinceLastMeal(): Promise<number> {
    try {
      const token = await getAuthToken();
      if (!token) return 24; // Assume it's been a long time

      const response = await fetch(`${API_URL}/meals/entries?limit=1`, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) return 24;

      const data = await response.json();
      const meals = data.meals || [];

      if (meals.length === 0) return 24;

      const lastMeal = meals[0];
      const lastMealTime = new Date(lastMeal.consumedAt || lastMeal.createdAt);
      const now = new Date();
      const hoursDiff =
        (now.getTime() - lastMealTime.getTime()) / (1000 * 60 * 60);

      return Math.floor(hoursDiff);
    } catch (error) {
      return 24;
    }
  }
}

export default MealTrackingService.getInstance();
