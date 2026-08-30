import {
  FEATURED,
  JUST_LISTED,
  PROJECT_BIKES,
  RARE_FINDS,
  SHOPS,
  SOLD,
  UNDER_5K,
} from "@/data/registry";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { formatYear } from "@/lib/formatters";
import { createId } from "@/lib/ids";
import {
  contentTypeForUri,
  extensionForContentType,
  imageUploadBody,
} from "@/lib/image-upload";

export type RegistryListing = {
  id: string;
  make: string;
  model: string;
  price: number;
  year: number;
  image: string;
  viewers: number;
  city?: string;
  mileage?: string;
  description?: string;
  condition?: string;
  status?: "active" | "sold" | "draft";
  isRare?: boolean;
  isProject?: boolean;
  sellerId?: string;
  sellerName?: string;
  sellerType?: string;
  sellerVerified?: boolean;
  sellerMemberSince?: string;
  images?: string[];
};

export type CreateListingInput = {
  year: string;
  make: string;
  model: string;
  mileage?: string;
  price: string;
  description?: string;
  condition: "rideable" | "project";
  location?: string;
  images?: ListingImageInput[];
};

export type ListingImageInput =
  | string
  | {
      uri: string;
      base64?: string;
      mimeType?: string;
    };

export type SoldListing = {
  make: string;
  model: string;
  price: number;
  image: string;
};

export type RegistryShop = {
  id: string;
  slug: string;
  kind?: "shop" | "profile";
  name: string;
  specialty: string;
  builds: number;
  image: string;
  tagline?: string;
  verified?: boolean;
  badges?: string[];
  location?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  appointmentOnly?: boolean;
  buildStyles?: string[];
  listings?: RegistryListing[];
};

export type RegistryData = {
  featured: RegistryListing | null;
  bikesForSale: RegistryListing[];
  partsForSale: RegistryListing[];
  justListed: RegistryListing[];
  under5k: RegistryListing[];
  rareFinds: RegistryListing[];
  projectBikes: RegistryListing[];
  shops: RegistryShop[];
  sold: SoldListing[];
};

type ListingStatus = "active" | "sold" | "draft";

type ListingRow = {
  id: string;
  seller_id: string | null;
  shop_id: string | null;
  year: number | null;
  make: string | null;
  model: string | null;
  price: number | null;
  mileage: string | null;
  description: string | null;
  condition: string | null;
  location: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  viewer_count: number | null;
  status: ListingStatus | null;
  is_featured: boolean | null;
  is_rare: boolean | null;
  is_project: boolean | null;
  created_at: string | null;
  seller_name: string | null;
  seller_type: string | null;
  seller_verified: boolean | null;
  seller_member_since: string | null;
};

type ShopRow = {
  id: string;
  slug: string | null;
  name: string | null;
  specialty: string | null;
  builds_count: number | null;
  image_url: string | null;
  tagline: string | null;
  verified: boolean | null;
  badges: string[] | null;
  location: string | null;
  address: string | null;
  phone: string | null;
  email: string | null;
  website: string | null;
  appointment_only: boolean | null;
  build_styles: string[] | null;
};

type ProfileBuilderRow = {
  id: string;
  full_name: string | null;
  handle: string | null;
  city: string | null;
  role: string | null;
  garage_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  bio: string | null;
  is_verified: boolean | null;
  bikes_count: number | null;
  created_at: string | null;
};

const fallbackRegistryData: RegistryData = {
  featured: FEATURED,
  bikesForSale: [FEATURED, ...JUST_LISTED, ...UNDER_5K, ...RARE_FINDS, ...PROJECT_BIKES],
  partsForSale: [],
  justListed: JUST_LISTED,
  under5k: UNDER_5K,
  rareFinds: RARE_FINDS,
  projectBikes: PROJECT_BIKES,
  shops: SHOPS,
  sold: SOLD,
};

