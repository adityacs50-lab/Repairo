import type { ApiChange, ConsumerFile, ImpactMatch } from "./types";

function linesOf(content: string): string[] {
  return content.split(/\r?\n/);
}

function findSymbolHits(
  file: ConsumerFile,
  symbols: string[],
  changeId: string,
  reason: string,
  confidence: ImpactMatch["confidence"],
): ImpactMatch[] {
  const hits: ImpactMatch[] = [];
  const lines = linesOf(file.content);

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const symbol of symbols) {
      const index = line.indexOf(symbol);
      if (index === -1) continue;
      hits.push({
        file: file.path,
        line: i + 1,
        column: index + 1,
        snippet: line.trim(),
        symbol,
        changeId,
        confidence,
        reason,
      });
    }
  }

  return hits;
}

function uniqueImpacts(impacts: ImpactMatch[]): ImpactMatch[] {
  const seen = new Set<string>();
  return impacts.filter((impact) => {
    const key = `${impact.file}:${impact.line}:${impact.symbol}:${impact.changeId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function findImpactedCode(
  changes: ApiChange[],
  files: ConsumerFile[],
): ImpactMatch[] {
  const impacts: ImpactMatch[] = [];

  for (const change of changes) {
    for (const file of files) {
      if (change.kind === "endpoint-removed" && change.path) {
        // Match the literal URL prefix before any {template} segment,
        // e.g. /v1/apps/{appId}/keys -> /v1/apps/
        const literalPrefix = change.path.split("{")[0].replace(/\/+$/, "");
        if (literalPrefix.length >= 5) {
          impacts.push(
            ...findSymbolHits(
              file,
              [literalPrefix],
              change.id,
              `Calls removed endpoint ${change.operation ? change.operation.toUpperCase() + " " : ""}${change.path}`,
              "high",
            ),
          );
        }
      }

      if (change.kind === "server-url-changed" && change.before) {
        const urlSymbols = [
          change.before,
          "BASE_URL",
          "API_BASE",
          "API_URL",
          "BaseURL",
          "api.acme-payments.com",
        ];
        impacts.push(
          ...findSymbolHits(
            file,
            urlSymbols,
            change.id,
            "Consumer still points at the previous API base URL",
            "high",
          ),
        );
      }

      if (change.kind === "field-required" && change.field) {
        const related =
          change.operation === "post" && change.path.includes("refund")
            ? [
                "createRefund",
                "create_refund",
                "CreateRefundInput",
                "refundOrder",
                "RefundParams",
              ]
            : [
                "createCharge",
                "create_charge",
                "CreateChargeInput",
                "completeCheckout",
                "ChargeParams",
              ];

        impacts.push(
          ...findSymbolHits(
            file,
            related,
            change.id,
            `Call sites must supply newly required field "${change.field}"`,
            "high",
          ),
        );

        if (!file.content.includes(change.field)) {
          const lines = linesOf(file.content);
          const interfaceLine = lines.findIndex(
            (l) =>
              l.includes("interface Create") ||
              l.includes("CreateChargeInput") ||
              l.includes("CreateRefundInput") ||
              l.includes("class ") ||
              l.includes("TypedDict") ||
              l.includes("struct "),
          );
          if (interfaceLine >= 0) {
            impacts.push({
              file: file.path,
              line: interfaceLine + 1,
              column: 1,
              snippet: lines[interfaceLine].trim(),
              symbol: change.field,
              changeId: change.id,
              confidence: "medium",
              reason: `Type definition is missing required field "${change.field}"`,
            });
          }
        }
      }

      if (change.kind === "enum-value-removed" && change.before) {
        impacts.push(
          ...findSymbolHits(
            file,
            [
              `"${change.before}"`,
              `'${change.before}'`,
              change.before,
              "ChargeStatus",
              "isChargePending",
              "isChargeSuccessful",
              "STATUS_",
            ],
            change.id,
            `Code references removed enum value "${change.before}"`,
            change.field === "status" ? "high" : "medium",
          ),
        );
      }

      if (change.kind === "enum-value-added" && change.after) {
        // Additive — note potential incomplete switches, low urgency
        impacts.push(
          ...findSymbolHits(
            file,
            ["ChargeStatus", "status ===", "switch"],
            change.id,
            `New enum value "${change.after}" may need handling`,
            "low",
          ),
        );
      }

      if (change.kind === "field-added" && change.field) {
        impacts.push(
          ...findSymbolHits(
            file,
            ["Charge", "CreateChargeInput", "createCharge"],
            change.id,
            `Optional new field "${change.field}" available for adoption`,
            "low",
          ),
        );
      }

      if (change.kind === "field-removed" && change.field) {
        impacts.push(
          ...findSymbolHits(
            file,
            [change.field],
            change.id,
            `References removed field "${change.field}"`,
            "high",
          ),
        );
      }
    }
  }

  return uniqueImpacts(impacts);
}
