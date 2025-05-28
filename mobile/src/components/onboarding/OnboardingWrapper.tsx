import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  BackHandler,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { RootStackParamList } from "../../navigation/types";
import { useAuth } from "../../contexts/AuthContext";
import userService from "../../services/userService";

// Import all onboarding content components
import { OnboardingGenderContent } from "./OnboardingGenderContent";
import { OnboardingNameContent } from "./OnboardingNameContent";
import { OnboardingWorkoutContent } from "./OnboardingWorkoutContent";
import OnboardingStatsContent from "./OnboardingStatsContent";
import { OnboardingGoalsContent } from "./OnboardingGoalsContent";
import { OnboardingTargetWeightContent } from "./OnboardingTargetWeightContent";
import { OnboardingMotivationContent } from "./OnboardingMotivationContent";
import { OnboardingDietContent } from "./OnboardingDietContent";
import { OnboardingBirthDateContent } from "./OnboardingBirthDateContent";
import {
  OnboardingExactWeightContent,
  OnboardingExactWeightContentProps,
} from "./OnboardingDesiredWeightContent";
import { OnboardingLoadingContent } from "./OnboardingLoadingContent";
import { OnboardingPlanReadyContent } from "./OnboardingPlanReadyContent";

// Extended User type to include the properties we need
interface ExtendedUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  profileSetupComplete?: boolean;
  weight?: number;
  height?: number;
  weightGoal?: string;
  otherSettings?: {
    motivation?: "consistent" | "fast";
    [key: string]: any;
  };
  [key: string]: any;
}

// Define the onboarding steps - using actual components
const ONBOARDING_STEPS = [
  {
    id: "gender",
    component: OnboardingGenderContent,
    title: "Your Gender",
  },
  {
    id: "name",
    component: OnboardingNameContent,
    title: "Your Name",
  },
  {
    id: "stats",
    component: OnboardingStatsContent,
    title: "Height & Weight",
  },
  {
    id: "birthdate",
    component: OnboardingBirthDateContent,
    title: "Date of Birth",
  },
  {
    id: "workout",
    component: OnboardingWorkoutContent,
    title: "Workout Preference",
  },
  {
    id: "goals",
    component: OnboardingGoalsContent,
    title: "Fitness Goals",
  },
  {
    id: "weightTarget",
    component: OnboardingTargetWeightContent,
    title: "Weight Target",
  },
  {
    id: "exactWeight",
    component: OnboardingExactWeightContent,
    title: "Desired Weight",
  },
  {
    id: "diet",
    component: OnboardingDietContent,
    title: "Dietary Preferences",
  },
  {
    id: "motivation",
    component: OnboardingMotivationContent,
    title: "Weight Gain Speed",
  },
];

