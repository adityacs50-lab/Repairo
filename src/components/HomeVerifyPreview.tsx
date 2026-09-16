import { PreviewWindow } from "@/components/PreviewWindow";

const VERIFY_LOG = `$ npx tsc --noEmit --project tsconfig.json
$ npx repairo-cli verify --consumers src/payments

src/payments/customer.ts — 0 errors
src/jobs/reconcile.ts — 0 errors

python -m py_compile src/shipments_client.py — ok

verify: passed · safe to open PR`;

export function HomeVerifyPreview() {
  return (
    <PreviewWindow
      figLabel=">_ [ fig. 4 — verify ]⌗"
      path="fixtures/payments-ts · tsc + syntax"
      status={{ label: "PASSED", live: false }}
      footer={
        <>
          <span>compiler gate</span>
          <span>fail-closed on ambiguity</span>
        </>
      }
    >
      <pre className="preview-terminal preview-terminal--verify">
        <code>{VERIFY_LOG}</code>
      </pre>
    </PreviewWindow>
  );
}