function listingFromRow(row: ListingRow): RegistryListing {
  return {
    id: row.id,
    year: row.year ?? new Date().getFullYear(),
    make: row.make ?? "UNKNOWN",
    model: row.model ?? "Unknown",
    price: row.price ?? 0,
    image: row.image_url ?? "",
    viewers: row.viewer_count ?? 0,
    city: row.location ?? undefined,
    mileage: row.mileage ?? undefined,
    description: row.description ?? undefined,
    condition: row.condition ?? undefined,
    status: row.status ?? "active",
    isRare: Boolean(row.is_rare),
    isProject: Boolean(row.is_project),
    sellerId: row.seller_id ?? row.shop_id ?? undefined,
    sellerName: row.seller_name ?? undefined,
    sellerType: row.seller_type ?? undefined,
    sellerVerified: row.seller_verified ?? undefined,
    sellerMemberSince: row.seller_member_since ?? undefined,
    images:
      row.image_urls && row.image_urls.length > 0
        ? row.image_urls
        : row.image_url
          ? [row.image_url]
          : [],
  };
}

function shopFromRow(row: ShopRow): RegistryShop {
  return {
    id: row.id,
    slug: row.slug ?? row.id,
    kind: "shop",
    name: row.name ?? "Builder",
    specialty: row.specialty ?? "Motorcycles",
    builds: row.builds_count ?? 0,
    image: row.image_url ?? "",
    tagline: row.tagline ?? undefined,
    verified: Boolean(row.verified),
    badges: row.badges ?? [],
    location: row.location ?? undefined,
    address: row.address ?? undefined,
    phone: row.phone ?? undefined,
    email: row.email ?? undefined,
    website: row.website ?? undefined,
    appointmentOnly: Boolean(row.appointment_only),
    buildStyles: row.build_styles ?? [],
  };
}

function builderFromProfile(row: ProfileBuilderRow): RegistryShop {
  const name = row.garage_name || row.full_name || row.handle || "Seller";
  return {
    id: row.id,
    slug: row.id,
    kind: "profile",
    name,
    specialty: row.bio || "Private seller",
    builds: row.bikes_count ?? 0,
    image: "",
    tagline: row.city ? `${row.city} seller` : "Seller profile",
    verified: Boolean(row.is_verified),
    badges: row.role === "builder" ? ["builder"] : ["seller"],
    location: row.city ?? undefined,
    email: row.contact_email ?? undefined,
    phone: row.phone ?? undefined,
    website: row.website ?? undefined,
  };
}

const LISTING_SELECT =
  "id, seller_id, shop_id, year, make, model, price, mileage, description, condition, location, image_url, image_urls, viewer_count, status, is_featured, is_rare, is_project, created_at, seller_name, seller_type, seller_verified, seller_member_since";

const SHOP_SELECT =
  "id, slug, name, specialty, builds_count, image_url, tagline, verified, badges, location, address, phone, email, website, appointment_only, build_styles";

function digitsOnlyNumber(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  return digits ? Number(digits) : null;
}

