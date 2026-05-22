import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getProfile,
  logout,
  resendVerificationCode,
  signIn,
  signUp,
  verifyUser,
} from "@/features/auth/api";
import {
  clearAuthStorage,
  readCachedProfile,
  writeCachedProfile,
} from "@/features/auth/storage";
import { queryKeys } from "@/shared/api/queryKeys";
import { isUnauthorizedError } from "@/shared/api/client";

export function useAuthSession() {
  const cachedProfile = readCachedProfile();

  return useQuery({
    queryKey: queryKeys.auth.session,
    queryFn: async () => {
      try {
        const profile = await getProfile();
        writeCachedProfile(profile);
        return profile;
      } catch (error) {
        if (isUnauthorizedError(error)) {
          clearAuthStorage();
          return null;
        }
        throw error;
      }
    },
    initialData: cachedProfile ?? undefined,
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: false,
  });
}

export function useSignIn() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Parameters<typeof signIn>[0]) => {
      await signIn(payload);
      return getProfile();
    },
    onSuccess: (profile) => {
      clearAuthStorage();
      writeCachedProfile(profile);
      queryClient.setQueryData(queryKeys.auth.session, profile);
    },
  });
}

export function useSignUp() {
  return useMutation({
    mutationFn: signUp,
  });
}

export function useVerifyUser() {
  return useMutation({
    mutationFn: verifyUser,
  });
}

export function useResendVerificationCode() {
  return useMutation({
    mutationFn: resendVerificationCode,
  });
}

export function useSignOut() {
  const queryClient = useQueryClient();

  return async () => {
    try {
      await logout();
    } catch {
      // Local cleanup still wins if the cookie is already expired or unreachable.
    }
    clearAuthStorage();
    queryClient.clear();
  };
}
