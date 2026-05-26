import {
  Home,
  Bot,
  Inbox,
  BarChart3,
  Settings,
  HelpCircle,
  MoreHorizontal,
} from "../lib/icons";

export const APP_NAME = "Nexora AI Studio";

export const APP_TAGLINE =
  "Build AI chatbots, automate conversations, and scale customer engagement.";

export const sidebarItems = [
  { key: "home", label: "Home", icon: Home },
  { key: "chatbot", label: "Chatbot", icon: Bot },
  { key: "inbox", label: "Inbox", icon: Inbox },
  { key: "analytics", label: "Analytics", icon: BarChart3 },
  { key: "settings", label: "Settings", icon: Settings },
  { key: "help", label: "Help Center", icon: HelpCircle },
  { key: "more", label: "More", icon: MoreHorizontal },
];

export const botFlows = [
  {
    id: 1,
    name: "University / College Bot",
    messages: 17,
    created: "May 13th, 2026 07:09 PM",
    modified: "May 13th, 2026 07:09 PM",
    default: false,
  },
  {
    id: 2,
    name: "Answer Customer Queries",
    messages: 7,
    created: "May 11th, 2026 05:43 PM",
    modified: "May 13th, 2026 07:04 PM",
    default: true,
  },
];