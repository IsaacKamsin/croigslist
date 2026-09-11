import * as ExpoLinking from "expo-linking";
import { Linking as NativeLinking, Platform, Share } from "react-native";
import { formatUsd } from "@/lib/formatters";

const APP_INVITE =
  "Join Croigslist, a marketplace for real motorcycle sellers and serious buyers.";
const APP_INVITE_URL =
  process.env.EXPO_PUBLIC_APP_INVITE_URL ?? ExpoLinking.createURL("/");

export async function shareSellerInvite() {
  await Share.share({
    title: "List a bike on Croigslist",
    url: APP_INVITE_URL,
    message: `${APP_INVITE}\n\nBring a bike, build a garage, and start with real photos.\n\n${APP_INVITE_URL}`,
  });
}

export async function shareBuyerInvite() {
  await Share.share({
    title: "Join Croigslist",
    url: APP_INVITE_URL,
    message: `${APP_INVITE}\n\nFind builders, save bikes, and message sellers directly.\n\n${APP_INVITE_URL}`,
  });
}

export async function shareListing(listing: {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage?: string;
  city?: string;
}) {
  const { title, message, url } = getListingSharePayload(listing);

  await Share.share({
    title,
    url,
    message,
  });
}

function getListingSharePayload(listing: {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage?: string;
  city?: string;
}) {
  const title = `${listing.year} ${listing.make} ${listing.model}`;
  const details = [
    formatUsd(listing.price),
    listing.mileage,
    listing.city,
  ].filter(Boolean).join(" - ");
  const url = ExpoLinking.createURL(`/listing/${listing.id}`);
  const message = `${title}\n${details}\n\nView it on Croigslist:\n${url}`;

  return { title, details, url, message };
}

export async function messageListing(listing: {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage?: string;
  city?: string;
}) {
  const { message } = getListingSharePayload(listing);
  const separator = Platform.OS === "ios" ? "&" : "?";
  const smsUrl = `sms:${separator}body=${encodeURIComponent(message)}`;

  await NativeLinking.openURL(smsUrl);
}

export async function shareListingToWhatsApp(listing: {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage?: string;
  city?: string;
}) {
  const { message } = getListingSharePayload(listing);
  const whatsAppUrl = `whatsapp://send?text=${encodeURIComponent(message)}`;
  const webWhatsAppUrl = `https://wa.me/?text=${encodeURIComponent(message)}`;
  const canOpenWhatsApp = await NativeLinking.canOpenURL(whatsAppUrl);

  await NativeLinking.openURL(canOpenWhatsApp ? whatsAppUrl : webWhatsAppUrl);
}

export async function shareListingToInstagramOrMore(listing: {
  id: string;
  year: number;
  make: string;
  model: string;
  price: number;
  mileage?: string;
  city?: string;
  image?: string;
}) {
  const { title, message, url } = getListingSharePayload(listing);

  await Share.share(
    {
      title,
      url: listing.image || url,
      message,
    },
    {
      dialogTitle: "Share to Instagram or more",
      subject: title,
    },
  );
}
