import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase } from "../supabaseClient";

export default function PartyForm() {
  const { slug } = useParams();
  const [party, setParty] = useState(null);
  const [events, setEvents] = useState([]);
  const [selectedEvents, setSelectedEvents] = useState([]);
  const [ic, setIC] = useState("");
  const [phone, setPhone] = useState("");
  const [clicked, setClicked] = useState(false);
  const [modal, setModal] = useState({ show: false, success: true, message: "" });

  useEffect(() => {
    async function fetchData() {
      const { data: partyData } = await supabase.from("parties").select("*").eq("slug", slug).single();
      const { data: eventData } = await supabase.from("events").select("*");
      setParty(partyData);
      setEvents(eventData || []);
    }
    fetchData();
  }, [slug]);

  const toggleEvent = (eventId) => {
    if (selectedEvents.includes(eventId)) {
      setSelectedEvents(selectedEvents.filter(id => id !== eventId));
    } else {
      setSelectedEvents([...selectedEvents, eventId]);
    }
  };

  const handleSubmit = async () => {
    setClicked(true);
    setTimeout(() => setClicked(false), 150);

    const cleanedIC = ic.replace(/-/g, "");

    if (/[a-zA-Z]/.test(cleanedIC)) {
      return setModal({ show: true, success: false, message: "❌ IC must not contain letters!" });
    }

    if (cleanedIC.length !== 12 || !/^\d{12}$/.test(cleanedIC)) {
      return setModal({ show: true, success: false, message: "❌ IC must be exactly 12 digits!" });
    }

    if (!phone || selectedEvents.length === 0 || !party) {
      return setModal({ show: true, success: false, message: "❌ Please complete all fields." });
    }

    const { data: existingRegs } = await supabase
      .from("registrations")
      .select("event_id")
      .eq("ic_number", cleanedIC);

    const existingEventIds = existingRegs.map(r => r.event_id);
    const alreadySelected = selectedEvents.filter(id => existingEventIds.includes(id));

    if (alreadySelected.length > 0) {
      const { data: dupeEvents } = await supabase
        .from("events")
        .select("name")
        .in("id", alreadySelected);
      return setModal({
        show: true,
        success: false,
        message: `❌ IC has already registered for: ${dupeEvents.map(e => e.name).join(", ")}`,
      });
    }

    if (existingEventIds.length + selectedEvents.length > 2) {
      return setModal({
        show: true,
        success: false,
        message: `❌ IC can only register for up to 2 events in total.`,
      });
    }

    // Proceed with insert for each selected event
    const inserts = selectedEvents.map(eventId => ({
      ic_number: cleanedIC,
      phone_number: phone,
      party_id: party.id,
      event_id: eventId,
    }));

    const { error: insertError } = await supabase.from("registrations").insert(inserts);

    if (insertError) {
      return setModal({ show: true, success: false, message: insertError.message });
    }

    setModal({ show: true, success: true, message: "✅ Registration Successful!" });
    setIC("");
    setPhone("");
    setSelectedEvents([]);
  };

  if (!party) return <p style={styles.message}>Loading...</p>;

  return (
    <div style={styles.container}>
      <h2 style={styles.heading}>The Stage Sibu Registration</h2>

    

      <input
        placeholder="IC Number"
        value={ic}
        onChange={(e) => setIC(e.target.value.replace(/-/g, ""))}
        style={styles.input}
      />
      <input
        placeholder="Phone Number"
        value={phone}
        onChange={(e) => setPhone(e.target.value.replace(/-/g, ""))}
        style={styles.input}
      />

        <div style={{ marginBottom: 20, textAlign: "left" }}>
        {events.map((event) => (
          <label key={event.id} style={{ display: "block", marginBottom: 10 }}>
            <input
              type="checkbox"
              checked={selectedEvents.includes(event.id)}
              onChange={() => toggleEvent(event.id)}
              style={{ marginRight: 8 }}
            />
            {event.name}
          </label>
        ))}
      </div>
      <button
        onClick={handleSubmit}
        style={{
          ...styles.button,
          transform: clicked ? "scale(0.97)" : "scale(1)",
          transition: "transform 0.15s ease-in-out",
        }}
      >
        Submit
      </button>

      {modal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <p style={{ ...styles.modalText, color: modal.success ? "green" : "red" }}>
              {modal.message}
            </p>
            <button onClick={() => setModal({ ...modal, show: false })} style={styles.modalButton}>
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    width: "90%",
    maxWidth: "400px",
    margin: "60px auto",
    padding: "20px",
    border: "1px solid #ddd",
    borderRadius: "10px",
    backgroundColor: "#fafafa",
    textAlign: "center",
    boxShadow: "0 4px 10px rgba(0,0,0,0.06)",
    boxSizing: "border-box",
  },
  heading: {
    marginBottom: "20px",
    fontWeight: "600",
    fontSize: "1.4rem",
  },
  input: {
    display: "block",
    width: "100%",
    padding: "12px",
    marginBottom: "12px",
    borderRadius: "6px",
    border: "1px solid #ccc",
    fontSize: "16px",
    boxSizing: "border-box",
  },
  button: {
    width: "100%",
    padding: "12px",
    backgroundColor: "#222",
    color: "#fff",
    fontSize: "16px",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
  },
  modalOverlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.4)",
    zIndex: 1000,
  },
  modalBox: {
    backgroundColor: "#fff",
    padding: "24px 32px",
    borderRadius: "10px",
    textAlign: "center",
    width: "90%",
    maxWidth: "320px",
    boxShadow: "0 10px 20px rgba(0,0,0,0.2)",
  },
  modalText: {
    fontSize: "16px",
    marginBottom: "15px",
  },
  modalButton: {
    padding: "10px 20px",
    fontSize: "14px",
    backgroundColor: "#222",
    color: "#fff",
    border: "none",
    borderRadius: "5px",
    cursor: "pointer",
  },
};
