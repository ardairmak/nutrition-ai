export type RootStackParamList = {
  Home: undefined;
  Login: undefined;
  Verification: { email: string };
  Onboarding: undefined;
  OnboardingNew: undefined;
  OnboardingGender: undefined;
  OnboardingWorkout: undefined;
  OnboardingName: undefined;
  OnboardingStats: undefined;
  OnboardingDiet: undefined;
  OnboardingAccomplish: undefined;
  OnboardingGoals: undefined;
  OnboardingWeightTarget: undefined;
  OnboardingMotivation: undefined;
  OnboardingLoading: undefined;
  OnboardingPlanReady: undefined;
  AuthRedirect: undefined;
  Register: undefined;
  ForgotPassword: undefined;
  MainTabs: undefined;
  Camera: { mealType: string };
  Friends: undefined;
  EditProfile: undefined;
  EditGoals: undefined;
  DietaryPreferences: undefined;
  Allergies: undefined;
  ActivityLevel: undefined;
  NotificationSettings: undefined;
  FriendProfile: { friend: Friend };
  AIChat: undefined;
};

export type MainTabsParamList = {
  Dashboard: undefined;
  Journal: undefined;
  AddEntry: undefined;
  Progress: { openWeightModal?: boolean } | undefined;
  Profile: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type MainStackParamList = {
  Home: undefined;
  Profile: undefined;
  Settings: undefined;
  OnboardingNew: undefined;
};

export type Friend = {
  id: string;
  firstName: string;
  lastName: string;
  profilePicture?: string;
  email?: string;
};
