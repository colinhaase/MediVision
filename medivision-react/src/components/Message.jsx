import { useState, useRef, useEffect } from "react";
import { FiSend, FiImage } from "react-icons/fi";

function Message({ setUser, setAI, callBackend }) {
  // ===== State =====
  // Text aus dem Eingabefeld
  const [question, setQuestion] = useState("");

  // Ausgewählte Bilddatei
  const [image, setImage] = useState(null);

  // URL für die Bildvorschau
  const [preview, setPreview] = useState(null);

  // Referenz auf das File-Input-Feld
  const fileInputRef = useRef(null);

  // ===== Effects =====
  // Lerrt die Preview sobald "image" leer ist
  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }

    // Temporäre URL für das Bild erzeugen
    const objectUrl = URL.createObjectURL(image);
    setPreview(objectUrl);
  }, [image]);

  // ===== Event Handler =====
  // Formular absenden
  function send(e) {
    e.preventDefault();

    // Nichts senden, wenn kein Text und kein Bild vorhanden ist
    if (!question && !image) return;

    // User-Nachricht sofort im UI anzeigen
    setUser({
      text: question,
      image: preview,
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit"
      }),
    });

    // Anfrage an Backend schicken
    getAnswer();

    // Eingaben zurücksetzen
    setQuestion("");
    setImage(null);
    fileInputRef.current.value = null;
  }

  // ===== API Call =====
  function getAnswer() {
    callBackend("n8nChat", {
      user: question,
      image: image,
    })
      .then((r) => r.json())
      .then((json) => {
        setAI({
          text: json.answer,
          time: new Date().toLocaleTimeString("en-GB", {
            hour: "2-digit",
            minute: "2-digit"
          }),
        });
      });
  }

  // ===== Render =====
  return (
    <form onSubmit={send}>
      <fieldset id="userInput">
        {/* Bildvorschau */}
        <div className="preview">
          {preview && (
            <img
              src={preview}
              alt="preview"
              className="preview-images images"
            />
          )}
        </div>

        <div className="input">
          {/* Bildauswahl */}
          <button
            type="button"
            onClick={() => fileInputRef.current && fileInputRef.current.click()}
            className="button1"
          >
            <FiImage size={25} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0] || null)}
            style={{ display: "none" }}
          />
          {/* Texteingabe */}
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />

          <button type="submit" className="button1">
            <FiSend size={25} />
          </button>
        </div>
      </fieldset>
    </form>
  );
}

export default Message;
