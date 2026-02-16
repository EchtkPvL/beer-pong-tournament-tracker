import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Beer Pong Tournament Tracker",
  description: "Manage beer pong tournaments with brackets, timers, and live updates",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
