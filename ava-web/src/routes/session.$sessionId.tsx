import { createFileRoute, redirect } from "@tanstack/react-router";
import { useEffect } from "react";
import { ChatScreen } from "@/components/chat/chat-screen";
import { useAva } from "@/state/ava-provider";

function SessionRoute() {
  const { sessionId } = Route.useParams();
  const { setActiveSessionId, auth } = useAva();

  useEffect(() => {
    if (sessionId) {
      setActiveSessionId(sessionId);
    }
  }, [sessionId, setActiveSessionId]);

  return <ChatScreen />;
}

export const Route = createFileRoute("/session/$sessionId")({
  beforeLoad: ({ context, location }) => {
    // Will be redirected to login if not authenticated — handled in ChatScreen/AvaProvider
  },
  head: () => ({
    meta: [
      { title: "AvA Code — Session" },
      { name: "description", content: "AI coding session" },
    ],
  }),
  component: SessionRoute,
});
