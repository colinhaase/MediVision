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

    // ===== Request n8n =====
    const formData = new FormData();
    formData.append("sessionID", UUID);
    formData.append(
      "user",
      "Analysiere den Chat wie im Systemprompt beschrieben",
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

    // ===== ANTWORT BEHANDELN =====
    const fullResponse = await response.json();

    let raw = fullResponse.answer;

    // entfernt ```json und ```
    raw = raw
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const parsed = JSON.parse(raw);

    console.log(parsed);
    
    // ===== PDF ERSTELLEN =====
    const doc = new PDFDocument({
      margins: {
        top: 40,
        bottom: 40,
        left: 40,
        right: 40,
      },
    });

    //metadata
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=analyse.pdf");

    doc.pipe(res);

    //überschrift
    doc.fontSize(20);
    doc.font("Helvetica-Bold").fillColor("#0056B3");
    doc.text("MediVision ", { continued: true });

    doc.font("Helvetica").fillColor("black");
    doc.text("| Medizinische Analyse");

    doc.moveDown(0.1);

    // blaue Linie über die ganze Seitenbreite
    const startX = doc.page.margins.left;
    const endX = doc.page.width - doc.page.margins.right;

    doc
      .strokeColor("#0056B3")
      .lineWidth(1.5)
      .moveTo(startX, doc.y)
      .lineTo(endX, doc.y)
      .stroke();

    doc.moveDown(0.5);

    //basisinformationen
    doc.font("Helvetica").fontSize(12).fillColor("black");
    const now = new Date().toLocaleString("de-DE", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
    doc.table({
      defaultStyle: { padding: 5, backgroundColor: "#F9F9F9", border: false },
      // Umrandungen der Tabelle setzen
      rowStyles: (i) => {
        if (i === 0)
          return {
            border: [2, 0, 1, 0],
            borderColor: "#EEEEEE",
          };
        if (i === 3)
          return {
            border: [0, 0, 2, 0],
            borderColor: "#EEEEEE",
          };
      },
      data: [
        [
          { text: "Patientendaten", textColor: "#666666" },
          { text: "Datum, Uhrzeit", textColor: "#666666" },
        ],
        [`Name: ${parsed.basisinformationen.name}`, now],
        [`Geschlecht: ${parsed.basisinformationen.geschlecht}`, ""],
        [`Alter: ${parsed.basisinformationen.alter}`, ""],
      ],
    });

    doc.moveDown();

    //symptome
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0056B3");
    doc.text("Symptomatik:");
    doc.font("Helvetica").fontSize(12).fillColor("black");
    doc.text(parsed.symptome);

    doc.moveDown();

    //Bildbeschreibung und/oder Werable Daten
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0056B3");
    doc.text("Zusatz:");
    doc.font("Helvetica").fontSize(12).fillColor("black");
    doc.text(parsed.zusatz);

    doc.moveDown();

    //diagnosen
    doc.font("Helvetica-Bold").fontSize(14).fillColor("#0056B3");
    doc.text("Differentialdiagnosen:");

    doc.font("Helvetica").fontSize(12).fillColor("black");

    const diagnosen = parsed.differentialdiagnosen;

    doc.table({
      columnStyles: [150, 250, "*"],

      defaultStyle: {
        padding: 5,
        backgroundColor: "#F9F9F9",
        border: false,
      },
      // Umrandungen der Tabelle setzen
      rowStyles: (i) => {
        if (i === 0) {
          return {
            border: { top: 2, bottom: 2 },
            borderColor: { top: "#EEEEEE", bottom: "#EEEEEE" },
          };
        }

        if (i === diagnosen.length) {
          return {
            border: { bottom: 2 },
            borderColor: { bottom: "#EEEEEE" },
          };
        }

        return {
          border: false,
        };
      },

      data: [
        [
          { text: "Diagnose", textColor: "#666666" },
          { text: "Begründung", textColor: "#666666" },
          { text: "Wahrscheinlichkeit", textColor: "#666666" },
        ],

        ...diagnosen.map((d) => [
          d.diagnose,
          d.begruendung,
          `${d.wahrscheinlichkeit}`,
        ]),
      ],
    });

    doc.moveDown();

    // prüfen ob element auf seite passt
    function addSectionWithBreak(doc, contentFunction) {
      if (doc.y + 100 > doc.page.height - doc.page.margins.bottom) {
        // Seitenumbruch falls Element nicht passt
        doc.addPage();
      }
      contentFunction();
    }

    // empehlung
    addSectionWithBreak(doc, () => {
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#0056B3");
      doc.text("Empfehlung:");
      doc.font("Helvetica").fontSize(12).fillColor("black");
      doc.text(parsed.empfehlung);
      doc.moveDown();
    });

    // Wichtiger Hinweis
    addSectionWithBreak(doc, () => {
      doc.font("Helvetica-Bold").fontSize(14).fillColor("#0056B3");
      doc.text("Wichtiger Hinweis:");
      doc.font("Helvetica").fontSize(12).fillColor("black");
      doc.text(
        "Dieses Dokument wurde KI generiert und zählt nur als erste Einschätzung. Für eine echte Diagnose wenden Sie sich bitte an Ihren Haus und/oder Fachartzt",
      );
      doc.moveDown();
      doc.text(
        "PS: Hierbei handelt es sich um ein Schulprojekt der 12. Klasse des Berfulichen Gymnasiums Technik",
      );
    });

    doc.end();
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: String(error),
    });
  }
});

export default n8nAnalyse;
