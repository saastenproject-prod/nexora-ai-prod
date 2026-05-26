import { useEffect, useState } from "react";

import Sidebar from "./components/layout/Sidebar";

import HomeScreen from "./pages/HomeScreen";
import PlatformScreen from "./pages/PlatformScreen";
import UsecaseScreen from "./pages/UsecaseScreen";
import FlowsScreen from "./pages/FlowsScreen";
import BuilderScreen from "./pages/BuilderScreen";
import InstallWidgetScreen from "./pages/InstallWidgetScreen";
import AiSettingsScreen from "./pages/AiSettingsScreen";
import InboxScreen from "./pages/InboxScreen";
import LoginScreen from "./pages/LoginScreen";
import CreateChatbotScreen from "./pages/CreateChatbotScreen";
import AllChatbotsScreen from "./pages/AllChatbotsScreen";

import { supabase } from "./lib/supabaseClient";

export default function App() {
  const [active, setActive] = useState("home");
  const [screen, setScreen] = useState("home");

  const [session, setSession] = useState(null);
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let mounted = true;

    const initSession = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (mounted) {
        setSession(session);
        setCheckingSession(false);
      }
    };

    initSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const navigateToScreen = (nextScreen) => {
  setScreen(nextScreen);

  if (nextScreen === "home") {
    setActive("home");
    return;
  }

  if (
    nextScreen === "platform" ||
    nextScreen === "usecase" ||
    nextScreen === "create-chatbot" ||
    nextScreen === "all-chatbots" ||
    nextScreen === "flows" ||
    nextScreen === "builder" ||
    nextScreen === "install" ||
    nextScreen === "ai-settings"
  ) {
    setActive("chatbot");
    return;
  }

  if (nextScreen === "inbox") {
    setActive("inbox");
    return;
  }

  if (nextScreen === "settings") {
    setActive("settings");
    return;
  }
};

  const handleActive = (key) => {
    setActive(key);

    if (key === "home") setScreen("home");
    if (key === "chatbot") setScreen("flows");
    if (key === "inbox") setScreen("inbox");
    if (key === "settings") setScreen("ai-settings");
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setActive("home");
    setScreen("home");
  };

  const current = (() => {
    if (screen === "platform") return <PlatformScreen setScreen={navigateToScreen} />;
    if (screen === "usecase") return <UsecaseScreen setScreen={navigateToScreen} />;
    if (screen === "create-chatbot")
  return <CreateChatbotScreen setScreen={navigateToScreen} />;
    if (screen === "all-chatbots")
  return <AllChatbotsScreen setScreen={navigateToScreen} />;
    if (screen === "flows")  return <FlowsScreen setScreen={navigateToScreen} />;
    if (screen === "builder")  return <BuilderScreen setScreen={navigateToScreen} />;
    if (screen === "install")
      return <InstallWidgetScreen setScreen={navigateToScreen} />;
    if (screen === "ai-settings")
      return <AiSettingsScreen setScreen={navigateToScreen} />;
    if (screen === "inbox") return <InboxScreen />;

    return <HomeScreen setScreen={navigateToScreen} onLogout={handleLogout} />;
  })();

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-slate-50 grid place-items-center text-slate-600">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-950 text-white grid place-items-center font-black">
            N
          </div>
          <p className="mt-4 text-sm font-bold">Loading Nexora...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return <LoginScreen onLoginSuccess={setSession} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 flex font-sans text-slate-900">
      <Sidebar active={active} setActive={handleActive} />
      <div className="flex-1 min-w-0">{current}</div>
    </div>
  );
}