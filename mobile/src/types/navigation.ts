export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
  Verification: {
    email: string;
  };
  OnboardingNew: undefined;
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
};
