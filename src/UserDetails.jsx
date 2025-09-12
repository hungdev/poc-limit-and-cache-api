import { useEffect, useState } from "react";
import axios from "axios";
import queue from "./concurrencyQueue"; // version without delay as requested
import apiCache from "./apiCache";

const api = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 10000,
});

// (optional) simulate slow API response for easier monitoring
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function UserDetails({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const key = `user:${userId}`;

    setErr("");
    setLoading(true);

    // 1) If fresh cache exists -> display immediately, no need to queue/enqueue
    const cached = apiCache.peek(key);
    if (cached) {
      setData(cached);
      setLoading(false);
      return () => {
        mounted = false;
      };
    }

    // 2) No cache yet -> enqueue to respect concurrency limit
    queue
      .enqueue(async () => {
        // Use getOrFetch to dedupe requests with same key
        return apiCache.getOrFetch(
          key,
          async () => {
            const res = await api.get(`/users/${userId}`);
            await delay(2000); // simulate slow server processing 2s (can be removed)
            return res.data;
          },
          { ttl: 5 * 60 * 1000 }
        ); // TTL 5 minutes
      })
      .then((val) => {
        if (mounted) {
          setData(val);
        }
      })
      .catch((e) => {
        if (mounted) setErr(e.message || "Fetch detail failed");
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });

    return () => {
      mounted = false;
    };
  }, [userId]);

  if (loading) return <p>Loading details (id {userId})…</p>;
  if (err) return <p style={{ color: "red" }}>Error: {err}</p>;
  if (!data) return null;

  return (
    <div style={{ background: "#fafafa", borderRadius: 10, padding: 12 }}>
      <div>Email: {data.email}</div>
      <div>Phone: {data.phone}</div>
      <div>Company: {data?.company?.name}</div>
      <div>City: {data?.address?.city}</div>
    </div>
  );
}
