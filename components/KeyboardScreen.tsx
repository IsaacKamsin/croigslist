import { PropsWithChildren } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  type StyleProp,
  type ViewStyle,
} from "react-native";

type KeyboardScreenProps = PropsWithChildren<{
  style?: StyleProp<ViewStyle>;
  keyboardVerticalOffset?: number;
}>;

export const keyboardScrollProps = {
  keyboardDismissMode: Platform.OS === "ios" ? "interactive" : "on-drag",
  keyboardShouldPersistTaps: "handled",
  automaticallyAdjustKeyboardInsets: Platform.OS === "ios",
} as const;

export function KeyboardScreen({
  children,
  style,
  keyboardVerticalOffset = 72,
}: KeyboardScreenProps) {
  return (
    <KeyboardAvoidingView
      style={style}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={Platform.OS === "ios" ? keyboardVerticalOffset : 0}
    >
      {children}
    </KeyboardAvoidingView>
  );
}
