import { useEffect, useState } from "react";

import { AppUser } from "@/src/types/user";
import { getProfile } from "./api";

export function useProfile() {
  const [profile, setProfile] = useState<AppUser | null>(null);

  useEffect(() => {
    getProfile().then(setProfile);
  }, []);

  return { profile };
}