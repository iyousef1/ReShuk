import { useState } from "react";

import { signIn, signUp } from "./api";

export function useAuthActions() {
  const [loading, setLoading] = useState(false);

  async function login(email: string, password: string) {
    setLoading(true);
    try {
      return await signIn(email, password);
    } finally {
      setLoading(false);
    }
  }

  async function register(name: string, email: string, password: string) {
    setLoading(true);
    try {
      return await signUp(name, email, password);
    } finally {
      setLoading(false);
    }
  }

  return { login, register, loading };
}