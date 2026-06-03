import { useMutation } from "@tanstack/react-query";
import { sendAssistantMessage } from "./api";

export function useAssistantChat() {
  return useMutation({
    mutationFn: sendAssistantMessage,
  });
}
