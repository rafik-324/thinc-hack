import { Link } from "@tanstack/react-router";
import { createContext } from "react";
import { Button } from "@/components/ui/button";
import type { InboxClaim, PolicyReplayResult } from "@/lib/staff-inbox.functions";

export const SubmittedStaff = createContext<string | null>(null);

interface DemoClaim {
  title: string;
  ruleId: string;
  quoteName: string;
  replay: Required<
    Pick<PolicyReplayResult, "reference" | "revision" | "impacted_rules" | "needs_recheck" | "closed_retained">
  > & {
    recorded: { version: string; recommendation: string; rule: string; why: string };
    proposed: { version: string; recommendation: string; rule: string; why: string };
  };
}

// Fixed snapshots of the two fictional rehearsals. The demo never reads the live inbox.
const demoClaims: DemoClaim[] = [
  {
    title: "€1,300 repair quote",
    ruleId: "v1.3",
    quoteName: "itemized-1300.pdf",
    replay: {
      reference: "CLM-c5b20b0b-437d-44df-b85c-f6cca60bcafd",
      revision: 2,
      recorded: {
        version: "v1",
        recommendation: "routine_processing",
        rule: "ROUTINE_ALL_CHECKS_PASSED",
        why: "The repair quote is €1,300, within the policy's €1,500 limit. Required information is complete and no policy rule requires review or more information.",
      },
      proposed: {
        version: "v2",
        recommendation: "human_review",
        rule: "HR_QUOTE_LIMIT",
        why: "The repair quote is €1,300, above the policy's €1,200 limit.",
      },
      impacted_rules: ["HR_QUOTE_LIMIT"],
      needs_recheck: true,
      closed_retained: false,
    },
  },
  {
    title: "€1,800 repair quote",
    ruleId: "v1.1",
    quoteName: "itemized-1800.pdf",
    replay: {
      reference: "CLM-6106bae1-e2d5-423d-88ff-641fef7839d2",
      revision: 2,
      recorded: {
        version: "v1",
        recommendation: "human_review",
        rule: "HR_QUOTE_LIMIT",
        why: "The repair quote is €1,800, above the policy's €1,500 limit.",
      },
      proposed: {
        version: "v2",
        recommendation: "human_review",
        rule: "HR_QUOTE_LIMIT",
        why: "The repair quote is €1,800, above the policy's €1,200 limit.",
      },
      impacted_rules: ["HR_QUOTE_LIMIT"],
      needs_recheck: true,
      closed_retained: false,
    },
  },
];
const samplePdfs: Record<string, string> = {
  "sample-accident-report.pdf":
    "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIgL0Y0IDUgMCBSCj4+CmVuZG9iagoyIDAgb2JqCjw8Ci9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMSAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EtQm9sZCAvRW5jb2RpbmcgL1dpbkFuc2lFbmNvZGluZyAvTmFtZSAvRjIgL1N1YnR5cGUgL1R5cGUxIC9UeXBlIC9Gb250Cj4+CmVuZG9iago0IDAgb2JqCjw8Ci9CYXNlRm9udCAvVGltZXMtUm9tYW4gL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YzIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNSAwIG9iago8PAovQmFzZUZvbnQgL1RpbWVzLUJvbGQgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0Y0IC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKNiAwIG9iago8PAovQ29udGVudHMgMTAgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgOSAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNyAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDkgMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago4IDAgb2JqCjw8Ci9BdXRob3IgKFBvbGljeSBSZXBsYXkgZGVtbykgL0NyZWF0aW9uRGF0ZSAoRDoyMDAwMDEwMTAwMDAwMCswMCcwMCcpIC9DcmVhdG9yIChhbm9ueW1vdXMpIC9LZXl3b3JkcyAoKSAvTW9kRGF0ZSAoRDoyMDAwMDEwMTAwMDAwMCswMCcwMCcpIC9Qcm9kdWNlciAoUmVwb3J0TGFiIFBERiBMaWJyYXJ5IC0gXChvcGVuc291cmNlXCkpIAogIC9TdWJqZWN0ICh1bnNwZWNpZmllZCkgL1RpdGxlIChTYW1wbGUgbW90b3IgYWNjaWRlbnQgcmVwb3J0KSAvVHJhcHBlZCAvRmFsc2UKPj4KZW5kb2JqCjkgMCBvYmoKPDwKL0NvdW50IDEgL0tpZHMgWyA2IDAgUiBdIC9UeXBlIC9QYWdlcwo+PgplbmRvYmoKMTAgMCBvYmoKPDwKL0ZpbHRlciBbIC9BU0NJSTg1RGVjb2RlIC9GbGF0ZURlY29kZSBdIC9MZW5ndGggNzE0Cj4+CnN0cmVhbQpHYXRuJD8jUTJkJ1NjKUovJ2Q2N1s0X0hvXnRsVDBTTCxyMmUwPVM+Miw8MlYoXipVXnI7Lk0pWnNsdEYta19EajBvRjp1aFhiOmMkMyJVY2w1SlNSJCEyPGIuImNPSDwiSylsJiVGMyhLU2dzXjVeNVUnOFYmUmVaOWdoTjRHdFIoZCFSZ2guJDk4dXBtaUliVl5aLlokPXNZZ0lRI0w6KlNkLjhXU0wmbUltTmxaZy5yJkFkMD86IlFScCNoXCFfVUdFOFoqRG5EWlMyViVHRCI2SVVNNmcvYzJ1a1kwYFFAMTsuW0IuUUl0cF8zbjc7Om1EXk0iSkdCMTF1X2pCNkNHPDx0OU9WXCdEYyVaLC0oS3FJYFckN2xSZVJbWUI4MDw4NS4tSiE3LF4tb1U1bFVDdS9dP1BxUkpSdW4sZjFFU24zTERqJ1EmPTAuSkRCMWowOHFdMGgjWUZkaUorbl4oPEAwLVtxRDMvQ2FlZ2ReUz9TY0kyI0VXNUppTnImcyE0aEVHVSZsREthdUBrbDBwSyUtUGFJVUxxJW1jLS5jZmZValE+aCNLaSUqKXBrVTs8Y3UvMWkiNkA9cSElcUNDTiZsXDhtTlgtT25jRmEhRVE0O05Bb0J1UktlO3RHTihLR1FFcU9abTlsXE9vWFt1J1c/QThOMzNzVC4nQk43KFtgTl0oWiU7MUclKT5wOjBhT1g7VmNzOk0zcE4jPjQlNlhKNDwnPjVqWFxdOyVuX1UrO280NS47dUY1SEp0Qj9uPzNyUiJvPlRnPTstcVs9akhFMy80OUU1LCcyTiZHUWw7bUZabDBEW2ppZStzTDtOZSc/SzE7dGVvLWVaZUpcJUNWck1nNj8qJz9VRz0qIUs0PD1SNyslWyI/bF8mImJdI00hcGYlJ0IrSCdYUF4lYkpMKW1fS1hiT19MM10hUltVaEFIfj5lbmRzdHJlYW0KZW5kb2JqCnhyZWYKMCAxMQowMDAwMDAwMDAwIDY1NTM1IGYgCjAwMDAwMDAwNjEgMDAwMDAgbiAKMDAwMDAwMDEyMiAwMDAwMCBuIAowMDAwMDAwMjI5IDAwMDAwIG4gCjAwMDAwMDAzNDEgMDAwMDAgbiAKMDAwMDAwMDQ1MCAwMDAwMCBuIAowMDAwMDAwNTU4IDAwMDAwIG4gCjAwMDAwMDA3NjIgMDAwMDAgbiAKMDAwMDAwMDgzMCAwMDAwMCBuIAowMDAwMDAxMTIwIDAwMDAwIG4gCjAwMDAwMDExNzkgMDAwMDAgbiAKdHJhaWxlcgo8PAovSUQgCls8M2QzNmNiNTU2ZjkzYjBiNjMxZDgyZWNmOTQ2MDZhMTg+PDNkMzZjYjU1NmY5M2IwYjYzMWQ4MmVjZjk0NjA2YTE4Pl0KJSBSZXBvcnRMYWIgZ2VuZXJhdGVkIFBERiBkb2N1bWVudCAtLSBkaWdlc3QgKG9wZW5zb3VyY2UpCgovSW5mbyA4IDAgUgovUm9vdCA3IDAgUgovU2l6ZSAxMQo+PgpzdGFydHhyZWYKMTk4NAolJUVPRgo=",
  "itemized-1300.pdf":
    "JVBERi0xLjQKMSAwIG9iago8PCAvVHlwZSAvQ2F0YWxvZyAvUGFnZXMgMiAwIFIgPj4KZW5kb2JqCjIgMCBvYmoKPDwgL1R5cGUgL1BhZ2VzIC9Db3VudCAxIC9LaWRzIFs0IDAgUl0gPj4KZW5kb2JqCjMgMCBvYmoKPDwgL1R5cGUgL0ZvbnQgL1N1YnR5cGUgL1R5cGUxIC9CYXNlRm9udCAvSGVsdmV0aWNhIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nID4+CmVuZG9iago0IDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgL01lZGlhQm94IFswIDAgNTk1IDg0Ml0gL1Jlc291cmNlcyA8PCAvRm9udCA8PCAvRjEgMyAwIFIgPj4gPj4gL0NvbnRlbnRzIDUgMCBSID4+CmVuZG9iago1IDAgb2JqCjw8IC9MZW5ndGggMjA5ID4+CnN0cmVhbQpCVCAvRjEgMTEgVGYgMTUgVEwgNTAgNzgwIFRkCihGaWN0aW9uYWwgZGVtbyByZXBhaXIgZXN0aW1hdGUpIFRqIFQqCihSZXBhaXIgZXN0aW1hdGUpIFRqIFQqCihSZXBsYWNlbWVudCBidW1wZXIgcGFydHMgICAgRVVSIDgwMC4wMCkgVGogVCoKKEZpdHRpbmcgbGFib3VyICAgIEVVUiA1MDAuMDApIFRqIFQqCihUb3RhbCAgICBFVVIgMSwzMDAuMDApIFRqIFQqCkVUCmVuZHN0cmVhbQplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDA5IDAwMDAwIG4gCjAwMDAwMDAwNTggMDAwMDAgbiAKMDAwMDAwMDExNSAwMDAwMCBuIAowMDAwMDAwMjEyIDAwMDAwIG4gCjAwMDAwMDAzMzggMDAwMDAgbiAKdHJhaWxlcgo8PCAvU2l6ZSA2IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgo1OTcKJSVFT0Y=",
  "itemized-1800.pdf":
    "JVBERi0xLjQKJZOMi54gUmVwb3J0TGFiIEdlbmVyYXRlZCBQREYgZG9jdW1lbnQgKG9wZW5zb3VyY2UpCjEgMCBvYmoKPDwKL0YxIDIgMCBSIC9GMiAzIDAgUiAvRjMgNCAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL0Jhc2VGb250IC9IZWx2ZXRpY2EgL0VuY29kaW5nIC9XaW5BbnNpRW5jb2RpbmcgL05hbWUgL0YxIC9TdWJ0eXBlIC9UeXBlMSAvVHlwZSAvRm9udAo+PgplbmRvYmoKMyAwIG9iago8PAovQmFzZUZvbnQgL0hlbHZldGljYS1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMiAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjQgMCBvYmoKPDwKL0Jhc2VGb250IC9UaW1lcy1Cb2xkIC9FbmNvZGluZyAvV2luQW5zaUVuY29kaW5nIC9OYW1lIC9GMyAvU3VidHlwZSAvVHlwZTEgL1R5cGUgL0ZvbnQKPj4KZW5kb2JqCjUgMCBvYmoKPDwKL0NvbnRlbnRzIDkgMCBSIC9NZWRpYUJveCBbIDAgMCA1OTUuMjc1NiA4NDEuODg5OCBdIC9QYXJlbnQgOCAwIFIgL1Jlc291cmNlcyA8PAovRm9udCAxIDAgUiAvUHJvY1NldCBbIC9QREYgL1RleHQgL0ltYWdlQiAvSW1hZ2VDIC9JbWFnZUkgXQo+PiAvUm90YXRlIDAgL1RyYW5zIDw8Cgo+PiAKICAvVHlwZSAvUGFnZQo+PgplbmRvYmoKNiAwIG9iago8PAovUGFnZU1vZGUgL1VzZU5vbmUgL1BhZ2VzIDggMCBSIC9UeXBlIC9DYXRhbG9nCj4+CmVuZG9iago3IDAgb2JqCjw8Ci9BdXRob3IgKFBvbGljeSBSZXBsYXkgZmljdGlvbmFsIGRlbW8gd29ya3Nob3ApIC9DcmVhdGlvbkRhdGUgKEQ6MjAwMDAxMDEwMDAwMDArMDAnMDAnKSAvQ3JlYXRvciAoYW5vbnltb3VzKSAvS2V5d29yZHMgKCkgL01vZERhdGUgKEQ6MjAwMDAxMDEwMDAwMDArMDAnMDAnKSAvUHJvZHVjZXIgKFJlcG9ydExhYiBQREYgTGlicmFyeSAtIFwob3BlbnNvdXJjZVwpKSAKICAvU3ViamVjdCAodW5zcGVjaWZpZWQpIC9UaXRsZSAoUmVwYWlyIGVzdGltYXRlIDEwNDgtQyB8IFdlc3RlbmQgTW90b3IgV29ya3MpIC9UcmFwcGVkIC9GYWxzZQo+PgplbmRvYmoKOCAwIG9iago8PAovQ291bnQgMSAvS2lkcyBbIDUgMCBSIF0gL1R5cGUgL1BhZ2VzCj4+CmVuZG9iago5IDAgb2JqCjw8Ci9GaWx0ZXIgWyAvQVNDSUk4NURlY29kZSAvRmxhdGVEZWNvZGUgXSAvTGVuZ3RoIDgyNQo+PgpzdHJlYW0KR2F0bTo5bGxkWCZBQHNCbSc1cmJNQnFmcGEjN3BgQl8qcjo6IVNWSWdNLV82ISUzdFs/VilSaUQlYD0zSkprN2xpOWJrZV0uNEsvclsuMDc5N1VxQCoxW11iJ18zT11MKUF1OUBAQnQnQDJZcW1QMi9BLFEmSilEUmAkOXImMD88bF0/Z0ZbZE5QcSpBMUFdVGlQWT4xU2ttWy5pOVZaJlIpL0k3bSlUI0tqTSlsPGU6ZiM1JDRkVyZMdCJyWW5OQSQ4bmBfUyEvNENpJk8+NGMxZTk9cTQ9SUE0ZE5vNF9YPWhUOCo3NC1zcCxjK24zcGxUUWRWKGhkMVc/UEVbVEVOUC5TLyFhOGEiKV4vIyUkWjxXLjEmbCpOUFVdLXNNPTw+JEojWCRyXWwtMCNRVDE2SzNlYm05bVYjL0gnVE9mW0UiSSQwT0lhP2dyLFxCP0QvbCIzIjRKQiloUm5IMHVoVzRTWTFFPj9xWVpBM1heZmItTixSTSgnSFk9KU83PzYqJ2teLjdaYGRjR3RYRS0uSE9AQy9hQG9cLU1mI3I6SzdeYGxUVmVGMS91VkNVWiVWUT5sPFhnVGV1Il1NIS1CX3AsWEZxIyI2bTtRVT9ZPnVBK1k+SEwwLDdiK3RWQWguXjdWSj1MP1dmXmwqWDJaaFQ6bFBeXT9tOiMqTXNpRlw5akNGIWlpTDMiPi5TUyROb1ZpZGZIXT9BQmlCP0hJKnQwJ1hkWzZHQWFxSDY+Uz1xbyxbTGQpUi4nRkpPI2QuciI3ZDxjTiVjO0dOcGUxbnFVRHJqYmAkOTtXaiZOUiQ3alZjZ0NDPTYiJl5DNyxea09kVWk4QWhPSk0zI1FjYVg2NixxPlJbVE5pNFRhZlVTKCFXKzwqV2xUbW9ZbHQ1LiV1O1hESjNJJVw6alFtaj45TFJPa2RARShwKjRENnImaDtHbjdNW1xlTW5YK2kwc1EoaFFXUjY4TSpKRUAiPW5fWXFRbk1kYmNUXk1EIkY7MD9ZW1YyQmBacDNqJnRHJj8wYydpbU9hWE5VcCFlZ09oU1snXjc1VUNpcSUncXFVSzFsK0I5T0N0ND9xI2Q3aTJsY34+ZW5kc3RyZWFtCmVuZG9iagp4cmVmCjAgMTAKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDYxIDAwMDAwIG4gCjAwMDAwMDAxMTIgMDAwMDAgbiAKMDAwMDAwMDIxOSAwMDAwMCBuIAowMDAwMDAwMzMxIDAwMDAwIG4gCjAwMDAwMDA0MzkgMDAwMDAgbiAKMDAwMDAwMDY0MiAwMDAwMCBuIAowMDAwMDAwNzEwIDAwMDAwIG4gCjAwMDAwMDEwMzUgMDAwMDAgbiAKMDAwMDAwMTA5NCAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9JRCAKWzxiNzcxNDdjYTc2ZWI5MDFlNjk2YjZiMDZlZDk1ZTlhYj48Yjc3MTQ3Y2E3NmViOTAxZTY5NmI2YjA2ZWQ5NWU5YWI+XQolIFJlcG9ydExhYiBnZW5lcmF0ZWQgUERGIGRvY3VtZW50IC0tIGRpZ2VzdCAob3BlbnNvdXJjZSkKCi9JbmZvIDcgMCBSCi9Sb290IDYgMCBSCi9TaXplIDEwCj4+CnN0YXJ0eHJlZgoyMDA5CiUlRU9GCg==",
};
export function findDemoClaim(reference: string) {
  return demoClaims.find((claim) => claim.replay.reference === reference);
}
export const demoRows: InboxClaim[] = demoClaims.map(({ replay, ruleId }) => ({
  reference: replay.reference,
  rule_id: ruleId,
  revision: replay.revision,
  recommendation: replay.recorded.recommendation,
  effective_recommendation: replay.recorded.recommendation,
  submitted_at: null,
}));
export function demoEvidence({ replay, ruleId, quoteName }: DemoClaim) {
  const { recorded } = replay;
  return {
    reference: replay.reference,
    category: {
      recommendation: recorded.recommendation,
      effective_recommendation: recorded.recommendation,
      rule_id: ruleId,
      revision: replay.revision,
    },
    evidence: {
      decision: {
        recommendation: recorded.recommendation,
        primary_rule_id: recorded.rule,
        policy_version: recorded.version,
        audit: { detail: { employee: { why: recorded.why } } },
      },
    },
    documents: ["sample-accident-report.pdf", quoteName].map((name, position) => ({
      name,
      position,
    })),
    corrections: [],
  };
}
export function demoDocument(claim: DemoClaim, position: number) {
  const file = demoEvidence(claim).documents[position];
  const bytes = file && samplePdfs[file.name];
  if (!file || !bytes) throw new Error("Sample document unavailable");
  return { name: file.name, content_base64: bytes };
}

export function StaffGate({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const denied = /Unauthorized|FORBIDDEN:/.test(message);
  return (
    <section className="rounded-lg border border-border bg-card p-5">
      <h2 className="text-base font-medium">{denied ? "Claim unavailable" : "Claim system unavailable"}</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        {denied ? "Choose a sample claim from the demo inbox." : "The insurer service could not load these records."}
      </p>
      <div className="mt-4 flex gap-2">
        <Button asChild size="sm" variant="outline">
          <Link to="/submitted">Back to inbox</Link>
        </Button>
        {onRetry && !denied && (
          <Button size="sm" variant="outline" onClick={onRetry}>
            Retry
          </Button>
        )}
      </div>
    </section>
  );
}
