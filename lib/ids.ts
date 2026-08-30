import uuid from "react-native-uuid";

export function createId() {
  return String(uuid.v4());
}
