import { StrictMode, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";

import Sidebar from "./components/Sidebar";
import Title from "./components/Title";
import Chat from "./components/Chat";
import Message from "./components/Message";
import Info from "./components/Info";
import Start from "./components/Start";

import "./MediVision.css";

function MediVision() {
  // ===== Eindeutige Sitzungs-ID =====
  // Wird einmal beim Start erstellt und für alle Backend-Anfragen genutzt
  const [UUID] = useState(
    `${new Date().toLocaleTimeString()}/${crypto.randomUUID()}`,
  );

  // ===== Hauptzustände der Anwendung =====
  // chat -> enthält alle Nachrichten
  // user -> letzte gesendete User-Nachricht
  // ai -> letzte AI-Antwort
  const [chat, setChat] = useState([]);
  const [user, setUser] = useState(null);
  const [ai, setAI] = useState(null);

  // rendering -> bestimmt welche Seite angezeigt wird
  // waitForResponse -> zeigt Ladeanimation während Backend antwortet
  const [rendering, setRendering] = useState("");
  const [waitForResponse, setWaitForResponse] = useState(false);

  // ===== Referenzen =====
  // chatRef -> Zugriff auf Chat-Container zum Scrollen
  // isAtBottom -> speichert ob User aktuell unten im Chat ist
  const chatRef = useRef(null);
  const isAtBottom = useRef(true);

  // ===== Backend-Verbindung =====
  const backendURL = import.meta.env.VITE_BACKEND_URL;

  // Sendet Daten an das Backend
  // action -> bestimmt welchen Endpoint das Backend nutzt
  // payload -> optionale Daten wie Text oder Bild
  function callBackend(action, payload = {}) {
    const formData = new FormData();

    formData.append("UUID", UUID);

    Object.entries(payload).forEach(([key, value]) => {
      if (value) formData.append(key, value);
    });

    return fetch(`${backendURL}/${action}`, {
      method: "POST",
      body: formData,
    });
  }

  // ===== Countdown für Nachrichten =====
  // Reduziert jede Sekunde remaining um 1
  // Wird z.B. für Wearable-Codes genutzt
  useEffect(() => {
    const interval = setInterval(() => {
      setChat((prev) =>
        prev.map((msg) =>
          msg.remaining > 0 ? { ...msg, remaining: msg.remaining - 1 } : msg,
        ),
      );
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  // ===== Neue User-Nachricht =====
  // Fügt Nachricht direkt zum Chat hinzu
  // Sperrt Eingaben bis AI geantwortet hat
  useEffect(() => {
    if (!user) return;

    setChat((prev) => [...prev, { sender: "user", ...user }]);

    toggleInputs(true);
    setWaitForResponse(true);
  }, [user]);

  // ===== Neue AI-Antwort =====
  // Fügt AI-Nachricht zum Chat hinzu
  // Aktiviert Eingaben wieder
  useEffect(() => {
    if (!ai) return;

    // Falls neue Wearable-Aktion startet,
    // werden alte Timer sofort beendet
    if (ai.source === "wearable") {
      setChat((prev) =>
        prev.map((msg) => (msg.remaining > 0 ? { ...msg, remaining: 0 } : msg)),
      );
    }

    setChat((prev) => [...prev, { sender: "ai", ...ai }]);

    toggleInputs(false);
    setWaitForResponse(false);
  }, [ai]);

  // ===== Prüft ob User unten im Chat ist =====
  // Wichtig damit automatisches Scrollen
  // den User nicht beim Lesen stört
  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    function handleScroll() {
      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

      isAtBottom.current = distance < 80;
    }

    el.addEventListener("scroll", handleScroll);

    return () => {
      el.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // ===== Automatisches Scrollen =====
  // Scrollt automatisch nach unten wenn:
  // 1. User selbst Nachricht sendet
  // 2. User bereits unten im Chat war
  useEffect(() => {
    const el = chatRef.current;
    if (!el || !chat.length) return;

    const lastMessage = chat[chat.length - 1];

    const shouldScroll = lastMessage.sender === "user" || isAtBottom.current;

    if (!shouldScroll) return;

    el.scrollTo({
      top: el.scrollHeight,
      behavior: lastMessage.sender === "user" ? "smooth" : "auto",
    });
  }, [chat]);

  // ===== Aktiviert oder deaktiviert Eingaben =====
  // Wird genutzt während auf Backend-Antwort gewartet wird
  function toggleInputs(disabled) {
    const userInput = document.getElementById("userInput");
    const sidebarInput = document.getElementById("sidebarInput");

    if (userInput) {
      userInput.disabled = disabled;
    }

    if (sidebarInput) {
      sidebarInput.disabled = disabled;
    }
  }

  // ===== Seiteninhalt rendern =====
  // Zeigt je nach Zustand:
  // Chat, Info-Seite oder Startbildschirm
  function renderContent() {
    switch (rendering) {
      case "chatSeite":
        return (
          <>
            <div className="chat-box">
              <Chat chat={chat} waitForResponse={waitForResponse} />
            </div>

            <div className="input-box">
              <div className="input-field">
                <Message
                  UUID={UUID}
                  setUser={setUser}
                  setAI={setAI}
                  callBackend={callBackend}
                />
              </div>
            </div>
          </>
        );

      case "infoSeite":
        return <Info />;

      default:
        return (
          <div className="chat-box">
            <div className="mittig">
              <Start />
            </div>
          </div>
        );
    }
  }

  // ===== Hauptlayout =====
  return (
    <div className="container">
      <div className="sidebar chatSidebar">
        <Sidebar
          setRendering={setRendering}
          rendering={rendering}
          setAI={setAI}
          setUser={setUser}
          callBackend={callBackend}
          toggleInputs={toggleInputs}
        />
      </div>

      <div className="title">
        <Title />
      </div>

      <div className="chat" ref={chatRef}>
        {renderContent()}
      </div>
    </div>
  );
}

export default MediVision;

createRoot(document.getElementById("medivision")).render(
  <StrictMode>
    <MediVision />
  </StrictMode>,
);
