const SEXUAL_HARASSMENT_PATTERNS = [
  /\b(show|send|lemme see|let me see)\s+(me\s+)?(your|ur)\s+(dick|penis|cock|pussy|tits?|boobs?|nudes?)\b/i,
  /\b(how big|size)\s+(is\s+)?(your|ur)\s+(dick|penis|cock)\b/i,
  /\b(dick|penis|cock|pussy|tits?|boobs?|nudes?)\s+(pic|pics|photo|photos|picture|pictures)\b/i,
  /\b(send|show)\s+(nudes?|dick|penis|cock|pussy|tits?|boobs?)\b/i,
];

const ABUSE_PATTERNS = [
  /\b(kill yourself|kys)\b/i,
  /\b(fuck you|fuk you)\b/i,
];

export function getMessageModerationError(message: string) {
  const text = message.trim();
  if (!text) return null;

  if (SEXUAL_HARASSMENT_PATTERNS.some((pattern) => pattern.test(text))) {
    return "Keep messages about the bike. Sexual or harassing messages are not allowed.";
  }

  if (ABUSE_PATTERNS.some((pattern) => pattern.test(text))) {
    return "Keep messages respectful. Harassing or abusive messages are not allowed.";
  }

  return null;
}
