import { apiCall } from "./api";
import { format, parseISO } from "date-fns";

// Response types
export interface ApiResponse {
  success: boolean;
  error?: string;
  message?: string;
  [key: string]: any;
}

export interface WeightEntry {
  id: string;
  userId: string;
  weight: number;
  recordedAt: string;
}

export interface WeightHistoryResponse extends ApiResponse {
  weightHistory?: WeightEntry[];
}

export interface WeightLogResponse extends ApiResponse {
  weightRecord?: WeightEntry;
}

/**
 * WeightService handles all weight tracking related API calls
 */
const weightService = {
  /**
   * Log a new weight entry
   */
  logWeight: async (
    weight: number,
    recordedAt?: Date
  ): Promise<WeightLogResponse> => {
    try {
      const data = {
        weight,
        recordedAt: recordedAt
          ? recordedAt.toISOString()
          : new Date().toISOString(),
      };

      const response = await apiCall("/weight/log", "POST", data, true);
      return response;
    } catch (error) {
      console.error("Error logging weight:", error);
      return {
        success: false,
        error: "Failed to log weight. Please try again later.",
      };
    }
  },

  /**
   * Get weight history for the current user
   */
  getWeightHistory: async (
    timeframe?: string
  ): Promise<WeightHistoryResponse> => {
    try {
      // Determine date range based on timeframe
      let startDate: string | undefined;
      const today = new Date();

      // Handle different timeframes
      if (timeframe) {
        const endDate = today.toISOString();

        if (timeframe === "1W") {
          const weekAgo = new Date();
          weekAgo.setDate(today.getDate() - 7);
          startDate = weekAgo.toISOString();
        } else if (timeframe === "1M") {
          const monthAgo = new Date();
          monthAgo.setMonth(today.getMonth() - 1);
          startDate = monthAgo.toISOString();
        } else if (timeframe === "3M") {
          const threeMonthsAgo = new Date();
          threeMonthsAgo.setMonth(today.getMonth() - 3);
          startDate = threeMonthsAgo.toISOString();
        } else if (timeframe === "1Y") {
          const yearAgo = new Date();
          yearAgo.setFullYear(today.getFullYear() - 1);
          startDate = yearAgo.toISOString();
        }

        // Build query string
        const queryParams = startDate
          ? `?startDate=${startDate}&endDate=${endDate}`
          : "";

        const response = await apiCall(
          `/weight/history${queryParams}`,
          "GET",
          null,
          true
        );
        return response;
      }

      // If no timeframe, get all history
      const response = await apiCall("/weight/history", "GET", null, true);
      return response;
    } catch (error) {
      console.error("Error fetching weight history:", error);
      return {
        success: false,
        error: "Failed to fetch weight history. Please try again later.",
      };
    }
  },

  /**
   * Delete a weight entry
   */
  deleteWeightEntry: async (entryId: string): Promise<ApiResponse> => {
    try {
      const response = await apiCall(
        `/weight/${entryId}`,
        "DELETE",
        null,
        true
      );
      return response;
    } catch (error) {
      console.error("Error deleting weight entry:", error);
      return {
        success: false,
        error: "Failed to delete weight entry. Please try again later.",
      };
    }
  },

  /**
   * Format weight data for charts
   */
  formatWeightDataForChart: (
    weightEntries: WeightEntry[],
    timeframe: string
  ): any => {
    // Sort entries by date
    const sortedEntries = [...weightEntries].sort((a, b) => {
      return (
        new Date(a.recordedAt).getTime() - new Date(b.recordedAt).getTime()
      );
    });

    // Format based on timeframe
    let labels: string[] = [];
    let data: number[] = [];

    if (sortedEntries.length === 0) {
      return {
        labels: [],
        datasets: [{ data: [] }],
      };
    }

    switch (timeframe) {
      case "1W":
        // Show each day
        sortedEntries.forEach((entry) => {
          const date = parseISO(entry.recordedAt);
          labels.push(format(date, "EEE")); // Day name (Mon, Tue, etc.)
          data.push(entry.weight);
        });
        break;

      case "1M":
        // Group by week
        const weeks = new Map<number, { sum: number; count: number }>();
        sortedEntries.forEach((entry) => {
          const date = parseISO(entry.recordedAt);
          const weekStart = new Date(date);
          weekStart.setDate(date.getDate() - date.getDay());
          const weekKey = weekStart.getTime();

          if (!weeks.has(weekKey)) {
            weeks.set(weekKey, { sum: entry.weight, count: 1 });
          } else {
            const week = weeks.get(weekKey)!;
            week.sum += entry.weight;
            week.count += 1;
          }
        });

        // Convert to arrays
        [...weeks.entries()]
          .sort(([a], [b]) => a - b)
          .forEach(([time, { sum, count }]) => {
            const date = new Date(time);
            labels.push(`Week ${format(date, "w")}`);
            data.push(sum / count); // Average weight for the week
          });
        break;

      case "3M":
        // Group by month
        const months = new Map<string, { sum: number; count: number }>();
        sortedEntries.forEach((entry) => {
          const date = parseISO(entry.recordedAt);
          const monthKey = format(date, "yyyy-MM");

          if (!months.has(monthKey)) {
            months.set(monthKey, { sum: entry.weight, count: 1 });
          } else {
            const month = months.get(monthKey)!;
            month.sum += entry.weight;
            month.count += 1;
          }
        });

        // Convert to arrays
        [...months.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .forEach(([key, { sum, count }]) => {
            labels.push(format(parseISO(`${key}-01`), "MMM"));
            data.push(sum / count); // Average weight for the month
          });
        break;

      case "1Y":
        // Group by every other month
        const yearMonths = new Map<string, { sum: number; count: number }>();
        sortedEntries.forEach((entry) => {
          const date = parseISO(entry.recordedAt);
          const monthKey = format(date, "yyyy-MM");

          if (!yearMonths.has(monthKey)) {
            yearMonths.set(monthKey, { sum: entry.weight, count: 1 });
          } else {
            const month = yearMonths.get(monthKey)!;
            month.sum += entry.weight;
            month.count += 1;
          }
        });

        // Show every other month
        [...yearMonths.entries()]
          .sort(([a], [b]) => a.localeCompare(b))
          .filter((_, index) => index % 2 === 0) // Take every other month
          .forEach(([key, { sum, count }]) => {
            labels.push(format(parseISO(`${key}-01`), "MMM"));
            data.push(sum / count); // Average weight for the month
          });
        break;

      default:
        // Default: show all entries
        sortedEntries.forEach((entry) => {
          const date = parseISO(entry.recordedAt);
          labels.push(format(date, "MM/dd"));
          data.push(entry.weight);
        });
    }

    return {
      labels,
      datasets: [{ data }],
    };
  },
};

export default weightService;
