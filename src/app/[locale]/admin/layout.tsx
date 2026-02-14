import { Header } from '@/components/layout';
import { Footer } from '@/components/layout';

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="container mx-auto flex-1 px-4 py-8">{children}</main>
      <Footer />
    </div>
  );
}
