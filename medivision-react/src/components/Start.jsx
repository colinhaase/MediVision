import { FiInfo, FiMessageSquare, FiBarChart2, FiWatch } from "react-icons/fi";

function Start() {
  return (
    <>
      <p>Medivision ist eine medizinische Hilfs-KI.</p>
      <p>
        Mithilfe unseres Chatbots können sie ihre Symtome identifizieren und
        sich eine erste Einschätzung ihrer Krankheit holen.
      </p>
      <p>
        Dafür können sie dem Chatbot Bilder oder Symptome schildern um eine
        erste Einschätzung zu erhalten. Betätigen Sie einfach <FiMessageSquare size={25} /> um den Chat zu starten.
      </p>
      <p>
        MediVision verfügt außerdem über die Fähigkeit Daten von wearables zu verarbeiten.
        Um ein wearable Gerät zu verbinden betätigen Sie <FiWatch size={25} />. Über <FiInfo size={25} />
        können Sie weitere Informationen über die Verbindung von wearables erhalten.
      </p>
      <p>
        Um am Ende eine komplett Analyse aller Daten im Chat als pdf zu erhalten können Sie ganz einfach 
        <FiBarChart2 size={25} /> betätigen.
      </p>
      <p>
        Bemerke die KI ersetzt keinen Arzt und speichert keine ihrer Daten. Mehr
        Informationen siehe <FiInfo size={25} />.
      </p>
    </>
  );
}

export default Start;
