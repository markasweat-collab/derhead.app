import type { Measurement } from "./types";
import { newId } from "./util";

function rowToMeasurement(row: Record<string, unknown>): Measurement {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    room_id: row.room_id == null ? null : String(row.room_id),
    label: String(row.label),
    value: Number(row.value),
    unit: String(row.unit),
    source: String(row.source ?? "manual"),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listMeasurements(
  db: D1Database,
  filters: { property_id: string; room_id?: string; label?: string },
): Promise<Measurement[]> {
  let query =
    "SELECT * FROM measurements WHERE property_id = ?";
  const binds: unknown[] = [filters.property_id];

  if (filters.room_id) {
    query += " AND room_id = ?";
    binds.push(filters.room_id);
  }
  if (filters.label) {
    query += " AND label = ?";
    binds.push(filters.label);
  }

  query += " ORDER BY datetime(created_at) DESC";

  const result = await db.prepare(query).bind(...binds).all<Record<string, unknown>>();
  return (result.results ?? []).map(rowToMeasurement);
}

export async function getMeasurement(
  db: D1Database,
  id: string,
): Promise<Measurement | null> {
  const row = await db
    .prepare("SELECT * FROM measurements WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return row ? rowToMeasurement(row) : null;
}

export async function addMeasurement(
  db: D1Database,
  input: {
    property_id: string;
    room_id?: string | null;
    label: string;
    value: number;
    unit: string;
    source?: string;
    notes?: string | null;
  },
): Promise<Measurement> {
  const id = newId("meas");

  await db
    .prepare(
      `INSERT INTO measurements (
        id, property_id, room_id, label, value, unit, source, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.property_id,
      input.room_id ?? null,
      input.label,
      input.value,
      input.unit,
      input.source ?? "manual",
      input.notes ?? null,
    )
    .run();

  const measurement = await getMeasurement(db, id);
  if (!measurement) {
    throw new Error("Failed to add measurement");
  }
  return measurement;
}

export async function updateMeasurement(
  db: D1Database,
  id: string,
  input: {
    label?: string;
    value?: number;
    unit?: string;
    source?: string;
    notes?: string | null;
    room_id?: string | null;
  },
): Promise<Measurement | null> {
  const existing = await getMeasurement(db, id);
  if (!existing) {
    return null;
  }

  await db
    .prepare(
      `UPDATE measurements SET
        label = ?,
        value = ?,
        unit = ?,
        source = ?,
        notes = ?,
        room_id = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
    )
    .bind(
      input.label ?? existing.label,
      input.value ?? existing.value,
      input.unit ?? existing.unit,
      input.source ?? existing.source,
      input.notes ?? existing.notes,
      input.room_id !== undefined ? input.room_id : existing.room_id,
      id,
    )
    .run();

  return getMeasurement(db, id);
}

export function findMeasurementValue(
  measurements: Measurement[],
  labels: string[],
): Measurement | undefined {
  const normalized = new Set(labels.map((label) => label.toLowerCase()));
  return measurements.find((measurement) =>
    normalized.has(measurement.label.toLowerCase()),
  );
}

export function toSquareFeet(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "sqft" || normalized === "ft2") {
    return value;
  }
  if (normalized === "sqm" || normalized === "m2") {
    return value * 10.7639;
  }
  if (normalized === "sqin") {
    return value / 144;
  }
  throw new Error(`Unsupported area unit: ${unit}`);
}

export function toFeet(value: number, unit: string): number {
  const normalized = unit.toLowerCase();
  if (normalized === "ft" || normalized === "feet") {
    return value;
  }
  if (normalized === "in" || normalized === "inch" || normalized === "inches") {
    return value / 12;
  }
  if (normalized === "m" || normalized === "meter" || normalized === "meters") {
    return value * 3.28084;
  }
  throw new Error(`Unsupported length unit: ${unit}`);
}
