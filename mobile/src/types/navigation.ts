export type RootStackParamList = {
  Auth: undefined;
  Main: undefined;
  AuthRedirect: { token?: string };
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
