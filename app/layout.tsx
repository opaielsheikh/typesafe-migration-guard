import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Typesafe Migration Guard | Production-Grade DDL Gatekeeper",
  description:
    "Automated safety reviewer that intercepts database migrations and uses the TypeSafe AI SDK (Jev model) to block destructive operations in production environments.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
