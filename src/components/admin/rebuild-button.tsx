"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { rebuildProjects } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";

export function RebuildButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const result = await rebuildProjects();
          if (result.error) toast.error(result.error, { duration: 15000 });
          else toast.success("Project and education cards rebuilt");
        })
      }
    >
      {pending ? "Rebuilding…" : "Rebuild cards"}
    </Button>
  );
}
