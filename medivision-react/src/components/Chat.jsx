import Markdown from "react-markdown";

import { SyncLoader as Loader } from "react-spinners";

function Chat({ chat, waitForResponse }) {
  // ===== Zeitformatierung =====
  // Wandelt Sekunden in Minuten:Sekunden um
  // Beispiel: 125 -> 2:05
  function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = (seconds % 60).toString().padStart(2, "0");

    return `${min}:${sec}`;
  }

  return (
    <>
      {/* Alle Nachrichten aus dem Chat anzeigen */}
      {chat.map((msg, index) => (
        <div key={index} className={msg.sender}>
          {/* Optionales Bild anzeigen */}
          {msg.image && (
            <img
              src={msg.image}
              alt="uploaded"
              className="chat-images images"
            />
          )}

          {/* Nachrichtentext anzeigen */}
          {msg.text && (
            <div className="markdown-container text">
              <Markdown>{msg.text}</Markdown>

              {/* Optionaler Countdown */}
              {typeof msg.remaining === "number" && (
                <span>
                  {msg.remaining > 0
                    ? ` (${formatTime(msg.remaining)})`
                    : " (abgelaufen)"}
                </span>
              )}
            </div>
          )}

          {/* Uhrzeit der Nachricht */}
          <div className="time">{msg.time}</div>
        </div>
      ))}

      {/* Ladeanimation während AI antwortet */}
      {waitForResponse && (
        <div className="animation">
          <Loader size="10" speedMultiplier={0.75} margin={3} color="#cdd6f4" />
        </div>
      )}
    </>
  );
}

export default Chat;
