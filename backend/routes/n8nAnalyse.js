import express from "express";
import multer from "multer";
import PDFDocument from "pdfkit";

import dotenv from "dotenv";
dotenv.config();

const n8nAnalyse = express.Router();
const upload = multer();

n8nAnalyse.post("/", upload.none(), async (req, res) => {
  try {
    const { UUID } = req.body;

    // ===== Request an n8n =====
    const formData = new FormData();
    formData.append("sessionID", UUID);
    formData.append(
      "user",
      "Analysiere den Chat wie im Systemprompt beschrieben"
    );
    formData.append("deletion", "true");

    const response = await fetch(process.env.N8N_URL, {
      method: "POST",
      headers: {
        "ngrok-skip-browser-warning": "true",
        Authorization: process.env.N8N_KEY,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error("n8n error");
    }

    // ===== n8n OUTPUT FIX =====
    const raw = await response.json();

    const outputString = raw?.[0]?.output || "";

    const cleaned = outputString
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const data = JSON.parse(cleaned);

    // ===== PDF ERSTELLUNG =====
    const doc = new PDFDocument({ margin: 40 });

    const chunks = [];
    doc.on("data", (c) => chunks.push(c));

    doc.on("end", () => {
      const result = Buffer.concat(chunks);

      res.setHeader("Content-Type", "application/pdf");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="analyse.pdf"'
      );

      res.send(result);
    });

    // ===== HEADER =====
    doc.fontSize(16).text("Medizinische Analyse");
    doc.moveDown();

    // ===== BASISINFORMATIONEN =====
    const b = data.basisinformationen || {};

    doc.fontSize(12).text(`Geschlecht: ${b.geschlecht || "unbekannt"}`);
    doc.text(`Alter: ${b.alter || "unbekannt"}`);
    doc.text(`Symptome: ${b.symptome || "unbekannt"}`);

    doc.moveDown();

    // ===== BILDBESCHREIBUNG =====
    doc.fontSize(14).text("Bildbeschreibung");
    doc.fontSize(12).text(data.bildbeschreibung || "");
    doc.moveDown();

    // ===== DIAGNOSETABELLE =====
    doc.fontSize(14).text("Differentialdiagnosen");
    doc.moveDown();

    // Tabellenkopf
    doc.fontSize(12).text("Diagnose", 50);
    doc.text("Begründung", 200);
    doc.text("Wahrscheinlichkeit", 450);

    doc.moveDown();

    const diagnoses = data.differentialdiagnosen || [];

    diagnoses.forEach((d) => {
      doc.text(d.diagnose || "", 50);
      doc.text(d.begruendung || "", 200);
      doc.text(`${d.wahrscheinlichkeit || 0}%`, 450);
      doc.moveDown();
    });

    doc.moveDown();

    // ===== EMPFEHLUNG =====
    doc.fontSize(14).text("Empfehlung");
    doc.fontSize(12).text(data.empfehlung || "");
    doc.moveDown();

    // ===== HINWEIS =====
    doc.fontSize(10).text(data.wichtiger_hinweis || "");

    doc.end();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: String(error),
    });
  }
});

export default n8nAnalyse;