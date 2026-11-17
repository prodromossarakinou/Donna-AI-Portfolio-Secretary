import { requireAdmin } from "@/lib/admin";
import { SandboxForm } from "@/components/admin/sandbox-form";

export default async function SandboxPage() {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Test Donna</h1>
        <p className="text-sm text-muted-foreground">
          Runs the same guard, retrieval and answer as the visitor chat. Not saved as a conversation; its tokens are counted in Usage.
        </p>
      </header>
      <SandboxForm />
    </div>
  );
}