export function OnboardingWrapper() {
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const { user, setUser } = useAuth();
  const extendedUser = user as ExtendedUser;

  const [currentStep, setCurrentStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [buttonText, setButtonText] = useState("Next");
  const [showLoadingScreen, setShowLoadingScreen] = useState(false);
  const [showPlanReadyScreen, setShowPlanReadyScreen] = useState(false);
  const [calculatedPlan, setCalculatedPlan] = useState<any>(null);

  // Get progress percentage based on current step (as a number)
  const progressPercentage = Math.min(
    ((currentStep + 1) / ONBOARDING_STEPS.length) * 100,
    100
  );

  useEffect(() => {
    // Handle hardware back button
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        if (currentStep > 0 && !showLoadingScreen && !showPlanReadyScreen) {
          handleBack();
          return true;
        }
        return false;
      }
    );

    return () => backHandler.remove();
  }, [currentStep, showLoadingScreen, showPlanReadyScreen]);

  useEffect(() => {
    // Set button text based on step
    if (currentStep === ONBOARDING_STEPS.length - 1) {
      setButtonText("Complete");
    } else {
      setButtonText("Continue");
    }
  }, [currentStep]);

  const handleDataChange = (data: any) => {
    // Only update if data actually changed
    const currentStepId = ONBOARDING_STEPS[currentStep].id;

    // Skip if the data hasn't changed
    if (
      JSON.stringify(onboardingData[currentStepId]) === JSON.stringify(data)
    ) {
      return;
    }

    // Store the data from the current step
    setOnboardingData({
      ...onboardingData,
      [currentStepId]: data,
    });
  };

  // Calculate TDEE and macros based on user data
  const calculateNutritionPlan = () => {
    try {
      const { gender, height, weight, age, activityLevel } = extractUserInfo();

      // Basic BMR calculation using Mifflin-St Jeor formula
      let bmr = 0;
      if (gender === "male") {
        bmr = 10 * weight + 6.25 * height - 5 * age + 5;
      } else {
        bmr = 10 * weight + 6.25 * height - 5 * age - 161;
      }

      // Activity multiplier
      let activityMultiplier = 1.2; // Default sedentary
      switch (activityLevel) {
        case "sedentary":
          activityMultiplier = 1.2;
          break;
        case "light":
          activityMultiplier = 1.375;
          break;
        case "moderate":
          activityMultiplier = 1.55;
          break;
        case "active":
          activityMultiplier = 1.725;
          break;
        case "very_active":
          activityMultiplier = 1.9;
          break;
      }

      // Calculate TDEE
      const tdee = Math.round(bmr * activityMultiplier);

      // Get weight goal and weekly change rate
      const weightGoal = onboardingData.weightTarget?.weightGoal || "maintain";
      const weeklyChangeRate = onboardingData.motivation?.speedValue || 0.5;

      // Calculate target date (assuming current date + time to goal)
      const today = new Date();
      const targetWeight = onboardingData.exactWeight?.exactWeight || weight;
      const weightDifference = Math.abs(targetWeight - weight);
      const weeksToGoal = weightDifference / weeklyChangeRate;
      const targetDate = new Date(today);
      targetDate.setDate(today.getDate() + Math.round(weeksToGoal * 7));

      // Format target date
      const month = targetDate.toLocaleString("default", { month: "long" });
      const day = targetDate.getDate();

      // Calculate calorie adjustment based on goal
      let calorieAdjustment = 0;
      if (weightGoal === "gain") {
        // 1kg of weight gain requires approximately 7700 calories
        calorieAdjustment = Math.round((weeklyChangeRate * 7700) / 7);
      } else if (weightGoal === "lose") {
        calorieAdjustment = -Math.round((weeklyChangeRate * 7700) / 7);
      }

      // Calculate daily calories
      const calories = tdee + calorieAdjustment;

      // Calculate macros (standard distribution)
      // Protein: 30%, Carbs: 45%, Fat: 25%
      const protein = Math.round((calories * 0.3) / 4); // 4 calories per gram
      const carbs = Math.round((calories * 0.45) / 4); // 4 calories per gram
      const fats = Math.round((calories * 0.25) / 9); // 9 calories per gram

      // Calculate health score (simplified version)
      const healthScore = Math.min(Math.round((calories / tdee) * 10), 10);

      return {
        calories,
        protein,
        carbs,
        fats,
        healthScore,
        targetWeight,
        targetDate: `${month} ${day}`,
      };
    } catch (error) {
      console.error("Error calculating nutrition plan:", error);
      // Return fallback values
      return {
        calories: 2200,
        protein: 130,
        carbs: 285,
        fats: 61,
        healthScore: 7,
        targetWeight: 70,
        targetDate: "October 23",
      };
    }
  };

  // Helper function to extract user info in the correct format for calculations
  const extractUserInfo = () => {
    // Get values from onboarding data or use defaults
    const gender = onboardingData.gender?.gender || "male";
    const height = onboardingData.stats?.height?.cm || 175;
    const weight = onboardingData.stats?.weight?.kg || 70;

    // Calculate age from birthday
    let age = 30; // Default
    if (onboardingData.birthdate?.dateOfBirth) {
      const birthDate = new Date(onboardingData.birthdate.dateOfBirth);
      const today = new Date();
      age = today.getFullYear() - birthDate.getFullYear();

      // Adjust age if birthday hasn't occurred yet this year
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
    }

    // Map workout frequency to activity level
    let activityLevel = "moderate";
    if (onboardingData.workout?.workoutFrequency) {
      switch (onboardingData.workout.workoutFrequency) {
        case "never":
          activityLevel = "sedentary";
          break;
        case "rarely":
          activityLevel = "light";
          break;
        case "sometimes":
          activityLevel = "moderate";
          break;
        case "often":
          activityLevel = "active";
          break;
        case "very_often":
          activityLevel = "very_active";
          break;
      }
    }

    return { gender, height, weight, age, activityLevel };
  };

  const handleNext = async () => {
    if (isLoading) return;

    // Ensure we have data for this step
    const currentStepId = ONBOARDING_STEPS[currentStep].id;
    if (!onboardingData[currentStepId]) {
      // If no data is available, we can't continue
      console.warn(`No data available for step: ${currentStepId}`);
      return;
    }

    if (currentStep < ONBOARDING_STEPS.length - 1) {
      // Move to the next step
      setCurrentStep(currentStep + 1);
    } else if (!showLoadingScreen && !showPlanReadyScreen) {
      // Show loading screen first
      setIsLoading(true);
      setShowLoadingScreen(true);

      // Immediately calculate nutrition plan to use in the loading screen
      const plan = calculateNutritionPlan();
      setCalculatedPlan(plan);
    } else if (showPlanReadyScreen) {
      // Finish onboarding and navigate to home
      navigation.navigate("Home");
    }
  };

  // Function to save user data to API
  const saveUserData = async () => {
    try {
      // Simplify the profile data structure
      const profileData: Record<string, any> = {
        profileSetupComplete: true,
      };

      // Process only the most essential fields
      if (onboardingData.name) {
        if (onboardingData.name.firstName) {
          profileData.firstName = onboardingData.name.firstName;
        }
        if (onboardingData.name.lastName) {
          profileData.lastName = onboardingData.name.lastName;
        }
      }

      if (onboardingData.gender && onboardingData.gender.gender) {
        profileData.gender = onboardingData.gender.gender;
      }

      if (onboardingData.birthdate && onboardingData.birthdate.dateOfBirth) {
        profileData.dateOfBirth = onboardingData.birthdate.dateOfBirth;
      }

      if (onboardingData.workout && onboardingData.workout.workoutFrequency) {
        profileData.activityLevel = onboardingData.workout.workoutFrequency;
      }

      if (onboardingData.goals && onboardingData.goals.goals) {
        profileData.fitnessGoals = onboardingData.goals.goals;
      }

      if (onboardingData.diet && onboardingData.diet.dietPreferences) {
        // Ensure dietaryPreferences is always an array
        if (Array.isArray(onboardingData.diet.dietPreferences)) {
          profileData.dietaryPreferences = onboardingData.diet.dietPreferences;
        } else {
          // If it's not an array for some reason, convert it to an array
          profileData.dietaryPreferences = [
            onboardingData.diet.dietPreferences,
          ];
        }
      }

      // Process motivation if available
      if (
        onboardingData.motivation &&
        onboardingData.motivation.motivationType
      ) {
        if (!profileData.otherSettings) {
          profileData.otherSettings = {};
        }
        profileData.otherSettings.motivation =
          onboardingData.motivation.motivationType;

        // Also save the speed value if available
        if (onboardingData.motivation.speedValue !== undefined) {
          profileData.otherSettings.targetWeightChangePerWeek =
            onboardingData.motivation.speedValue;
        }
      }

      // Process height and weight if available
      if (onboardingData.stats) {
        // Get the units information
        let heightUnit = "metric";
        let weightUnit = "metric";

        if (onboardingData.stats.units) {
          heightUnit = onboardingData.stats.units.height || "metric";
          weightUnit = onboardingData.stats.units.weight || "metric";
        }

        if (onboardingData.stats.height) {
          // For height: Check both if it's an object with units or a direct value
          if (typeof onboardingData.stats.height === "object") {
            // New format with units
            if (onboardingData.stats.height.cm !== undefined) {
              // Metric (cm) - store directly
              profileData.height = onboardingData.stats.height.cm;
            } else if (
              onboardingData.stats.height.ft !== undefined &&
              onboardingData.stats.height.in !== undefined
            ) {
              // Imperial (feet/inches) - convert to cm
              const feet = onboardingData.stats.height.ft;
              const inches = onboardingData.stats.height.in;
              profileData.height = Math.round(feet * 30.48 + inches * 2.54);
            }

            // Store original height data and unit for the server
            profileData.originalHeight = onboardingData.stats.height;
            profileData.heightUnit = heightUnit;
          } else if (typeof onboardingData.stats.height === "number") {
            // Handle legacy format (just a number)
            profileData.height = onboardingData.stats.height;
          }
        }

        if (onboardingData.stats.weight) {
          // For weight: Check both if it's an object with units or a direct value
          if (typeof onboardingData.stats.weight === "object") {
            // New format with units
            if (onboardingData.stats.weight.kg !== undefined) {
              // Metric (kg) - store directly
              profileData.weight = onboardingData.stats.weight.kg;
            } else if (onboardingData.stats.weight.lb !== undefined) {
              // Imperial (lb) - convert to kg with 2 decimal precision
              profileData.weight = parseFloat(
                (onboardingData.stats.weight.lb * 0.453592).toFixed(2)
              );
            }

            // Store original weight data and unit for the server
            profileData.originalWeight = onboardingData.stats.weight;
            profileData.weightUnit = weightUnit;
          } else if (typeof onboardingData.stats.weight === "number") {
            // Handle legacy format (just a number)
            profileData.weight = onboardingData.stats.weight;
          }
        }
      }

      // Add target weight if available
      if (
        onboardingData.weightTarget &&
        onboardingData.weightTarget.weightGoal
      ) {
        profileData.weightGoal = onboardingData.weightTarget.weightGoal;
      }

      // Add exact weight if available
      if (
        onboardingData.exactWeight &&
        onboardingData.exactWeight.exactWeight
      ) {
        // Store both the value and the unit
        const exactWeight = onboardingData.exactWeight.exactWeight;

        // If we have units from stats, assume the same unit is used for target weight
        const weightUnit = profileData.weightUnit || "metric";

        if (weightUnit === "imperial") {
          // Convert from lb to kg if using imperial
          profileData.targetWeight = parseFloat(
            (exactWeight * 0.453592).toFixed(2)
          );

          // Store original value for reference
          profileData.originalTargetWeight = {
            lb: exactWeight,
          };
        } else {
          // Metric - use as is
          profileData.targetWeight = exactWeight;
        }
      }

      // Add nutrition plan data if available
      if (calculatedPlan) {
        if (!profileData.otherSettings) {
          profileData.otherSettings = {};
        }

        // Add nutrition plan to otherSettings
        profileData.otherSettings.nutritionPlan = {
          calories: calculatedPlan.calories,
          protein: calculatedPlan.protein,
          carbs: calculatedPlan.carbs,
          fats: calculatedPlan.fats,
          healthScore: calculatedPlan.healthScore,
          lastUpdated: new Date().toISOString(),
        };

        // Also save as dedicated fields for easier querying
        profileData.dailyCalorieGoal = calculatedPlan.calories;
        profileData.proteinGoal = calculatedPlan.protein;
        profileData.carbsGoal = calculatedPlan.carbs;
        profileData.fatGoal = calculatedPlan.fats;
      }

      console.log("Profile data to update:", JSON.stringify(profileData));

      // Instead of updating all at once, update in smaller chunks
      let updateSuccess = true;

      // 1. First update: Basic information (name and profile completion)
      const basicUpdate = {
        firstName: profileData.firstName,
        lastName: profileData.lastName,
        profileSetupComplete: true,
      };

      const basicResponse = await userService.updateProfile(basicUpdate);
      if (!basicResponse.success) {
        console.error(
          "Failed to update basic profile info:",
          basicResponse.error
        );
        updateSuccess = false;
      } else if (user) {
        // Update user object for state update at the end
        const updatedFields = { ...basicUpdate };
      }

      // 2. Second update: Gender and activity level
      if (
        updateSuccess &&
        (profileData.gender ||
          profileData.activityLevel ||
          profileData.dateOfBirth)
      ) {
        const physicalUpdate = {
          gender: profileData.gender,
          activityLevel: profileData.activityLevel,
          dateOfBirth: profileData.dateOfBirth,
        };

        const physicalResponse = await userService.updateProfile(
          physicalUpdate
        );
        if (!physicalResponse.success) {
          console.warn(
            "Failed to update gender/activity:",
            physicalResponse.error
          );
          // Continue anyway - these are not critical
        }
      }

      // 3. Third update: Goals and diet
      if (
        updateSuccess &&
        (profileData.fitnessGoals || profileData.dietaryPreferences)
      ) {
        const preferencesUpdate = {
          fitnessGoals: profileData.fitnessGoals,
          dietaryPreferences: profileData.dietaryPreferences,
        };

        const preferencesResponse = await userService.updateProfile(
          preferencesUpdate
        );
        if (!preferencesResponse.success) {
          console.warn(
            "Failed to update goals/diet:",
            preferencesResponse.error
          );
          // Continue anyway - these are not critical
        }
      }

      // 4. Fourth update: Height and weight
      if (
        updateSuccess &&
        (profileData.height ||
          profileData.weight ||
          profileData.weightGoal ||
          profileData.targetWeight)
      ) {
        const measurementsUpdate = {
          height: profileData.height,
          weight: profileData.weight,
          weightGoal: profileData.weightGoal,
          targetWeight: profileData.targetWeight,
        };

        const measurementsResponse = await userService.updateProfile(
          measurementsUpdate
        );
        if (!measurementsResponse.success) {
          console.warn(
            "Failed to update measurements:",
            measurementsResponse.error
          );
          // Continue anyway - these are not critical
        }
      }

      // 5. Fifth update: Other settings (including motivation and nutrition plan)
      if (updateSuccess && profileData.otherSettings) {
        const settingsUpdate = {
          otherSettings: profileData.otherSettings,
          // Add dedicated nutrition fields
          dailyCalorieGoal: profileData.dailyCalorieGoal,
          proteinGoal: profileData.proteinGoal,
          carbsGoal: profileData.carbsGoal,
          fatGoal: profileData.fatGoal,
        };

        const settingsResponse = await userService.updateProfile(
          settingsUpdate
        );
        if (!settingsResponse.success) {
          console.warn(
            "Failed to update other settings:",
            settingsResponse.error
          );
          // Continue anyway - these are not critical
        }
      }

      // If at least the basic update was successful, consider onboarding complete
      if (updateSuccess) {
        // Update local user state
        if (user) {
          // Get fresh user data from profile
          const userResponse = await userService.getProfile();
          if (userResponse.success && userResponse.user) {
            setUser({
              ...user,
              ...userResponse.user,
              profileSetupComplete: true,
            });
          } else {
            // Fallback to just marking profileSetupComplete
            setUser({
              ...user,
              profileSetupComplete: true,
            });
          }
        }
      }

      return updateSuccess;
    } catch (error) {
      console.error("Error saving user data:", error);
      throw error;
    }
  };

  const handleBack = () => {
    if (showPlanReadyScreen) {
      // Go back to loading screen
      setShowPlanReadyScreen(false);
      setShowLoadingScreen(true);
    } else if (showLoadingScreen) {
      // Go back to last onboarding step
      setShowLoadingScreen(false);
    } else if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else {
      navigation.goBack();
    }
  };

  // Determine which component to render
  const renderContent = () => {
    // During loading and plan ready screens, show specialized content
    if (showLoadingScreen) {
      return (
        <OnboardingLoadingContent
          onComplete={() => {
            // Save data to API
            saveUserData()
              .then(() => {
                // Transition to plan ready screen
                setShowLoadingScreen(false);
                setShowPlanReadyScreen(true);
                setIsLoading(false);
              })
              .catch((error) => {
                console.error("Error saving user data:", error);
                // Still show the plan ready screen even if there's an error
                setShowLoadingScreen(false);
                setShowPlanReadyScreen(true);
                setIsLoading(false);
              });
          }}
        />
      );
    }

    if (showPlanReadyScreen) {
      return (
        <OnboardingPlanReadyContent
          onDataChange={(data) => {
            // Optional: Handle any data changes from the plan ready screen
          }}
          nutritionData={calculatedPlan}
        />
      );
    }

    // Get the current step configuration
    const currentStepConfig = ONBOARDING_STEPS[currentStep];
    const StepComponent = currentStepConfig.component;

    // Get any initial data for this step
    const initialData = getInitialDataForCurrentStep();

    // Get the weight unit from stats if available for the weight screen
    const weightUnit = onboardingData.stats?.units?.weight || "metric";

    // Pass the weight unit only to the exact weight component
    if (currentStepConfig.id === "exactWeight") {
      return (
        <OnboardingExactWeightContent
          onDataChange={handleDataChange}
          weightUnit={weightUnit}
        />
      );
    }

    // For all other components, pass the standard props
    return (
      <StepComponent
        key={currentStepConfig.id}
        onDataChange={handleDataChange}
        initialData={initialData}
      />
    );
  };

  // Determine if the continue button should be enabled
  const isContinueEnabled = () => {
    if (showLoadingScreen) {
      return false; // Disable during loading
    } else if (showPlanReadyScreen) {
      return true; // Always enabled on plan ready screen
    } else {
      // Default logic for regular onboarding steps
      const stepId = ONBOARDING_STEPS[currentStep].id;
      return stepId === "weightTarget" ? true : !!onboardingData[stepId];
    }
  };

  // Determine button text
  const getButtonText = () => {
    if (showPlanReadyScreen) {
      return "Let's get started!";
    } else if (
      currentStep === ONBOARDING_STEPS.length - 1 &&
      !showLoadingScreen
    ) {
      return "Complete";
    } else {
      return "Continue";
    }
  };

  // Prepare initial data for the current component based on previous steps
  const getInitialDataForCurrentStep = () => {
    // The current step's ID
    const stepId = ONBOARDING_STEPS[currentStep].id;

    // Get any previously saved data for this step
    const savedData = onboardingData[stepId] || {};

    // Special case for exact weight screen - provide a default target weight
    if (stepId === "exactWeight") {
      // Calculate a reasonable target weight based on their current weight and goal
      const currentWeight =
        onboardingData.stats?.weight?.kg ||
        onboardingData.stats?.weight?.lb * 0.453592 ||
        70;
      const weightGoal = onboardingData.weightTarget?.weightGoal || "maintain";
      const heightCm =
        onboardingData.stats?.height?.cm ||
        onboardingData.stats?.height?.ft * 30.48 +
          onboardingData.stats?.height?.in * 2.54 ||
        175;

      // Calculate a target weight if needed
      if (!savedData.exactWeight) {
        if (weightGoal === "lose") {
          // For weight loss, suggest a 10% reduction
          savedData.exactWeight = Math.round(currentWeight * 0.9);
        } else if (weightGoal === "gain") {
          // For weight gain, suggest a 10% increase or BMI of 23, whichever is less
          const targetBmiWeight = Math.round(
            (23 * heightCm * heightCm) / 10000
          );
          const increasedWeight = Math.round(currentWeight * 1.1);
          savedData.exactWeight = Math.min(targetBmiWeight, increasedWeight);
        } else {
          // For maintenance, suggest current weight
          savedData.exactWeight = Math.round(currentWeight);
        }
      }
    }

    return savedData;
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Back Button - Hide on loading/plan screens */}
      {!showLoadingScreen && !showPlanReadyScreen && (
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <View style={styles.backButtonCircle}>
            <Text style={styles.backButtonText}>←</Text>
          </View>
        </TouchableOpacity>
      )}

      {/* Progress Indicator - Hide on plan ready screen */}
      {!showPlanReadyScreen && (
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressIndicator,
                { width: showLoadingScreen ? "42%" : `${progressPercentage}%` },
              ]}
            />
          </View>
        </View>
      )}

      {/* Main Content */}
      <View style={styles.contentContainer}>{renderContent()}</View>

      {/* Next Button - Fixed at the bottom */}
      {!showLoadingScreen && (
        <TouchableOpacity
          style={[
            styles.nextButton,
            (!isContinueEnabled() || isLoading) && styles.disabledButton,
          ]}
          onPress={handleNext}
          disabled={!isContinueEnabled() || isLoading}
        >
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.nextButtonText}>{getButtonText()}</Text>
          )}
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backButton: {
    position: "absolute",
    top: 50,
    left: 20,
    zIndex: 10,
  },
  backButtonCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  backButtonText: {
    fontSize: 18,
    color: "#000000",
  },
  progressContainer: {
    paddingHorizontal: 24,
    marginTop: 80,
  },
  progressBar: {
    height: 4,
    backgroundColor: "#EEEEEE",
    borderRadius: 2,
  },
  progressIndicator: {
    height: 4,
    backgroundColor: "#000000",
    borderRadius: 2,
  },
  contentContainer: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
  },
  nextButton: {
    backgroundColor: "#000000",
    borderRadius: 28,
    height: 56,
    marginHorizontal: 24,
    marginBottom: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    backgroundColor: "#CCCCCC",
  },
  nextButtonText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "600",
  },
});
