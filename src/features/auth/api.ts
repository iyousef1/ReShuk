import { AppUser } from "@/src/types/user";

export async function signIn(email: string, password: string): Promise<AppUser> {
  return Promise.resolve({ id: "u1", name: "Yousef", email });
}

export async function signUp(name: string, email: string, password: string): Promise<AppUser> {
  return Promise.resolve({ id: "u1", name, email });
}