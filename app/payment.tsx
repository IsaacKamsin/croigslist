import { PaymentMembershipSheet } from "@/components/PaymentMembershipSheet";
import { S } from "@/constants/styles";
import { View } from "react-native";

export default function PaymentScreen() {
  return (
    <View style={S.screenContainer}>
      <PaymentMembershipSheet />
    </View>
  );
}
