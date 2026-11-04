import { TriangleAlert } from "lucide-react";

/** Visible reminder that legal texts are templates until reviewed. */
export function LegalTemplateNotice() {
  return (
    <p className="flex gap-2 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
      <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>
        Template: this text must be completed with the operator&apos;s details and reviewed by a legal professional
        before the platform goes live. Set <code>NEXT_PUBLIC_LEGAL_*</code> variables and remove this notice in{" "}
        <code>src/components/legal-notice.tsx</code>.
      </span>
    </p>
  );
}
