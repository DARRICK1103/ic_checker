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

  const [selectedParty, setSelectedParty] = useState("All");

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
    const { data: partiesData } = await supabase
      .from("parties")
      .select("*, event_limits(limits, event_id, events(name))")
      .order("name");

    setParties(partiesData || []);
  };

  const fetchEvents = async () => {
    const { data } = await supabase.from("events").select("*");
    const map = {};
    data.forEach((e) => (map[e.id] = e.name));
    setEventsMap(map);
  };

  const fetchRegistrations = async () => {
    const chunkSize = 1000; // Supabase hard cap per request
    let allData = [];
    let from = 0;
    let to = chunkSize - 1;

    while (true) {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, parties(name), events(id, name)")
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        console.error("Error fetching registrations:", error.message);
        break;
      }

      if (!data || data.length === 0) {
        break; // no more rows
      }

      allData = [...allData, ...data];

      if (data.length < chunkSize || allData.length >= 10000) {
        break; // stop when fewer than chunkSize returned OR hit 10k cap
      }

      from += chunkSize;
      to += chunkSize;
    }

    setRegistrations(allData);

    // Count registrations per event
    const counts = {};
    for (const reg of allData) {
      const eventName = reg.events?.name;
      if (eventName) {
        counts[eventName] = (counts[eventName] || 0) + 1;
      }
    }
    setEventCounts(counts);
  };

  const handleSearch = async () => {
    const chunkSize = 1000;
    let allData = [];
    let from = 0;
    let to = chunkSize - 1;

    while (true) {
      const { data, error } = await supabase
        .from("registrations")
        .select("*, parties(name), events(id, name)")
        .order("id", { ascending: true })
        .range(from, to);

      if (error) {
        console.error("Search error:", error.message);
        break;
      }

      if (!data || data.length === 0) break;

      allData = [...allData, ...data];

      if (data.length < chunkSize || allData.length >= 10000) break;

      from += chunkSize;
      to += chunkSize;
    }

    // ✅ Apply filters
    let filtered = allData;

    if (searchTerm) {
      filtered = filtered.filter(
        (r) =>
          r.ic_number?.includes(searchTerm) ||
          r.phone_number?.includes(searchTerm)
      );
    }

    if (selectedParty !== "All") {
      filtered = filtered.filter((r) => r.parties?.name === selectedParty);
    }

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

  const insertEventLimits = async (partyId, limits) => {
    // Get event IDs from the events table
    const { data: events, error: eventError } = await supabase
      .from("events")
      .select("id, name");

    if (eventError) {
      alert("Failed to fetch events: " + eventError.message);
      return;
    }

    const rows = [];

    for (const [eventName, limit] of Object.entries(limits)) {
      const event = events.find((e) => e.name === eventName);
      if (!event) continue;
      rows.push({
        party_id: partyId,
        event_id: event.id,
        limits: limit,
      });
    }

    if (rows.length === 0) return;

    const { error: insertError } = await supabase
      .from("event_limits")
      .insert(rows);

    if (insertError) {
      alert("Error inserting limits: " + insertError.message);
    } else {
      console.log("Event limits inserted:", rows);
    }
  };

  const addParty = async () => {
    if (!partyName) return;

    const limitStage = prompt("Set limit for TheStage7.0:");
    const limitBlast = prompt("Set limit for Blast Your Stage:");

    const slug = partyName.toLowerCase().replace(/\s+/g, "-");

    const { error: insertError } = await supabase
      .from("parties")
      .insert([{ name: partyName, slug }]);

    if (insertError) {
      alert(insertError.message);
      return;
    }

    // ⚠️ Don't redeclare `const { ... }`, use different name
    const { data: partyData, error: fetchError } = await supabase
      .from("parties")
      .select("id")
      .eq("slug", slug)
      .single();

    if (fetchError) {
      alert(fetchError.message);
      return;
    }

    await insertEventLimits(partyData.id, {
      "TheStage7.0": parseInt(limitStage),
      "Blast Your Stage": parseInt(limitBlast),
    });

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
                <th style={thTdStyle}>TheStage7.0 Limit</th>
                <th style={thTdStyle}>Blast Your Stage Limit</th>
                <th style={thTdStyle}>Form Link</th>
                <th style={thTdStyle}>Copy</th>
              </tr>
            </thead>

            <tbody>
              {parties.map((p, idx) => {
                const limitStage = p.event_limits?.find(
                  (el) => el.events?.name === "TheStage7.0"
                )?.limits;

                const limitBlast = p.event_limits?.find(
                  (el) => el.events?.name === "Blast Your Stage"
                )?.limits;

                return (
                  <tr key={p.id}>
                    <td style={thTdStyle}>{idx + 1}</td>
                    <td style={thTdStyle}>{p.name}</td>
                    <td style={thTdStyle}>{limitStage ?? "—"}</td>
                    <td style={thTdStyle}>{limitBlast ?? "—"}</td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === "registrations" && (
        <div>
          <div style={{ marginBottom: "1.5rem" }}>
            <div
              style={{
                padding: "10px",
                backgroundColor: "#f7f7f7",
                border: "1px solid #ddd",
                borderRadius: "6px",
                marginBottom: "0.75rem",
                fontWeight: "bold",
              }}
            >
              Total Registration Rows: {registrations.length}
            </div>
          </div>

          <div
            style={{
              margin: "1rem 0",
              display: "flex",
              gap: "8px",
              alignItems: "center",
            }}
          >
            {/* Search input */}
            <input
              style={{ ...inputStyle, width: "200px" }}
              type="text"
              placeholder="Search IC or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            {/* Dropdown for party filter */}
            <select
              style={{ ...inputStyle, width: "280px" }} // ⬅️ increase width here
              value={selectedParty}
              onChange={(e) => setSelectedParty(e.target.value)}
            >
              <option value="All">All Parties</option>
              {parties.map((p) => (
                <option key={p.id} value={p.name}>
                  {p.name}
                </option>
              ))}
            </select>

            <button style={flatBtn} onClick={handleSearch}>
              Search
            </button>
            <button
              style={btn}
              onClick={() => {
                setSearchTerm("");
                setSelectedParty("All");
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
                <th style={thTdStyle}>Ticket</th> {/* New column */}
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

                  {/* ✅ Redeem Tickets checkbox */}
                  <td style={thTdStyle}>
                    <input
                      type="checkbox"
                      checked={r.redeem_ticket || false}
                      onChange={async (e) => {
                        const newValue = e.target.checked;
                        await supabase
                          .from("registrations")
                          .update({ redeem_ticket: newValue })
                          .eq("id", r.id);
                        fetchRegistrations(); // refresh
                      }}
                    />
                  </td>

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
