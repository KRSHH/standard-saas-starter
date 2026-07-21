import { ImageResponse } from "next/og";

import { siteConfig } from "@/lib/site";

export const runtime = "edge";
export const alt = siteConfig.title;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "flex-start",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%)",
        padding: "80px",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "64px",
            height: "64px",
            background: "white",
            color: "black",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "40px",
            fontWeight: 800,
            borderRadius: "12px",
          }}
        >
          {siteConfig.name.charAt(0)}
        </div>
        <span style={{ fontSize: "32px", fontWeight: 600, opacity: 0.8 }}>
          {siteConfig.name}
        </span>
      </div>
      <h1
        style={{
          fontSize: "72px",
          fontWeight: 800,
          lineHeight: 1.1,
          marginTop: "40px",
          maxWidth: "900px",
        }}
      >
        Ship your SaaS in days, not weeks
      </h1>
      <p
        style={{
          fontSize: "28px",
          opacity: 0.7,
          marginTop: "24px",
          maxWidth: "800px",
        }}
      >
        A production-ready Next.js SaaS template — auth, billing, observability,
        and security included.
      </p>
    </div>,
    { ...size },
  );
}
