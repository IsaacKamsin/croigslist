import { Share } from "react-native";

const APP_INVITE =
  "Join Croigslist, a marketplace for real motorcycle sellers and serious buyers.";

export async function shareSellerInvite() {
  await Share.share({
    title: "List a bike on Croigslist",
    message: `${APP_INVITE}\n\nBring a bike, build a garage, and start with real photos.`,
  });
}

export async function shareBuyerInvite() {
  await Share.share({
    title: "Join Croigslist",
    message: `${APP_INVITE}\n\nFind builders, save bikes, and message sellers directly.`,
  });
}
