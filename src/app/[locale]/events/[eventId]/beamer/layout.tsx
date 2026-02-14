export default function BeamerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html className="h-screen overflow-hidden bg-black">
      <body className="h-screen overflow-hidden bg-black text-white">
        {children}
      </body>
    </html>
  );
}
