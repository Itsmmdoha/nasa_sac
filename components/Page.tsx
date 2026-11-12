import { Nav } from "@/components/Nav";

export function Page({
  place,
  children,
}: {
  place?: string;
  children: React.ReactNode;
}) {
  return (
    <main className="shell">
      <Nav place={place} />
      <div className="column">{children}</div>
    </main>
  );
}
