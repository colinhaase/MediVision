import express from "express";
import cors from "cors";

import dotenv from "dotenv";
dotenv.config();

// ===== Routen importieren =====
import n8nChat from "./routes/n8nChat.js";
import n8nAnalyse from "./routes/n8nAnalyse.js";
import wearableConnect from "./routes/wearableConnect.js";
import wearableData from "./routes/wearableData.js";

// ===== Express App erstellen =====
const app = express();

// ===== Port aus .env laden =====
const PORT = process.env.PORT;

// ===== Middleware =====

// Ermöglicht Verarbeitung von JSON-Daten
app.use(express.json());

// Erlaubt Frontend-Zugriffe vom React-Client
app.use(
  cors({
    origin: "http://localhost:5173",
  }),
);

// ===== API-Routen =====

// Chat-Anfragen an n8n
app.use("/n8nChat", n8nChat);

// Analyse des bisherigen Chats
app.use("/n8nAnalyse", n8nAnalyse);

// Wearable-Gerät verbinden
app.use("/wearableConnect", wearableConnect);

// Wearable-Daten abrufen und analysieren
app.use("/wearableData", wearableData);

// ===== Server starten =====
app.listen(PORT, () => {
  console.log(`Server läuft auf http://localhost:${PORT}`);
});
