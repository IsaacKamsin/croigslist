/**
 * Haptic feedback utilities
 *
 * Thin wrappers around expo-haptics for consistent use across the app.
 * Call these directly — they're no-ops on Android (graceful fallback built in).
 */
import * as Haptics from "expo-haptics";

/** Light tap — tabs, filters, toggles */
export const hapticLight = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

/** Medium tap — primary CTAs, FABs, important actions */
export const hapticMedium = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

/** Heavy tap — destructive or high-commitment actions */
export const hapticHeavy = () =>
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

/** Selection tick — carousel snaps, picker changes */
export const hapticSelection = () => Haptics.selectionAsync();

/** Success — bike identified, match found */
export const hapticSuccess = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

/** Warning — match toast, attention needed */
export const hapticWarning = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);

/** Error — sign out, destructive confirmation */
export const hapticError = () =>
  Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
