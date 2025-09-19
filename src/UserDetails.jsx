// UserDetails.jsx
import { useEffect, useState } from "react";
import axios from "axios";
import queue from "./concurrencyQueue"; // queue has publish state
import apiCache from "./apiCache"; // cache TTL + dedupe

const api = axios.create({
  baseURL: "https://jsonplaceholder.typicode.com",
  timeout: 10000,
});

// Optional: simulate slow API response for easy observation
const delay = (ms) => new Promise((r) => setTimeout(r, ms));

export default function UserDetails({ userId }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    let mounted = true;
    const key = `user:${userId}`;

    const run = async () => {
      setErr("");
      setLoading(true);

      // 1) Cache hit => display immediately, don't call queue
      const cached = apiCache.peek(key);
      if (cached) {
        if (mounted) {
          setData(cached);
          setLoading(false);
        }
        return;
      }

      try {
        // 2) No cache yet => put in queue to respect concurrency limit
        const val = await queue.enqueue(async () => {
          return apiCache.getOrFetch(
            key,
            async () => {
              const res = await api.get(`/users/${userId}`);
              await delay(1000); // simulate slow response 1s (can be removed)
              return res.data;
            },
            { ttl: 5 * 60 * 1000 } // 5 minutes
          );
        });

        if (mounted) setData(val);
      } catch (e) {
        if (mounted) setErr(e?.message || "Fetch detail failed");
      } finally {
        if (mounted) setLoading(false);
      }
    };

    run();
    return () => {
      mounted = false;
    }; // avoid setState after unmount (doesn't cancel request)
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
