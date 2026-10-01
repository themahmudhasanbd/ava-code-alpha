import { createFileRoute } from "@tanstack/react-router";
import { ChatScreen } from "@/components/chat/chat-screen";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AvA Code — AI Coding Workspace" },
      { name: "description", content: "Chat with your AvA coding agent and manage sessions by project." },
      { property: "og:title", content: "AvA Code — AI Coding Workspace" },
      { property: "og:description", content: "Chat with your AvA coding agent and manage sessions by project." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ChatScreen,
});
