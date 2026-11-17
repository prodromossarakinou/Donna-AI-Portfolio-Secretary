import { requireAdmin } from "@/lib/admin";
import { getPrivacy } from "@/lib/privacy";
import { PrivacyForm } from "@/components/admin/privacy-form";

export default async function AdminPrivacyPage() {
  await requireAdmin();
  const content = await getPrivacy();
  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-semibold">Privacy page</h1>
        <p className="text-sm text-muted-foreground">
          The public text at /privacy, in both languages. Keep it true to what the site actually stores.
        </p>
      </header>
      <PrivacyForm initial={content} />
    </div>
  );
}
