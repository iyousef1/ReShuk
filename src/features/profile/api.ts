import { AppUser } from "@/src/types/user";

export async function getProfile(): Promise<AppUser> {
  return Promise.resolve({ id: "u1", name: "Yousef", email: "yousef@example.com" });
}