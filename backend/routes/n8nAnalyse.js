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
        top: 36,
        bottom: 36,
        left: 36,
        right: 36,
      },
    });

    //metadata
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=analyse.pdf");

    doc.pipe(res);

    //überschrift
    doc.font("Helvetica-Bold").fontSize(20);
    doc.text("Medizinische Analyse", {
      underline: true,
    });

    doc.moveDown();

    //basisinformationen
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text("Basisinformationen:");

    doc.font("Helvetica").fontSize(12);
    doc.text(`Geschlecht: ${parsed.basisinformationen.geschlecht}`);
    doc.text(`Alter: ${parsed.basisinformationen.alter}`);
    doc.text(`Symptome: ${parsed.basisinformationen.symptome}`);

    doc.moveDown();

    //diagnosen
    doc.font("Helvetica-Bold").fontSize(14);
    doc.text("Differentialdiagnosen:");

    doc.font("Helvetica").fontSize(12);
    const diagnosen = parsed.differentialdiagnosen;
    doc.table({
      columnStyles: [150, 250, 150],
      defaultStyle: { padding: 5 },
      data: [
        ["Diagnose", "Begründung", "Wahrscheinlichkeit"],

        [
          diagnosen[0].diagnose,
          diagnosen[0].begruendung,
          `${diagnosen[0].wahrscheinlichkeit}`,
        ],
        [
          diagnosen[1].diagnose,
          diagnosen[1].begruendung,
          `${diagnosen[1].wahrscheinlichkeit}`,
        ],
        [
          diagnosen[2].diagnose,
          diagnosen[2].begruendung,
          `${diagnosen[2].wahrscheinlichkeit}`,
        ],
        [
          diagnosen[3].diagnose,
          diagnosen[3].begruendung,
          `${diagnosen[3].wahrscheinlichkeit}`,
        ],
      ],
    });

    doc.moveDown();

    // prüfen ob element auf seite passt
    function addSectionWithBreak(doc, contentFunction) {
      // Check if adding this section would go beyond the bottom margin
      if (doc.y + 200 > doc.page.height - doc.page.margins.bottom) {
        // 200 is a safe estimate
        doc.addPage();
      }
      contentFunction();
    }

    // empehlung
    addSectionWithBreak(doc, () => {
      doc.font("Helvetica-Bold").fontSize(14);
      doc.text("Empfehlung:");
      doc.font("Helvetica").fontSize(12);
      doc.text(parsed.empfehlung);
      doc.moveDown();
    });

    // Wichtiger Hinweis
    addSectionWithBreak(doc, () => {
      doc.font("Helvetica-Bold").fontSize(14);
      doc.text("Wichtiger Hinweis:");
      doc.font("Helvetica").fontSize(12);
      doc.text(
        "Dieses Dokument zählt nur als erste Einschätzung. Für eine echte Diagnose wenden Sie sich bitte an Ihren Haus und/oder Fachartzt",
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
