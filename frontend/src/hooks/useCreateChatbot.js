import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

const buildWidgetKey = (botId) => {
  return `bot_${botId}_widget`;
};

const dispatchBotCreated = (botId) => {
  if (!botId) return;

  localStorage.setItem(SELECTED_BOT_KEY, botId);

  window.dispatchEvent(
    new CustomEvent("nexora:bot-created", {
      detail: {
        botId,
      },
    })
  );

  window.dispatchEvent(
    new CustomEvent("nexora:selected-bot-changed", {
      detail: {
        botId,
      },
    })
  );
};

export default function useCreateChatbot() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getCurrentWorkspace = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("User belum login.");
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        role,
        status,
        workspace:workspaces (
          id,
          name,
          slug,
          plan,
          status
        )
      `
      )
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (membershipError) throw membershipError;

    const workspace = memberships?.[0]?.workspace;

    if (!workspace?.id) {
      throw new Error("Workspace aktif tidak ditemukan.");
    }

    return {
      user,
      workspace,
    };
  };

  const createChatbot = async ({
    name,
    description,
    botType = "customer_support",
    channelType = "website",
    useCase = "customer_support",
  }) => {
    setLoading(true);
    setError("");

    try {
      if (!name?.trim()) {
        throw new Error("Nama chatbot wajib diisi.");
      }

      const { workspace } = await getCurrentWorkspace();

      const botName = name.trim();

      const botId = crypto.randomUUID();
      const flowId = crypto.randomUUID();
      const channelId = crypto.randomUUID();
      const widgetSettingId = crypto.randomUUID();

      const { data: bot, error: botError } = await supabase
        .from("bots")
        .insert({
          id: botId,
          workspace_id: workspace.id,
          name: botName,
          description:
            description?.trim() ||
            `Chatbot for ${useCase.replaceAll("_", " ")} use case.`,
          bot_type: botType,
          status: "active",
          config: {
            useCase,
            createdFrom: "create_chatbot_flow",
          },
        })
        .select()
        .single();

      if (botError) throw botError;

      const { data: flow, error: flowError } = await supabase
        .from("flows")
        .insert({
          id: flowId,
          bot_id: bot.id,
          name: "Answer Customer Queries",
          description:
            "Default support flow for FAQ, issue reporting, and human agent handoff.",
          flow_type: "main",
          status: "published",
          is_default: true,
          version: 1,
          published_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (flowError) throw flowError;

      const startNodeId = crypto.randomUUID();
      const welcomeNodeId = crypto.randomUUID();
      const issueCategoryNodeId = crypto.randomUUID();
      const generalInfoNodeId = crypto.randomUUID();
      const collectEmailNodeId = crypto.randomUUID();
      const humanHandoffNodeId = crypto.randomUUID();

      const nodes = [
        {
          id: startNodeId,
          flow_id: flow.id,
          node_key: "start",
          node_type: "start",
          label: "Start",
          description: "Customer starts a new conversation",
          position_x: 70,
          position_y: 210,
          config: {
            message: "Customer starts a new conversation",
          },
        },
        {
          id: welcomeNodeId,
          flow_id: flow.id,
          node_key: "welcome_message",
          node_type: "message",
          label: "Welcome Message",
          description: `Hi! Welcome to ${botName}. How can we help you today?`,
          position_x: 330,
          position_y: 160,
          config: {
            message: `Hi! Welcome to ${botName}. How can we help you today?`,
          },
        },
        {
          id: issueCategoryNodeId,
          flow_id: flow.id,
          node_key: "issue_category",
          node_type: "single_choice",
          label: "Issue Category",
          description: "Ask customer to choose the topic they need help with.",
          position_x: 650,
          position_y: 150,
          config: {
            question: "What do you need help with?",
            options: ["General Info", "Report Issue", "Talk to Agent"],
          },
        },
        {
          id: generalInfoNodeId,
          flow_id: flow.id,
          node_key: "general_info",
          node_type: "message",
          label: "General Info",
          description:
            "Share website, operating hours, and service information.",
          position_x: 1010,
          position_y: 65,
          config: {
            message:
              "We can help with product information, pricing, support requests, and agent handoff.",
          },
        },
        {
          id: collectEmailNodeId,
          flow_id: flow.id,
          node_key: "collect_email",
          node_type: "text_question",
          label: "Collect Email",
          description:
            "Ask customer email so the team can check related information.",
          position_x: 1010,
          position_y: 230,
          config: {
            question:
              "Please provide your email address so our team can follow up.",
          },
        },
        {
          id: humanHandoffNodeId,
          flow_id: flow.id,
          node_key: "human_handoff",
          node_type: "human_handoff",
          label: "Human Handoff",
          description: "Send conversation to available support agent.",
          position_x: 1010,
          position_y: 395,
          config: {
            message:
              "Please wait a moment. We are connecting you to an available support agent.",
            handoff_target: "support_agent",
          },
        },
      ];

      const { error: nodeError } = await supabase
        .from("flow_nodes")
        .insert(nodes);

      if (nodeError) throw nodeError;

      const edges = [
        {
          id: crypto.randomUUID(),
          flow_id: flow.id,
          source_node_id: startNodeId,
          target_node_id: welcomeNodeId,
          label: "Next",
          condition: {},
        },
        {
          id: crypto.randomUUID(),
          flow_id: flow.id,
          source_node_id: welcomeNodeId,
          target_node_id: issueCategoryNodeId,
          label: "Next",
          condition: {},
        },
        {
          id: crypto.randomUUID(),
          flow_id: flow.id,
          source_node_id: issueCategoryNodeId,
          target_node_id: generalInfoNodeId,
          label: "General Info",
          condition: {
            option: "General Info",
          },
        },
        {
          id: crypto.randomUUID(),
          flow_id: flow.id,
          source_node_id: issueCategoryNodeId,
          target_node_id: collectEmailNodeId,
          label: "Report Issue",
          condition: {
            option: "Report Issue",
          },
        },
        {
          id: crypto.randomUUID(),
          flow_id: flow.id,
          source_node_id: issueCategoryNodeId,
          target_node_id: humanHandoffNodeId,
          label: "Talk to Agent",
          condition: {
            option: "Talk to Agent",
          },
        },
      ];

      const { error: edgeError } = await supabase
        .from("flow_edges")
        .insert(edges);

      if (edgeError) throw edgeError;

      const { error: channelError } = await supabase.from("channels").insert({
        id: channelId,
        bot_id: bot.id,
        name: channelType === "whatsapp" ? "WhatsApp" : "Website",
        channel_type: channelType,
        provider: channelType === "whatsapp" ? "waba" : "web_widget",
        status: channelType === "website" ? "active" : "setup_needed",
        config: {
          createdFrom: "create_chatbot_flow",
        },
      });

      if (channelError) throw channelError;

      const { data: widgetSetting, error: widgetError } = await supabase
        .from("widget_settings")
        .insert({
          id: widgetSettingId,
          bot_id: bot.id,
          widget_key: buildWidgetKey(bot.id),
          title: botName,
          subtitle: "Online",
          greeting_message: `Hi! Welcome to ${botName}. How can we help you today?`,
          primary_color: "#2563eb",
          position: "bottom-right",
          is_active: channelType === "website",
          config: {
            createdFrom: "create_chatbot_flow",
          },
        })
        .select()
        .single();

      if (widgetError) throw widgetError;

      dispatchBotCreated(bot.id);

      return {
        bot,
        flow,
        widgetSetting,
      };
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create chatbot.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createChatbot,
  };
}