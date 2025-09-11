// App.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import "./App.css";

const api = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 10000,
});

export default function App() {
  const [items, setItems] = useState([]);
  const [expanded, setExpanded] = useState({});
  const [allExpanded, setAllExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let canceled = false;
    setLoading(true);
    api
      .get("/users")
      .then((res) => {
        if (!canceled) {
          setItems(res.data);
        }
      })
      .catch((err) => {
        if (!canceled) setError(err.message || "Fetch list failed");
      })
      .finally(() => {
        if (!canceled) setLoading(false);
      });
    return () => {
      canceled = true;
    };
  }, []);

  const toggle = (id) => {
    setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  // Toggle tất cả item cùng lúc
  const toggleAll = () => {
    const newState = !allExpanded;
    setAllExpanded(newState);

    const newExpanded = {};
    items.forEach((i) => {
      newExpanded[i.id] = newState;
    });
    setExpanded(newExpanded);
  };

  if (loading) return <p>Đang tải danh sách…</p>;
  if (error) return <p style={{ color: "red" }}>Lỗi: {error}</p>;

  return (
    <div style={{ maxWidth: 720, margin: "40px auto", fontFamily: "sans-serif" }}>
      <h1>Danh sách Users</h1>

      <button
        style={{
          marginBottom: 20,
          padding: "8px 16px",
          borderRadius: 8,
          cursor: "pointer",
        }}
        onClick={toggleAll}
      >
        {allExpanded ? "Close All" : "Open All"}
      </button>

      {items.map((u) => (
        <div
          key={u.id}
          style={{
            border: "1px solid #ddd",
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            }}
          >
            <div>
              <strong>{u.name}</strong>
              <div style={{ fontSize: 12, color: "#666" }}>{u.username}</div>
            </div>
            <button onClick={() => toggle(u.id)}>{expanded[u.id] ? "Đóng" : "Xem chi tiết"}</button>
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

function UserDetails({ userId }) {
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError("");

    api
      .get(`/users/${userId}`, { signal: controller.signal })
      .then((res) => setDetail(res.data))
      .catch((err) => {
        if (err.name !== "CanceledError") {
          setError(err.message || "Fetch detail failed");
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [userId]);

  if (loading) return <p>Đang tải chi tiết…</p>;
  if (error) return <p style={{ color: "red" }}>Lỗi: {error}</p>;
  if (!detail) return null;

  return (
    <div style={{ background: "#fafafa", borderRadius: 10, padding: 12 }}>
      <div>Email: {detail.email}</div>
      <div>Phone: {detail.phone}</div>
      <div>Company: {detail?.company?.name}</div>
      <div>City: {detail?.address?.city}</div>
    </div>
  );
}
