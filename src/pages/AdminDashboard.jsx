import React, { useState, useEffect } from "react";
import { supabase } from "../supabaseClient";
import { useAuth } from "../AuthProvider";
import Login from "./Login";

export default function AdminDashboard() {
  const { user } = useAuth();

  const [activeTab, setActiveTab] = useState("parties");
  const [parties, setParties] = useState([]);
  const [partyName, setPartyName] = useState("");

  const [eventsMap, setEventsMap] = useState({});
  const [registrations, setRegistrations] = useState([]);
  const [eventCounts, setEventCounts] = useState({});

  const [editId, setEditId] = useState(null);
  const [editIC, setEditIC] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editEventId, setEditEventId] = useState(null);

  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!user) return;
    fetchParties();
    fetchEvents();
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

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*");
    const map = {};
    data.forEach((e) => (map[e.id] = e.name));
    setEventsMap(map);
  };

  const fetchRegistrations = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*, parties(name), events(id, name)")
      .order("id", { ascending: true });

    setRegistrations(data || []);

    // Count registrations per event
    const counts = {};
    for (const reg of data || []) {
      const eventName = reg.events?.name;
      if (eventName) {
        counts[eventName] = (counts[eventName] || 0) + 1;
      }
    }
    setEventCounts(counts);
  };

  const handleSearch = async () => {
    const { data } = await supabase
      .from("registrations")
      .select("*, parties(name), events(id, name)")
      .order("id", { ascending: true });

    const filtered = (data || []).filter(
      (r) =>
        r.ic_number?.includes(searchTerm) ||
        r.phone_number?.includes(searchTerm)
    );

    setRegistrations(filtered);
  };

  const saveEdit = async (id) => {
    await supabase
      .from("registrations")
      .update({
        ic_number: editIC,
        phone_number: editPhone,
      })
      .eq("id", id);

    setEditId(null);
    fetchRegistrations();
  };

  const deleteById = async (id) => {
    if (!window.confirm(`Delete this registration?`)) return;
    await supabase.from("registrations").delete().eq("id", id);
    fetchRegistrations();
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

  const tableStyle = {
    width: "100%",
    borderCollapse: "collapse",
    marginTop: "1rem",
  };
  const thTdStyle = {
    borderBottom: "1px solid #ccc",
    textAlign: "left",
    padding: "8px",
    verticalAlign: "middle",
    whiteSpace: "nowrap",
  };
  const inputStyle = {
    padding: "6px",
    marginRight: "8px",
    width: "120px",
  };
  const btn = {
    padding: "6px 10px",
    marginRight: "8px",
    background: "#333",
    color: "white",
    border: "none",
    borderRadius: "4px",
    cursor: "pointer",
    whiteSpace: "nowrap",
  };
  const flatBtn = { ...btn, background: "#888" };

  if (!user) return <Login />;

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
        <button style={btn} onClick={() => supabase.auth.signOut()}>
          Logout
        </button>
      </div>

      <div style={{ marginBottom: "2rem" }}>
        <button
          style={{
            ...btn,
            background: activeTab === "parties" ? "#333" : "#f0f0f0",
            color: activeTab === "parties" ? "#fff" : "#000",
          }}
          onClick={() => setActiveTab("parties")}
        >
          Parties
        </button>
        <button
          style={{
            ...btn,
            background: activeTab === "registrations" ? "#333" : "#f0f0f0",
            color: activeTab === "registrations" ? "#fff" : "#000",
          }}
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
            value={partyName}
            onChange={(e) => setPartyName(e.target.value)}
   
          />
          <button style={btn} onClick={addParty}>
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
                      style={flatBtn}
                      onClick={() =>
                        navigator.clipboard.writeText(
                          `${window.location.origin}/form/${p.slug}`
                        )
                      }
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
  <div style={{ marginBottom: "1.5rem" }}>
  <div style={{
    padding: "10px",
    backgroundColor: "#f7f7f7",
    border: "1px solid #ddd",
    borderRadius: "6px",
    marginBottom: "0.75rem",
    fontWeight: "bold"
  }}>
    Total Registration Rows: {registrations.length}

  </div>

  
</div>


          <div style={{ margin: "1rem 0" }}>
            <input
              style={inputStyle}
              type="text"
              placeholder="Search IC or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <button style={flatBtn} onClick={handleSearch}>
              Search
            </button>
            <button
              style={btn}
              onClick={() => {
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
                <th style={thTdStyle}>Event</th>
                <th style={thTdStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {registrations.map((r, idx) => (
                <tr key={r.id}>
                  <td style={thTdStyle}>{idx + 1}</td>
                  <td style={thTdStyle}>
                    {editId === r.id ? (
                      <input
                        style={inputStyle}
                        value={editIC}
                        onChange={(e) => setEditIC(e.target.value)}
                      />
                    ) : (
                      r.ic_number
                    )}
                  </td>
                  <td style={thTdStyle}>
                    {editId === r.id ? (
                      <input
                        style={inputStyle}
                        value={editPhone}
                        onChange={(e) => setEditPhone(e.target.value)}
                      />
                    ) : (
                      r.phone_number
                    )}
                  </td>
                  <td style={thTdStyle}>{r.parties?.name || "—"}</td>
                  <td style={thTdStyle}>{r.events?.name || "—"}</td>
                  <td style={thTdStyle}>
                    {editId === r.id ? (
                      <>
                        <button style={btn} onClick={() => saveEdit(r.id)}>
                          💾 Save
                        </button>
                        <button style={flatBtn} onClick={() => setEditId(null)}>
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          style={flatBtn}
                          onClick={() => {
                            setEditId(r.id);
                            setEditIC(r.ic_number);
                            setEditPhone(r.phone_number);
                            setEditEventId(r.event_id);
                          }}
                        >
                          ✏️ Edit
                        </button>
                        <button
                          style={flatBtn}
                          onClick={() => deleteById(r.id)}
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
