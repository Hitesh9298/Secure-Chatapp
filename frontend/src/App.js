import React, { useState, useEffect } from "react";
import ChatRoom from "./components/ChatRoom";
import Sidebar from "./components/Sidebar";
import Login from "./components/Login";
import Register from "./components/Register";
import LandingPage from "./components/LandingPage";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";


export default function App() {
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("landing");
  const [currentChat, setCurrentChat] = useState({ type: "room", target: "general" });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const username = localStorage.getItem("username");
    if (token && username) {
      console.log("✅ Existing session found for:", username);
      setUser({ username });
      setPage("chat");
    }
  }, []);

  const handleRegister = (username) => {
    console.log("✅ Registration complete for:", username);
    setUser({ username });
    setPage("chat");
  };

  const handleLogin = (username) => {
    console.log("✅ Login complete for:", username);
    setUser({ username });
    setPage("chat");
  };

  const handleLogout = () => {
    console.log("🚪 Logging out:", user?.username);
    localStorage.clear();
    setUser(null);
    setPage("landing");
    setCurrentChat({ type: "room", target: "general" });
  };

  const handleChatChange = (chat) => {
    console.log("💬 Switching to:", chat);
    setCurrentChat(chat);
  };

  if (page === "landing") {
    return (
      <>
        <LandingPage
          onLogin={() => setPage("login")}
          onRegister={() => setPage("register")}
        />
        <ToastContainer position="top-right" autoClose={2500} theme="colored" />
      </>
    );
  }

  if (page === "register") {
    return (
      <>
        <Register
          onRegister={handleRegister}
          onSwitch={() => setPage("login")}
          onBack={() => setPage("landing")}
        />
        <ToastContainer position="top-right" autoClose={2500} theme="colored" />
      </>
    );
  }

  if (page === "login") {
    return (
      <>
        <Login
          onLogin={handleLogin}
          onSwitch={() => setPage("register")}
          onBack={() => setPage("landing")}
        />
        <ToastContainer position="top-right" autoClose={2500} theme="colored" />
      </>
    );
  }

  if (page === "chat" && user) {
    return (
      <>
        <div className="flex h-screen bg-gray-100">
          <Sidebar
            username={user.username}
            onLogout={handleLogout}
            currentChat={currentChat}
            onChatChange={handleChatChange}
          />
          <ChatRoom
            username={user.username}
            currentChat={currentChat}
            onChatChange={handleChatChange}
          />
        </div>
        <ToastContainer position="top-right" autoClose={2500} theme="colored" />
      </>
    );
  }

  return null;
}
