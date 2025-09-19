export default function LoadingOverlay({ show, text = "Loading…" }) {
  if (!show) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.35)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        backdropFilter: "blur(1px)",
      }}
    >
      <div
        style={{
          background: "white",
          padding: "14px 18px",
          borderRadius: 12,
          minWidth: 140,
          display: "flex",
          alignItems: "center",
          gap: 12,
          boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
        }}
      >
        <div
          style={{
            width: 18,
            height: 18,
            border: "3px solid #ddd",
            borderTopColor: "#555",
            borderRadius: "50%",
            animation: "spin 0.8s linear infinite",
          }}
        />
        <span style={{ fontFamily: "sans-serif" }}>{text}</span>
      </div>
      <style>{`@keyframes spin {to {transform: rotate(360deg)}}`}</style>
    </div>
  );
}
