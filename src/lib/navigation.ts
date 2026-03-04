export const routes = {
  home: "/(tabs)/home",
  search: "/(tabs)/search",
  sell: "/(tabs)/sell",
  inbox: "/(tabs)/inbox",
  profile: "/(tabs)/profile",
  login: "/(auth)/login",
  register: "/(auth)/register",
} as const;

export function listingDetailsPath(id: string) {
  return `/(tabs)/home/${id}` as const;
}