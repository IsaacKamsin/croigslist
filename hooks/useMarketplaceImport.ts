import { supabase } from "@/lib/supabase";

export interface ImportedListing {
  year: string;
  make: string;
  model: string;
  price: string;
  mileage: string;
  description: string;
  condition: string;
  location: string;
  category: string;
  images: string[];
}

export async function importFromUrl(url: string): Promise<ImportedListing> {
  const { data, error } = await supabase.functions.invoke<ImportedListing>(
    "import-listing",
    {
      body: { url },
    },
  );

  if (error) throw error;
  if (!data) throw new Error("Import returned no listing data.");

  return data;
}
