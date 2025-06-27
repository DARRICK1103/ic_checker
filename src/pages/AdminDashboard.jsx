import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import Login from "./Login";

export default function AdminDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("parties");
  const [parties, setParties] = useState([]);
  const [partyName, setPartyName] = useState("");
  const [registrations, setRegistrations] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editIC, setEditIC] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [clickedButtonId, setClickedButtonId] = useState(null);

  const animateClick = (id) => {
    setClickedButtonId(id);
    setTimeout(() => setClickedButtonId(null), 150);
  };

  useEffect(() => {
    if (!user) return;
    fetchParties();
    fetchRegistrations();

    const channel = supabase
      .channel("realtime:registrations")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registrations" },
        () => fetchRegistrations()
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [user]);

  const fetchParties = async () => {
    const { data } = await supabase.from("parties").select("*").order("name");
    setParties(data || []);
  };

  const fetchRegistrations = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*, parties(name)")
      .order("id", { ascending: true });
    setRegistrations(data || []);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSearch = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*, parties(name)")
      .order("id", { ascending: true });

    const filtered = data?.filter(
      (r) =>
        r.ic_number.includes(searchTerm) || r.phone_number.includes(searchTerm)
    );

    setRegistrations(filtered || []);
  };

  const addParty = async () => {
    if (!partyName) return;
    const slug = partyName.toLowerCase().replace(/\s+/g, "-");
    const { error } = await supabase
      .from("parties")
      .insert([{ name: partyName, slug }]);
    if (error) alert(error.message);
    setPartyName("");
    fetchParties();
  };

  const getTabStyle = (tab) => ({
    marginRight: "1rem",
    padding: "0.5rem 1rem",
    border: "none",
    borderRadius: "6px",
    cursor: "pointer",
    fontWeight: "bold",
    background: activeTab === tab ? "#333" : "#f0f0f0",
    color: activeTab === tab ? "#fff" : "#000",
    transition: "background 0.2s, color 0.2s",
  });

  const startEdit = (reg) => {
    setEditId(reg.id);
    setEditIC(reg.ic_number);
    setEditPhone(reg.phone_number);
  };

  const saveEdit = async (id) => {
    const { error } = await supabase
      .from("registrations")
      .update({ ic_number: editIC, phone_number: editPhone })
      .eq("id", id);
    if (error) alert(error.message);
    setEditId(null);
  };

  const deleteReg = async (id) => {
    if (!window.confirm("Delete this registration?")) return;
    await supabase.from("registrations").delete().eq("id", id);
  };

  if (!user) return <Login />;


  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1rem",
  };

  const thTdStyle = {
    borderBottom: "1px solid #ccc",
    textAlign: "left",
    padding: "8px",
  };

  const inputStyle = {
    padding: "6px",
    marginRight: "8px",
  };

  const btn = {
    padding: "6px 12px",
    marginRight: "8px",
    background: "#333",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
  };

  const flatBtn = { ...btn, background: "#888" };

  return (
    <div
      style={{
        padding: "2rem",
        fontFamily: "sans-serif",
        maxWidth: "900px",
        margin: "auto",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>Admin Dashboard</h2>
        <button
          style={{
            ...btn,
            transform:
              clickedButtonId === "logout" ? "scale(0.97)" : "scale(1)",
            transition: "transform 0.15s ease-in-out",
          }}
          onClick={() => {
            animateClick("logout");
            handleLogout();
          }}
        >
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <button
          style={getTabStyle("parties")}
          onClick={() => setActiveTab("parties")}
        >
          Parties
        </button>
        <button
          style={getTabStyle("registrations")}
          onClick={() => setActiveTab("registrations")}
        >
          Registrations
        </button>
      </div>

      {activeTab === "parties" && (
        <div>
          <h3>Add New Party</h3>
          <input
            style={inputStyle}
            type="text"
            placeholder="e.g. Starbucks"
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
          />
          <button
            style={{
              ...btn,
              transform:
                clickedButtonId === "add-party" ? "scale(0.97)" : "scale(1)",
              transition: "transform 0.15s ease-in-out",
            }}
            onClick={() => {
              animateClick("add-party");
              addParty();
            }}
          >
            Add
          </button>

          <h3 style={{ marginTop: "2rem" }}>Party List</h3>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>ID</th>
                <th style={thTdStyle}>Party Name</th>
                <th style={thTdStyle}>Form Link</th>
                <th style={thTdStyle}>Copy</th>
              </tr>
            </thead>
            <tbody>
              {parties.map((p, idx) => (
                <tr key={p.id}>
                  <td style={thTdStyle}>{idx + 1}</td>
                  <td style={thTdStyle}>{p.name}</td>
                  <td style={thTdStyle}>
                    <code>{`${window.location.origin}/form/${p.slug}`}</code>
                  </td>
                  <td style={thTdStyle}>
                    <button
                      style={{
                        ...flatBtn,
                        transform:
                          clickedButtonId === `copy-${p.id}`
                            ? "scale(0.97)"
                            : "scale(1)",
                        transition: "transform 0.15s ease-in-out",
                      }}
                      onClick={() => {
                        animateClick(`copy-${p.id}`);
                        navigator.clipboard.writeText(
                          `${window.location.origin}/form/${p.slug}`
                        );
                      }}
                    >
                      Copy
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "registrations" && (
        <div>
          <h3>Total Registrations: {registrations.length}</h3>

          <div style={{ margin: "1rem 0" }}>
            <input
              type="text"
              placeholder="Search IC or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={inputStyle}
            />
            <button
              style={flatBtn}
              onClick={() => {
                animateClick("search");
                handleSearch();
              }}
            >
              Search
            </button>
            <button
              style={btn}
              onClick={() => {
                animateClick("reset");
                setSearchTerm("");
                fetchRegistrations();
              }}
            >
              Reset
            </button>
          </div>

          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thTdStyle}>ID</th>
                <th style={thTdStyle}>IC</th>
                <th style={thTdStyle}>Phone</th>
                <th style={thTdStyle}>Party</th>
                <th style={thTdStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((reg) => (
                <tr key={reg.id}>
                  <td style={thTdStyle}>{reg.id}</td>
                  <td style={thTdStyle}>
                    {editId === reg.id ? (
                      <input
                        style={inputStyle}
                        value={editIC}
                        onChange={(e) => setEditIC(e.target.value)}
                      />
                    ) : (
                      reg.ic_number
                    )}
                  </td>
                  <td style={thTdStyle}>
                    {editId === reg.id ? (
                      <input
                        style={inputStyle}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    ) : (
                      reg.phone_number
                    )}
                  </td>
                  <td style={thTdStyle}>{reg.parties?.name || "—"}</td>
                  <td style={thTdStyle}>
                    {editId === reg.id ? (
                      <>
                        <button
                          style={btn}
                          onClick={() => {
                            animateClick(`save-${reg.id}`);
                            saveEdit(reg.id);
                          }}
                        >
                          💾 Save
                        </button>
                        <button style={flatBtn} onClick={() => setEditId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button style={flatBtn} onClick={() => startEdit(reg)}>
                          ✏️ Edit
                        </button>
                        <button
                          style={flatBtn}
                          onClick={() => deleteReg(reg.id)}
                        >
                          🗑 Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
