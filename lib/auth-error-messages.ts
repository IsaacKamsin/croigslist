export function getAuthErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowerMessage = message.toLowerCase();

  if (!message) {
    return "Could not sign in. Check your email and password, then try again.";
  }

  if (
    lowerMessage.includes("invalid login credentials") ||
    lowerMessage.includes("invalid credentials")
  ) {
    return "That email or password is not right. Check both and try again.";
  }

  if (
    lowerMessage.includes("email not confirmed") ||
    lowerMessage.includes("email_not_confirmed") ||
    lowerMessage.includes("not confirmed")
  ) {
    return "Verify your email first, then come back and sign in.";
  }

  if (
    lowerMessage.includes("missing exp") ||
    lowerMessage.includes("jwt") ||
    lowerMessage.includes("session")
  ) {
    return "Your sign-in session expired. Open the latest email link or sign in again.";
  }

  if (
    lowerMessage.includes("network") ||
    lowerMessage.includes("fetch") ||
    lowerMessage.includes("failed to fetch")
  ) {
    return "Could not reach Croigslist. Check your connection and try again.";
  }

  if (
    lowerMessage.includes("missing expo_public_supabase") ||
    lowerMessage.includes("supabase is not configured")
  ) {
    return "Login is not configured in this build. Install the latest build and try again.";
  }

  if (lowerMessage.includes("rate limit") || lowerMessage.includes("too many")) {
    return "Too many attempts. Wait a minute, then try again.";
  }

  return message;
}

export function getSignupErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowerMessage = message.toLowerCase();

  if (!message) {
    return "Could not create your account. Check the fields and try again.";
  }

  if (
    lowerMessage.includes("invalid, expired, or already used") ||
    lowerMessage.includes("valid invite required")
  ) {
    return "That invite code is invalid, expired, or already used.";
  }

  if (lowerMessage.includes("already registered") || lowerMessage.includes("already exists")) {
    return "That email already has an account. Sign in instead.";
  }

  if (lowerMessage.includes("password")) {
    return "Use a password with at least 6 characters.";
  }

  if (lowerMessage.includes("email")) {
    return "Enter a valid email address.";
  }

  return getAuthErrorMessage(error);
}

export function getCallbackErrorMessage(error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "string"
        ? error
        : "";
  const lowerMessage = message.toLowerCase();

  if (
    lowerMessage.includes("redirect") ||
    lowerMessage.includes("invalid request") ||
    lowerMessage.includes("callback")
  ) {
    return "This verification link is not valid for this app build. Ask for a new invite link.";
  }

  return getAuthErrorMessage(error);
}
