import { requireAdmin } from "@/lib/admin";
import { GapsChat } from "@/components/admin/gaps-chat";

export default async function GapsPage() {
  await requireAdmin();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Knowledge gaps</h1>
        <p className="text-sm text-muted-foreground">
          Talk to Donna about what she is missing. She looks at your documents, projects and timeline, and at the last
          80 visitor questions, including the ones she could not answer.
        </p>
      </header>
      <GapsChat />
    </div>
  );
}
