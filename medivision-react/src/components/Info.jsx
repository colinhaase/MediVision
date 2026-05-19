import {
  FiInfo,
  FiMessageSquare,
  FiBarChart2,
  FiWatch,
  FiChevronDown,
} from "react-icons/fi";

function Info() {
  return (
    <>
    <h1>Informationen</h1>
      <div className="list">
        <details>
          <summary className="header">Umgang mit Daten</summary>
          <p>
            Hier steht der versteckte Inhalt, der beim Klick eingeblendet wird.
          </p>
        </details>

        <details>
          <summary className="header">Wearables verbinden</summary>
          <p>
            Hier steht der versteckte Inhalt, der beim Klick eingeblendet wird.
          </p>
        </details>

        <details>
          <summary className="header">
            Technische Backgrounds von MediVision
          </summary>
          <p>
            Hier steht der versteckte Inhalt, der beim Klick eingeblendet wird.
          </p>
        </details>

        <details>
          <summary className="header">Historie von MediVision</summary>
          <p>
            Hier steht der versteckte Inhalt, der beim Klick eingeblendet wird.
          </p>
        </details>
      </div>
    </>
  );
}

export default Info;
