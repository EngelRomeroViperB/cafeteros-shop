import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Cafeteros Shop – Camisetas de la Selección Colombia 2026";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #0f172a 0%, #003893 50%, #0f172a 100%)",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* Top stripe */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "8px",
            display: "flex",
          }}
        >
          <div style={{ flex: 2, background: "#fcd116" }} />
          <div style={{ flex: 1, background: "#003893" }} />
          <div style={{ flex: 1, background: "#ce1126" }} />
        </div>

        {/* Logo circle */}
        <div
          style={{
            width: "100px",
            height: "100px",
            borderRadius: "50%",
            background: "#fcd116",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            marginBottom: "24px",
            border: "4px solid #003893",
            boxShadow: "0 0 40px rgba(252,209,22,0.4)",
          }}
        >
          <span
            style={{
              fontSize: "42px",
              fontWeight: 900,
              color: "#003893",
            }}
          >
            CF
          </span>
        </div>

        {/* Title */}
        <h1
          style={{
            fontSize: "64px",
            fontWeight: 900,
            color: "#ffffff",
            margin: "0 0 8px 0",
            letterSpacing: "-1px",
          }}
        >
          CAFETEROS SHOP
        </h1>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "28px",
            color: "#fcd116",
            margin: 0,
            fontWeight: 700,
          }}
        >
          Camisetas de la Selección Colombia 2026
        </p>

        {/* Description */}
        <p
          style={{
            fontSize: "20px",
            color: "#94a3b8",
            margin: "16px 0 0 0",
            maxWidth: "700px",
            textAlign: "center",
          }}
        >
          Camisetas del mundial · Conjuntos deportivos · Envíos a toda Colombia
        </p>

        {/* Bottom stripe */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            width: "100%",
            height: "8px",
            display: "flex",
          }}
        >
          <div style={{ flex: 2, background: "#fcd116" }} />
          <div style={{ flex: 1, background: "#003893" }} />
          <div style={{ flex: 1, background: "#ce1126" }} />
        </div>

        {/* URL */}
        <p
          style={{
            position: "absolute",
            bottom: "24px",
            right: "32px",
            fontSize: "18px",
            color: "#64748b",
            margin: 0,
          }}
        >
          cafeteros.shop
        </p>
      </div>
    ),
    { ...size },
  );
}
