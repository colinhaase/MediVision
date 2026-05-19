import express from "express";
import multer from "multer";

import dotenv from "dotenv";
dotenv.config();

// ===== Router erstellen =====
const n8nAnalyse = express.Router();

// Multer verarbeitet FormData ohne Dateien
const upload = multer();

// ===== Analyse Route =====
n8nAnalyse.post("/", upload.none(), async (req, res) => {
  try {
    // UUID der aktuellen Sitzung auslesen
    const { UUID } = req.body;

    // ===== Daten für n8n vorbereiten =====
    const formData = new FormData();

    formData.append("sessionID", UUID);

    // Nachricht an den AI-Workflow
    formData.append(
      "user",
      "Analysiere den Chat wie im Systemprompt beschrieben"
    );

    // Signalisiert dass Chat danach gelöscht werden soll
    formData.append("deletion", "true");

    // ===== Anfrage an n8n senden =====
    const response = await fetch(process.env.N8N_URL, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: process.env.N8N_KEY,
      },
      body: formData,
    });

    // Fehler falls n8n nicht erreichbar
    if (!response.ok) {
      throw new Error("n8n error");
    }

    // Antwort von n8n auslesen
    const answer = await response.json();

    // Antwort an Frontend zurückgeben
    res.json(answer);
  } catch (error) {
    console.error(error);

    res.json({
      answer: `${error}`,
    });
  }
});

export default n8nAnalyse;