function looksLikePart(listing: RegistryListing) {
  const text = [
    listing.make,
    listing.model,
    listing.description,
    listing.condition,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return [
    "part",
    "parts",
    "engine",
    "motor",
    "tank",
    "seat",
    "wheel",
    "wheels",
    "fork",
    "forks",
    "exhaust",
    "carb",
    "carburetor",
    "frame",
    "fairing",
  ].some((term) => text.includes(term));
}

async function uploadListingImages(
  userId: string,
  images: ListingImageInput[],
) {
  const uploaded: string[] = [];

  for (let index = 0; index < images.length; index += 1) {
    const image = images[index];
    const normalized = typeof image === "string" ? { uri: image } : image;
    const uri = normalized.uri?.trim();
    if (!uri) continue;

    if (uri.startsWith("http") && !normalized.base64) {
      uploaded.push(uri);
      continue;
    }

    const contentType = normalized.mimeType ?? contentTypeForUri(uri);
    const extension = extensionForContentType(contentType);
    const storagePath = `${userId}/${createId()}-${index}.${extension}`;
    const uploadBody = await imageUploadBody(uri, normalized);

    const { error } = await supabase.storage
      .from("listing-images")
      .upload(storagePath, uploadBody, {
        contentType,
        upsert: true,
      });

    if (error) throw error;

    const { data } = supabase.storage
      .from("listing-images")
      .getPublicUrl(storagePath);
    uploaded.push(data.publicUrl);
  }

  return uploaded;
}

export async function fetchRegistryData(): Promise<RegistryData> {
  if (!isSupabaseConfigured) return fallbackRegistryData;

  const [listingsResult, shopsResult] = await Promise.all([
    supabase
      .from("listings")
      .select(LISTING_SELECT)
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("shops")
      .select(SHOP_SELECT)
      .order("name", { ascending: true })
      .limit(20),
  ]);

  if (listingsResult.error || shopsResult.error) {
    return fallbackRegistryData;
  }

  const listingRows = (listingsResult.data ?? []) as ListingRow[];
  const shopRows = (shopsResult.data ?? []) as ShopRow[];

  const activeRows = listingRows.filter((row) => row.status !== "sold");
  const soldRows = listingRows.filter((row) => row.status === "sold");
  const activeListings = activeRows.map(listingFromRow);
  const bikeListings = activeListings.filter((listing) => !looksLikePart(listing));
  const partListings = activeListings.filter(looksLikePart);
  const under5kRows = activeRows.filter((row) => (row.price ?? 0) < 5000);
  const rareRows = activeRows.filter((row) => row.is_rare);
  const projectRows = activeRows.filter((row) => row.is_project);
  const shops = shopRows.map(shopFromRow);
  const featuredRow =
    activeRows.find((row) => row.is_featured) ?? activeRows[0] ?? null;
  const sold =
    soldRows.length > 0
      ? soldRows.slice(0, 10).map((row) => ({
          make: row.make ?? "UNKNOWN",
          model: row.model ?? "Unknown",
          price: row.price ?? 0,
          image: row.image_url ?? "",
        }))
      : [];

  if (bikeListings.length === 0) {
    return {
      ...fallbackRegistryData,
      shops: shops.length > 0 ? shops : fallbackRegistryData.shops,
      sold: sold.length > 0 ? sold : fallbackRegistryData.sold,
    };
  }

  return {
    featured: featuredRow ? listingFromRow(featuredRow) : null,
    bikesForSale: bikeListings,
    partsForSale: partListings.slice(0, 12),
    justListed: activeRows.slice(0, 4).map(listingFromRow),
    under5k: under5kRows.slice(0, 3).map(listingFromRow),
    rareFinds: rareRows.slice(0, 8).map(listingFromRow),
    projectBikes: projectRows.slice(0, 3).map(listingFromRow),
    shops,
    sold,
  };
}

export async function fetchListings(): Promise<RegistryListing[]> {
  if (!isSupabaseConfigured) {
    return [
      ...JUST_LISTED,
      ...UNDER_5K,
      ...RARE_FINDS,
      ...PROJECT_BIKES,
    ].map((item) => ({ ...item, status: "active" }));
  }

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .in("status", ["active", "sold"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return [];
  return ((data ?? []) as ListingRow[]).map(listingFromRow);
}

export async function fetchMyListings(): Promise<RegistryListing[]> {
  if (!isSupabaseConfigured) return [];

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) return [];

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", user.id)
    .in("status", ["active", "sold", "draft"])
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) return [];
  return ((data ?? []) as ListingRow[]).map(listingFromRow);
}

export async function createListing(input: CreateListingInput): Promise<RegistryListing> {
  if (!isSupabaseConfigured) {
    throw new Error("Supabase is not configured.");
  }

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in before creating a listing.");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, handle, role, garage_name, contact_email, is_verified, created_at, city")
    .eq("id", user.id)
    .maybeSingle<{
      full_name: string | null;
      handle: string | null;
      role: string | null;
      garage_name: string | null;
      contact_email: string | null;
      is_verified: boolean | null;
      created_at: string | null;
      city: string | null;
    }>();

  const images = await uploadListingImages(user.id, input.images ?? []);
  const year = digitsOnlyNumber(input.year);
  const price = digitsOnlyNumber(input.price);
  const location = input.location?.trim() || profile?.city || null;
  const createdYear = formatYear(profile?.created_at);

  const { data, error } = await supabase
    .from("listings")
    .insert({
      seller_id: user.id,
      year,
      make: input.make.trim().toUpperCase(),
      model: input.model.trim(),
      price: price ?? 0,
      mileage: input.mileage?.trim() || null,
      description: input.description?.trim() || null,
      condition: input.condition,
      location,
      image_url: images[0] ?? null,
      image_urls: images,
      status: "active",
      is_project: input.condition === "project",
      seller_name:
        profile?.garage_name ||
        profile?.full_name ||
        profile?.handle ||
        user.email?.split("@")[0] ||
        "Seller",
      seller_type: profile?.role || "seller",
      seller_verified: Boolean(profile?.is_verified),
      seller_member_since: createdYear,
    })
    .select(LISTING_SELECT)
    .single<ListingRow>();

  if (error) throw error;
  return listingFromRow(data);
}

