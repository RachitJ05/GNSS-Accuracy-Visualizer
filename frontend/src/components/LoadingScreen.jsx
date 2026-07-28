export default function LoadingScreen() {
  return (
    <div
      style={{
        height: "100vh",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "24px",
        fontWeight: "600",
      }}
    >
      Waiting for GNSS Receiver...
    </div>
  );
}