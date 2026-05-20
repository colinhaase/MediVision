import express from "express";
import multer from "multer";

import dotenv from "dotenv";
dotenv.config();

// ===== Router erstellen =====
const n8nChat = express.Router();

// Multer verarbeitet Bild-Uploads
const upload = multer();

// ===== Chat Route =====
n8nChat.post("/", upload.single("image"), async (req, res) => {
  try {
    // ===== Daten vom Frontend =====
    const { user, UUID } = req.body;

    // Hochgeladenes Bild
    const file = req.file;

    // ===== Daten für n8n vorbereiten =====
    const formData = new FormData();

    formData.append("sessionID", UUID);
    formData.append("user", user);

    // Chat soll nicht gelöscht werden
    formData.append("deletion", "false");

    // ===== Optional Bild anhängen =====
    if (file) {
      // Bilddatei hinzufügen
      formData.append(
        "image",
        new Blob([file.buffer], { type: file.mimetype }),
        file.originalname,
      );

      // Zusatzinformation für Bildanalyse
      formData.append(
        "imageText",
        "analysire das bild nach den gegebenen anweisungen",
      );
    }

    // ===== Anfrage an n8n senden =====
    const response = await fetch(process.env.N8N_URL, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: process.env.N8N_KEY,
      },
      body: formData,
    });

    // Fehlerbehandlung falls n8n fehlschlägt
    if (!response.ok) {
      const errorText = await response.text();

      console.log(errorText);

      throw new Error("n8n error");
    }

    // Antwort von n8n auslesen
    const answer = await response.json();

    // Antwort an Frontend senden
    res.json(answer);
  } catch (error) {
    console.error(error);

    res.json({
      answer: `${error}`,
    });
  }
});

export default n8nChat;
