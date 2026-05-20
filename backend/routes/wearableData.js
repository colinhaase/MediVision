import express from "express";
import multer from "multer";

import dotenv from "dotenv";
dotenv.config();

// ===== Router erstellen =====
const wearableData = express.Router();

// Multer verarbeitet FormData ohne Dateien
const upload = multer();

// ===== Login-Daten für OpenWearables =====
const params = new URLSearchParams({
  grant_type: "password",
  username: process.env.USERNAME,
  password: process.env.PASSWORD,
  scope: "",
  client_id: "string",
  client_secret: "********",
});

// Basis-URL der API
const URL = process.env.API_URL;

// ===== Wearable Daten abrufen =====
wearableData.post("/", upload.none(), async (req, res) => {
  try {
    // ===== Bearer Token holen =====
    const getToken = await fetch(`${URL}/api/v1/auth/login`, {
      method: "POST",
      headers: {
        accept: "application/json",
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    });

    if (!getToken.ok) {
      throw new Error("Could not fetch Bearer Token");
    }

    const token = await getToken.json();

    // ===== User-ID ermitteln =====
    const { UUID } = req.body;

    const fetchUser = await fetch(
      `${URL}/api/v1/users?page=1&limit=20&sort_by=created_at&sort_order=desc&external_user_id=${UUID}`,
      {
        method: "GET",
        headers: {
          accept: "application/json",
          "X-Open-Wearables-API-Key": process.env.API_KEY,
        },
      },
    );

    if (!fetchUser.ok) {
      throw new Error("could not fetch user");
    }

    const userData = await fetchUser.json();

    const id = userData.items?.[0]?.id;

    console.log(id);

    // Falls kein User existiert
    if (id == undefined) {
      res.json({
        answer:
          `Bitte betätigen Sie zuerst "Verbinden" ` +
          `um einen Nutzer zu erstellen und ` +
          `verbinden Sie ihr wearable Gerät`,
      });

      return;
    }

    // ===== Zeitraum bestimmen =====
    const date = new Date();

    const end_date = date.toISOString();

    // 90 Tage zurückgehen
    date.setDate(date.getDate() - 90);

    const start_date = date.toISOString();

    // ===== Summary Daten =====

    // Aktivitätsdaten abrufen
    const fetchActivity = await fetch(
      `${URL}/api/v1/users/${id}/summaries/activity?start_date=${start_date}&end_date=${end_date}&limit=100`,
      {
        headers: {
          accept: "application/json",
          "X-Open-Wearables-API-Key": process.env.API_KEY,
        },
      },
    );

    if (!fetchActivity.ok) {
      throw new Error("Could not fetch Activity");
    }

    let activity = await fetchActivity.json();

    if (activity.data != null) {
      activity = activity.data;
    }

    // Schlafdaten abrufen
    const fetchSleep = await fetch(
      `${URL}/api/v1/users/${id}/summaries/sleep?start_date=${start_date}&end_date=${end_date}&limit=100`,
      {
        headers: {
          accept: "application/json",
          "X-Open-Wearables-API-Key": process.env.API_KEY,
        },
      },
    );

    if (!fetchSleep.ok) {
      throw new Error("Could not fetch Sleep");
    }

    let sleep = await fetchSleep.json();

    if (sleep.data != null) {
      sleep = sleep.data;
    }

    // ===== Timeseries Funktion =====
    // Holt detaillierte Zeitreihen-Daten
    async function fetchDetailed(types) {
      const typesParams = types.map((t) => `types=${t}`).join("&");

      const fetchTimeseries = await fetch(
        `${URL}/api/v1/users/${id}/timeseries?${typesParams}&resolution=1hour&limit=30&start_time=${start_date}&end_time=${end_date}`,
        {
          headers: {
            accept: "application/json",
            "X-Open-Wearables-API-Key": process.env.API_KEY,
            Authorization: `Bearer ${token.access_token}`,
          },
        },
      );

      if (!fetchTimeseries.ok) {
        const errorText = await fetchTimeseries.text();

        console.log(errorText);

        throw new Error(`Could not fetch ${typesParams}`);
      }

      return await fetchTimeseries.json();
    }

    // ===== Gesundheitsdaten =====

    // Herz-Kreislauf
    const heartDetailed = await fetchDetailed([
      "resting_heart_rate",
      "heart_rate_variability_rmssd",
      "heart_rate_variability_sdnn",
      "heart_rate_recovery_one_minute",
      "blood_pressure_systolic",
      "blood_pressure_diastolic",
      "atrial_fibrillation_burden",
    ]);

    // Atmung und Sauerstoff
    const respiratoryDetailed = await fetchDetailed([
      "respiratory_rate",
      "oxygen_saturation",
      "breathing_disturbance_index",
      "sleeping_breathing_disturbances",
    ]);

    // Stress und Recovery
    const recoveryDetailed = await fetchDetailed([
      "recovery_score",
      "garmin_body_battery",
      "garmin_stress_level",
      "electrodermal_activity",
    ]);

    // Temperaturdaten
    const temperatureDetailed = await fetchDetailed([
      "body_temperature",
      "skin_temperature",
      "skin_temperature_deviation",
      "skin_temperature_trend_deviation",
    ]);

    // Stoffwechsel
    const metabolicDetailed = await fetchDetailed(["blood_glucose"]);

    // Aktivität
    const activityDetailed = await fetchDetailed(["steps", "exercise_time"]);

    // Körperdaten
    const bodyDetailed = await fetchDetailed([
      "body_mass_index",
      "body_fat_percentage",
    ]);

    // Umgebungsdaten
    const environmentDetailed = await fetchDetailed([
      "time_in_daylight",
      "uv_exposure",
      "weather_temperature",
    ]);

    // ===== Alle Daten sammeln =====
    const wearableRaw = {
      activity,
      sleep,
      heartDetailed,
      respiratoryDetailed,
      recoveryDetailed,
      temperatureDetailed,
      metabolicDetailed,
      activityDetailed,
      bodyDetailed,
      environmentDetailed,
    };

    // ===== Leere Daten entfernen =====
    const wearable = Object.fromEntries(
      Object.entries(wearableRaw).filter(([_, value]) => {
        if (!value) return false;

        if (Array.isArray(value)) {
          return value.length > 0;
        }

        if (typeof value === "object" && Array.isArray(value.data)) {
          return value.data.length > 0;
        }

        return false;
      }),
    );

    // ===== Daten an AI senden =====
    const formData = new FormData();

    formData.append("UUID", UUID);

    formData.append(
      "user",
      JSON.stringify({
        message:
          "Der Nutzer hat wearable Daten angegeben analysiere Sie anhand des Systemprompts",
        wearable,
      }),
    );

    // Anfrage an lokale Chat-Route
    const fetchN8N = await fetch("http://localhost:8080/n8nChat", {
      method: "POST",
      body: formData,
    });

    if (!fetchN8N.ok) {
      throw new Error("n8n request failed");
    }

    const answer = await fetchN8N.json();

    // Antwort an Frontend senden
    res.json(answer);

    // ===== Temporären User löschen =====
    await fetch(`${URL}/api/v1/users/${id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${token.access_token}`,
      },
    });
  } catch (error) {
    console.error(error);

    res.json({
      answer: `Error: ${error}`,
    });
  }
});

export default wearableData;
