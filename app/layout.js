import "./globals.css";

export const metadata = {
  title: "LiveKit Speech-to-Speech App",
  description: "A Next.js app with LiveKit for real-time audio communication",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
