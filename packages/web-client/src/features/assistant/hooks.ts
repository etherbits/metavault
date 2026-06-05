import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { queryKeys } from "@/shared/api/queryKeys";
import {
  fetchAssistantSessions,
  saveAssistantSession,
  sendAssistantMessage,
} from "./api";

export function useAssistantChat() {
  return useMutation({
    mutationFn: sendAssistantMessage,
  });
}

export function useAssistantSessions() {
  return useQuery({
    queryKey: queryKeys.assistant.sessions,
    queryFn: fetchAssistantSessions,
  });
}

export function useSaveAssistantSession() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: saveAssistantSession,
    onSuccess: (savedSession) => {
      queryClient.setQueryData(
        queryKeys.assistant.sessions,
        (previous: Awaited<ReturnType<typeof fetchAssistantSessions>> = []) => {
          const next = previous.filter(
            (session) => session.id !== savedSession.id
          );
          return [savedSession, ...next];
        }
      );
    },
  });
}
