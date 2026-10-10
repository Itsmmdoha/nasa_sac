import { FarmerForm } from "@/components/FarmerForm";
import { Nav } from "@/components/Nav";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[var(--surface-page)]">
      <Nav />
      <div className="mx-auto max-w-lg space-y-4 px-4 py-6">
        <FarmerForm />
      </div>
    </main>
  );
}
