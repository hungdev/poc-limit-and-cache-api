// App.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import queue from "./concurrencyQueue";
import LoadingOverlay from "./LoadingOverlay";
import UserDetails from "./UserDetails";

const api = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 10000,
});

export default function App() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [listLoading, setListLoading] = useState(false);
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  // Listen to queue state to show/hide overlay (light debounce to avoid flickering)
  useEffect(() => {
    let t;
    const unsub = queue.subscribe(({ active }) => {
      clearTimeout(t);
      t = setTimeout(() => setBusy(active > 0), 120);
    });
    return () => {
      clearTimeout(t);
      unsub();
    };
  }, []);

  // Fetch list
  useEffect(() => {
    let canceled = false;
    setListLoading(true);
    setErr("");
    api
      .get("/users")
      .then((res) => {
        if (!canceled) setItems(res.data);
      })
      .catch((e) => {
        if (!canceled) setErr(e.message || "Fetch list failed");
      })
      .finally(() => {
        if (!canceled) setListLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  const toggleAll = () => {
    const next = !allExpanded;
    setAllExpanded(next);
    const map = {};
    items.forEach((i) => (map[i.id] = next));
    setExpanded(map);
  };

  if (listLoading) return <p>Loading list…</p>;
  if (err) return <p style={{ color: "red" }}>Error: {err}</p>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      {/* App-wide overlay */}
      <LoadingOverlay show={busy} text="Loading data…" />

      <h1>Users List</h1>
      <button
        style={{ marginBottom: 20, padding: "8px 16px", borderRadius: 8, cursor: "pointer" }}
        onClick={toggleAll}
      >
        {allExpanded ? "Close All" : "Open All"}
      </button>

      {items.map((u) => (
        <div
          key={u.id}
          style={{ border: "1px solid #ddd", borderRadius: 12, padding: 16, marginBottom: 12 }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <strong>{u.name}</strong>
              <div style={{ fontSize: 12, color: "#666" }}>{u.username}</div>
            </div>
            <button onClick={() => toggle(u.id)}>{expanded[u.id] ? "Close" : "View details"}</button>
          </div>

          {expanded[u.id] && (
            <div style={{ marginTop: 12 }}>
              <UserDetails userId={u.id} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
