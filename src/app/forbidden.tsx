export default function Forbidden() {
  return (
    <main className="min-h-dvh grid place-items-center px-6">
      <div className="max-w-sm text-center space-y-3">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground">403</p>
        <h1 className="text-2xl font-semibold">No access</h1>
        <p className="text-sm text-muted-foreground">Your account does not have the role required for this area.</p>
        <a href="/api/admin/logout" className="text-sm underline underline-offset-4">
          Log out
        </a>
      </div>
    </main>
  );
}
