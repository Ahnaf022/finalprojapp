export type SignUpResult = {
  userConfirmed?: boolean;
  userId?: string;
  nextStep?: string;
  message?: string;
};

export async function signUpWithEmailPassword(email: string, password: string, displayName?: string): Promise<SignUpResult> {
  return {
    userId: email,
    nextStep: "DONE",
    message: "Mock signup successful",
  };
}

export async function confirmSignUp(email: string, code: string): Promise<void> {
  return;
}

export async function resendSignUpCode(email: string): Promise<void> {
  return;
}

export async function signInWithEmailPassword(email: string, password: string): Promise<any> {
  return {
    email,
    accessToken: "mock-token",
    idToken: "mock-token",
  };
}

export async function signOut(): Promise<void> {
  currentSession = null;
}

export async function getCurrentUser(): Promise<{
  email: string;
  username: string;
  sub: string;
} | null> {
  if (!currentSession) {
    return null;
  }

  return {
    email: currentSession.email,
    username: currentSession.username,
    sub: currentSession.sub,
  };
}

export async function getAccessToken(): Promise<string> {
  return "mock-token";
}

export async function getIdToken(): Promise<string> {
  return "mock-token";
}
