import { useEffect, useState } from "react";

import { Listing } from "@/src/types/listing";
import { getListings } from "./api";

export function useListings() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getListings()
      .then(setListings)
      .finally(() => setLoading(false));
  }, []);

  return { listings, loading };
}