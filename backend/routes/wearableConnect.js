import express from "express";
import multer from "multer";
import crypto from "crypto";

import dotenv from "dotenv";
dotenv.config();

// ===== Router erstellen =====
const wearableConnect = express.Router();

// Multer verarbeitet FormData ohne Dateien
const upload = multer();

// ===== OpenWearables Login-Daten =====
const params = new URLSearchParams({
  grant_type: "password",
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  scope: "",
  client_id: "string",
  client_secret: "********",
});

// Basis-URL der OpenWearables API
const URL = process.env.API_URL;

// Speichert aktive Verbindungs-Sessions
// Wird genutzt um alte Loops abzubrechen
const deletionActivity = new Map();

// ===== Wearable verbinden =====
wearableConnect.post("/", upload.none(), async (req, res) => {
  try {
    // ===== Bearer Token holen =====
    const getToken = await fetch(`${URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type":
          "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!getToken.ok) {
      throw new Error("Could not fetch Bearer Token");
    }

    const token = await getToken.json();

    // ===== User suchen =====
    const { UUID } = req.body;

    let userId;

    const fetchUser = await fetch(
      `${URL}/api/v1/users?page=1&limit=20&sort_by=created_at&sort_order=desc&external_user_id=${UUID}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Open-Wearables-API-Key":
            process.env.API_KEY,
        },
      }
    );

    if (!fetchUser.ok) {
      throw new Error("could not fetch user");
    }

    const userData = await fetchUser.json();

    const id = userData.items?.[0]?.id;

    // ===== Bestehenden User nutzen =====
    if (id != undefined) {
      userId = id;

      console.log(`old user: ${userId}`);
    }

    // ===== Neuen User erstellen =====
    if (id == undefined) {
      const createUser = await fetch(
        `${URL}/api/v1/users`,
        {
          method: "POST",
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            "X-Open-Wearables-API-Key":
              process.env.API_KEY,
          },
          body: JSON.stringify({
            first_name: UUID,
            last_name: null,
            email: "temp@temp.com",
            external_user_id: UUID,
          }),
        }
      );

      if (!createUser.ok) {
        throw new Error("User creation failed");
      }

      const user = await createUser.json();

      userId = user.id;

      console.log(`new user: ${userId}`);
    }

    // ===== Neue Session-ID erzeugen =====
    // Dient zum Stoppen alter Prozesse
    const sessionId = crypto.randomUUID();

    deletionActivity.set(userId, sessionId);

    // ===== Verbindungscode erzeugen =====
    const fetchCode = await fetch(
      `${URL}/api/v1/users/${userId}/invitation-code`,
      {
        method: "POST",
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token.access_token}`,
        },
      }
    );

    if (!fetchCode.ok) {
      throw new Error("Could not fetch Code");
    }

    const code = await fetchCode.json();

    // ===== Code an Frontend senden =====
    res.json({
      answer:
        `Bitte geben Sie in die OpenWearables App ` +
        `den Link "${URL}" und Ihre Geheimzahl ` +
        `"${code.code}" ein, um Ihr wearable Gerät ` +
        `zu verbinden.`,
    });

    // ===== Auf Verbindung warten =====

    // Kleine Wartefunktion
    const delay = (ms) =>
      new Promise((resolve) => setTimeout(resolve, ms));

    let connections = [];

    const start = Date.now();

    // 5 Minuten Timeout
    const timeout = 300000;

    // Prüft jede Sekunde ob Gerät verbunden wurde
    while (
      connections.length == 0 &&
      Date.now() - start <= timeout
    ) {
      // Prüfen ob diese Session noch gültig ist
      if (deletionActivity.get(userId) !== sessionId) {
        console.log("cancelled delete");
        return;
      }

      const fetchConnections = await fetch(
        `${URL}/api/v1/users/${userId}/connections`,
        {
          method: "GET",
          headers: {
            accept: "application/json",
            "X-Open-Wearables-API-Key":
              process.env.API_KEY,
            Authorization:
              `Bearer ${token.access_token}`,
          },
        }
      );

      if (!fetchConnections.ok) {
        throw new Error(
          "Could not fetch Connections"
        );
      }

      connections = await fetchConnections.json();

      console.log(connections);

      await delay(1000);
    }

    // ===== User löschen falls nichts verbunden wurde =====
    if (connections.length == 0) {
      // Nochmals prüfen ob Session gültig ist
      if (deletionActivity.get(userId) !== sessionId) {
        console.log("delete cancelled");
        return;
      }

      const deleteUser = await fetch(
        `${URL}/api/v1/users/${userId}`,
        {
          method: "DELETE",
          headers: {
            Authorization:
              `Bearer ${token.access_token}`,
          },
        }
      );

      if (!deleteUser.ok) {
        throw new Error("Could not delete User");
      }

      console.log("user deleted");

      deletionActivity.delete(userId);

      return;
    }
  } catch (error) {
    console.error(error);

    // Verhindert doppelte Antworten an Frontend
    if (!res.headersSent) {
      res.json({
        answer: `${error}`,
      });
    }
  }
});

export default wearableConnect;