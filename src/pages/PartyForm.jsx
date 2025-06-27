import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "../supabaseClient";

export default function PartyForm() {
  const { slug } = useParams();
  const [party, setParty] = useState(null);
  const [ic, setIC] = useState("");
  const [phone, setPhone] = useState("");
  const [clicked, setClicked] = useState(false); // 👈 Added
  const [modal, setModal] = useState({
    show: false,
    success: true,
    message: "",
  });

  useEffect(() => {
    async function fetchParty() {
      const { data } = await supabase
        .from("parties")
        .select("*")
        .eq("slug", slug)
        .single();
      setParty(data);
    }
    fetchParty();
  }, [slug]);

  const handleSubmit = async () => {
    setClicked(true); // 👈 Start animation
    setTimeout(() => setClicked(false), 150); // 👈 Reset animation

    const cleanedIC = ic.replace(/-/g, "");

    if (/[a-zA-Z]/.test(cleanedIC)) {
      return setModal({
        show: true,
        success: false,
        message: "❌ IC must not contain letters!",
      });
    }

    if (cleanedIC.length !== 12 || !/^\d{12}$/.test(cleanedIC)) {
      return setModal({
        show: true,
        success: false,
        message: "❌ IC must be exactly 12 digits!",
      });
    }

    if (!phone || !party?.id) {
      return setModal({
        show: true,
        success: false,
        message: "❌ Please fill in all fields.",
      });
    }

    const { data: existing } = await supabase
      .from("registrations")
      .select("*")
      .eq("ic_number", cleanedIC);

    if (existing.length > 0) {
      setModal({
        show: true,
        success: false,
        message: "❌ IC already registered!",
      });
    } else {
      const { error } = await supabase.from("registrations").insert([
        {
          ic_number: cleanedIC,
          phone_number: phone,
          party_id: party.id,
        },
      ]);
      if (error)
        return setModal({ show: true, success: false, message: error.message });

      setModal({
        show: true,
        success: true,
        message: "✅ Registration Successful!",
      });
      setIC("");
      setPhone("");
    }
  };

  if (!party) return <p style={styles.message}>Loading party info...</p>;

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

      {/* Modal */}
      {modal.show && (
        <div style={styles.modalOverlay}>
          <div style={styles.modalBox}>
            <p
              style={{
                ...styles.modalText,
                color: modal.success ? "green" : "red",
              }}
            >
              {modal.message}
            </p>
            <button
              onClick={() => setModal({ ...modal, show: false })}
              style={styles.modalButton}
            >
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
  message: {
    textAlign: "center",
    marginTop: "80px",
    fontSize: "18px",
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
