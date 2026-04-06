import type {
  AuditManifest,
  AuditDiffEntry,
  FrozenSnapshot,
  PipelinePlan,
} from "../types";

export function buildAuditExport(data: {
  manifests: AuditManifest[];
  diffs: AuditDiffEntry[];
  frozen: FrozenSnapshot[];
  plan: PipelinePlan;
}) {
  return {
    exported_at: new Date().toISOString(),
    run_manifests: data.manifests,
    diffs: data.diffs,
    frozen_snapshots: data.frozen,
    pipeline_plan: data.plan,
  };
}

export function computeDiffs<T extends object>(
  oldItems: T[],
  newItems: T[],
  idField: keyof T & string,
  step: string,
): AuditDiffEntry[] {
  const diffs: AuditDiffEntry[] = [];
  const now = new Date().toISOString();

  const toRecord = (item: T) => item as unknown as Record<string, unknown>;
  const oldMap = new Map(oldItems.map((item) => [toRecord(item)[idField] as string, item]));
  const newMap = new Map(newItems.map((item) => [toRecord(item)[idField] as string, item]));

  for (const [id, newItem] of newMap) {
    const oldItem = oldMap.get(id);
    const newRec = toRecord(newItem);
    if (!oldItem) {
      diffs.push({
        type: "added",
        field: step,
        id,
        new_value: JSON.stringify(newItem),
        source: "llm",
        timestamp: now,
      });
    } else {
      const oldRec = toRecord(oldItem);
      const changed = Object.keys(newRec).filter(
        (k) => JSON.stringify(newRec[k]) !== JSON.stringify(oldRec[k]),
      );
      if (changed.length > 0) {
        diffs.push({
          type: "modified",
          field: changed.join(", "),
          id,
          old_value: JSON.stringify(
            Object.fromEntries(changed.map((k) => [k, oldRec[k]])),
          ),
          new_value: JSON.stringify(
            Object.fromEntries(changed.map((k) => [k, newRec[k]])),
          ),
          source: "llm",
          timestamp: now,
        });
      }
    }
  }

  for (const [id] of oldMap) {
    if (!newMap.has(id)) {
      diffs.push({
        type: "removed",
        field: step,
        id,
        old_value: JSON.stringify(oldMap.get(id)),
        source: "llm",
        timestamp: now,
      });
    }
  }

  return diffs;
}
