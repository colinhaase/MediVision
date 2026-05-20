import { useEffect, useRef, useState } from "react";

import Medi from "../assets/MediVisionLogo.svg?react";

import { FiBarChart2, FiInfo, FiMessageSquare, FiWatch } from "react-icons/fi";

function Sidebar({ setRendering, setAI, setUser, callBackend }) {
  // ===== Zustände =====
  // showMenu -> steuert ob Wearable-Menü sichtbar ist
  const [showMenu, setShowMenu] = useState(false);

  // ===== Referenz für Dropdown =====
  // Wird genutzt um Klicks außerhalb des Menüs zu erkennen
  const dropdownRef = useRef(null);

  // ===== Dropdown automatisch schließen =====
  // Wenn außerhalb geklickt wird,
  // wird das Wearable-Menü geschlossen
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ===== Seitenwechsel =====
  function openInfo() {
    setRendering("infoSeite");
  }

  function openChat() {
    setRendering("chatSeite");
  }

  // ===== Analyse starten =====
  // Sendet Anfrage an Analyse-Workflow
  function analyse() {
    callBackend("n8nAnalyse")
      .then((res) => res.blob())
      .then((blob) => {
        const url = window.URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = "analyse.pdf";

        document.body.appendChild(a);
        a.click();

        a.remove();
        window.URL.revokeObjectURL(url);
      });
  }

  // ===== Wearable verbinden =====
  // Startet Verbindungsprozess mit Wearable-Gerät
  function wearableConnect() {
    resetUser();

    callBackend("wearableConnect")
      .then((r) => r.json())
      .then((json) => {
        setAI({
          text: json.answer,
          time: new Date().toLocaleTimeString("en-GB"),
          remaining: 300,
          source: "wearable",
        });
      });
  }

  // ===== Wearable-Daten abrufen =====
  // Holt Gesundheitsdaten vom verbundenen Gerät
  function wearableData() {
    resetUser();

    callBackend("wearableData")
      .then((r) => r.json())
      .then((json) => {
        setAI({
          text: json.answer,
          time: new Date().toLocaleTimeString("en-GB"),
          source: "wearable",
        });
      });
  }

  // ===== Leere User-Nachricht setzen =====
  // Verhindert alte Nutzereingaben im Chatablauf
  function resetUser() {
    setUser({
      text: null,
      image: null,
      time: null,
    });
  }

  return (
    <>
      {/* MediVision Logo */}
      <Medi style={{ height: "60px", width: "60px" }} />

      <fieldset id="sidebarInput">
        {/* Info-Seite öffnen */}
        <button onClick={openInfo} className="button2">
          <FiInfo size={25} />
        </button>

        {/* Chat-Seite öffnen */}
        <button onClick={openChat} className="button2">
          <FiMessageSquare size={25} />
        </button>

        {/* Wearable-Menü */}
        <div ref={dropdownRef} className="button2">
          <button className="button2" onClick={() => setShowMenu(!showMenu)}>
            <FiWatch size={25} />
          </button>

          {/* Dropdown-Menü */}
          {showMenu && (
            <div className="dropdown">
              <button
                className="button3"
                onClick={() => {
                  wearableConnect();
                  setShowMenu(false);
                }}
              >
                Verbinden
              </button>

              <button
                className="button3"
                onClick={() => {
                  wearableData();
                  setShowMenu(false);
                }}
              >
                Daten übertragen
              </button>
            </div>
          )}
        </div>

        {/* Analyse starten */}
        <button onClick={analyse} className="button2">
          <FiBarChart2 size={25} />
        </button>
      </fieldset>
    </>
  );
}

export default Sidebar;
