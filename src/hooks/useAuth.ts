import { useState } from "react";

import { AppUser } from "@/src/types/user";

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>({
    id: "u1",
    name: "Yousef",
    email: "yousef@example.com",
  });

  function logout() {
    setUser(null);
  }

  return { user, isAuthenticated: !!user, logout };
}