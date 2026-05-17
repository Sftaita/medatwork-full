import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import profileAccountApi, {
  type ProfileAccount,
  type ProfileAccountPatch,
} from "../services/profileAccountApi";
import { useAuthStore } from "../store/authStore";
import useAxiosPrivate from "./useAxiosPrivate";

const QUERY_KEY = ["profile-account"] as const;

/** Fetches the authenticated user's profile data. */
export function useProfileAccount() {
  useAxiosPrivate();

  return useQuery<ProfileAccount>({
    queryKey: QUERY_KEY,
    queryFn:  () => profileAccountApi.getAccount(),
    staleTime: 1000 * 60 * 5,  // 5 min — profile changes rarely
    retry: 1,
  });
}

/** Mutation for updating personal info. Updates cache and auth store on success. */
export function useUpdateProfileAccount() {
  const qc                = useQueryClient();
  const setAuthentication = useAuthStore((s) => s.setAuthentication);

  return useMutation({
    mutationFn: (patch: ProfileAccountPatch) => profileAccountApi.patchAccount(patch),
    onSuccess: (data) => {
      qc.setQueryData<ProfileAccount>(QUERY_KEY, data);
      // Sync name + avatar into authStore so Topbar reflects changes immediately
      setAuthentication((prev) => ({
        ...prev,
        firstname: data.firstname,
        lastname:  data.lastname,
        ...(data.avatarUrl !== undefined ? { avatarUrl: data.avatarUrl } : {}),
      }));
    },
  });
}

/** Mutation for changing the password. No cache interaction needed. */
export function useChangePassword() {
  return useMutation({
    mutationFn: profileAccountApi.patchPassword,
  });
}
