import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/** Custom favicon — teal node on ink. */
export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#07090e",
          borderRadius: 8,
        }}
      >
        <div
          style={{
            width: 14,
            height: 14,
            borderRadius: 999,
            background: "#2dd4bf",
            boxShadow: "0 0 10px #2dd4bf",
          }}
        />
      </div>
    ),
    { ...size }
  );
}
