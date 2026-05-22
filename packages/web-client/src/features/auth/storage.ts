import type { ProfileUser } from "@/features/auth/api";
import { publicUserProfileSchema } from "../../../../server/user/user.schema";

const PROFILE_STORAGE_KEY = "metavault.profile";

export function readCachedProfile(): ProfileUser | null {
  try {
    const stored = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!stored) return null;
    return publicUserProfileSchema.parse(JSON.parse(stored));
  } catch {
    localStorage.removeItem(PROFILE_STORAGE_KEY);
    return null;
  }
}

export function writeCachedProfile(profile: ProfileUser) {
  localStorage.setItem(
    PROFILE_STORAGE_KEY,
    JSON.stringify(publicUserProfileSchema.parse(profile))
  );
}

export function clearAuthStorage() {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
  localStorage.removeItem("metavault.authenticated");
  localStorage.removeItem("metavault.user");
  localStorage.removeItem("metavault.username");
  localStorage.removeItem("metavault.email");
}
