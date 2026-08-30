import { supabase } from "@/lib/supabase";

export type GarageDetails = {
  garageName: string;
  contactEmail: string;
  phone: string;
  website: string;
  city: string;
  bio: string;
};

type GarageDetailsRow = {
  garage_name: string | null;
  contact_email: string | null;
  phone: string | null;
  website: string | null;
  city: string | null;
  bio: string | null;
};

function clean(value: string) {
  return value.trim() || null;
}

function fromRow(row: GarageDetailsRow | null): GarageDetails {
  return {
    garageName: row?.garage_name ?? "",
    contactEmail: row?.contact_email ?? "",
    phone: row?.phone ?? "",
    website: row?.website ?? "",
    city: row?.city ?? "",
    bio: row?.bio ?? "",
  };
}

export async function fetchGarageDetails(): Promise<GarageDetails> {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  const { data, error } = await supabase
    .from("profiles")
    .select("garage_name, contact_email, phone, website, city, bio")
    .eq("id", user.id)
    .maybeSingle<GarageDetailsRow>();

  if (error) throw error;
  return fromRow(data ?? null);
}

export async function updateGarageDetails(input: GarageDetails) {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError) throw userError;
  if (!user) throw new Error("Sign in required.");

  const { error } = await supabase
    .from("profiles")
    .update({
      garage_name: clean(input.garageName),
      contact_email: clean(input.contactEmail),
      phone: clean(input.phone),
      website: clean(input.website),
      city: clean(input.city) ?? "",
      bio: clean(input.bio),
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) throw error;
}