export async function fetchListingById(id: string): Promise<RegistryListing | null> {
  if (!isSupabaseConfigured) {
    const fallback = [
      FEATURED,
      ...JUST_LISTED,
      ...UNDER_5K,
      ...RARE_FINDS,
      ...PROJECT_BIKES,
    ].find((item) => item.id === id);
    return fallback ? { ...fallback, status: "active" } : null;
  }

  const { data, error } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("id", id)
    .maybeSingle<ListingRow>();

  if (error) return null;
  return data ? listingFromRow(data) : null;
}

export async function fetchShops(): Promise<RegistryShop[]> {
  if (!isSupabaseConfigured) return SHOPS;

  const { data, error } = await supabase
    .from("shops")
    .select(SHOP_SELECT)
    .order("name", { ascending: true })
    .limit(100);

  if (error) return [];
  return ((data ?? []) as ShopRow[]).map(shopFromRow);
}

export async function fetchBuilders(): Promise<RegistryShop[]> {
  if (!isSupabaseConfigured) return SHOPS;

  const [profilesResult, shopsResult] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, handle, city, role, garage_name, contact_email, phone, website, bio, is_verified, bikes_count, created_at")
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("shops")
      .select(SHOP_SELECT)
      .order("name", { ascending: true })
      .limit(100),
  ]);

  const profiles = ((profilesResult.data ?? []) as ProfileBuilderRow[]).map(
    builderFromProfile,
  );
  const shops = ((shopsResult.data ?? []) as ShopRow[]).map(shopFromRow);

  if (profilesResult.error && shopsResult.error) return [];
  return [...profiles, ...shops];
}

export async function fetchShopBySlug(slug: string): Promise<RegistryShop | null> {
  if (!isSupabaseConfigured) {
    return SHOPS.find((shop) => shop.slug === slug) ?? null;
  }

  const { data, error } = await supabase
    .from("shops")
    .select(SHOP_SELECT)
    .eq("slug", slug)
    .maybeSingle<ShopRow>();

  if (error) return null;
  if (!data) return null;

  const shop = shopFromRow(data);
  const { data: listingData } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("shop_id", data.id)
    .in("status", ["active", "sold"])
    .order("created_at", { ascending: false })
    .limit(20);

  return {
    ...shop,
    listings: ((listingData ?? []) as ListingRow[]).map(listingFromRow),
  };
}

export async function fetchBuilderProfile(id: string) {
  if (!isSupabaseConfigured) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, handle, city, role, garage_name, contact_email, phone, website, bio, is_verified, member_status, bikes_count, created_at")
    .eq("id", id)
    .maybeSingle<{
      id: string;
      full_name: string | null;
      handle: string | null;
      city: string | null;
      role: string | null;
      garage_name: string | null;
      contact_email: string | null;
      phone: string | null;
      website: string | null;
      bio: string | null;
      is_verified: boolean | null;
      bikes_count: number | null;
      created_at: string | null;
    }>();

  const { data: listingData } = await supabase
    .from("listings")
    .select(LISTING_SELECT)
    .eq("seller_id", id)
    .in("status", ["active", "sold"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (!profile) return null;

  return {
    id: profile.id,
    name: profile.garage_name || profile.full_name || profile.handle || "Builder",
    type: profile.role || "builder",
    city: profile.city || "",
    verified: Boolean(profile.is_verified),
    memberSince: formatYear(profile.created_at),
    bio: profile.bio || "",
    email: profile.contact_email || "",
    phone: profile.phone || "",
    website: profile.website || "",
    listings: ((listingData ?? []) as ListingRow[]).map(listingFromRow),
  };
}
