import { listMeasurements } from "./measurements";
import { getProperty } from "./properties";
import type { Constraint, ValidationIssue, ValidationResult } from "./types";

function rowToConstraint(row: Record<string, unknown>): Constraint {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    room_id: row.room_id == null ? null : String(row.room_id),
    constraint_type: String(row.constraint_type),
    label: String(row.label),
    value: String(row.value),
    severity: String(row.severity ?? "soft"),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listConstraints(
  db: D1Database,
  propertyId: string,
  roomId?: string,
): Promise<Constraint[]> {
  let query = "SELECT * FROM constraints WHERE property_id = ?";
  const binds: unknown[] = [propertyId];

  if (roomId) {
    query += " AND (room_id IS NULL OR room_id = ?)";
    binds.push(roomId);
  }

  query += " ORDER BY severity DESC, label ASC";

  const result = await db.prepare(query).bind(...binds).all<Record<string, unknown>>();
  return (result.results ?? []).map(rowToConstraint);
}

function parseNumeric(value: string): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export async function validateDesign(
  db: D1Database,
  input: {
    property_id: string;
    room_id?: string;
    proposed: Record<string, unknown>;
  },
): Promise<ValidationResult> {
  const property = await getProperty(db, input.property_id);
  if (!property) {
    return {
      valid: false,
      issues: [
        {
          severity: "error",
          constraint_id: null,
          message: `Property not found: ${input.property_id}`,
        },
      ],
    };
  }

  const [constraints, measurements] = await Promise.all([
    listConstraints(db, input.property_id, input.room_id),
    listMeasurements(db, {
      property_id: input.property_id,
      room_id: input.room_id,
    }),
  ]);

  const issues: ValidationIssue[] = [];

  for (const constraint of constraints) {
    const proposedValue = input.proposed[constraint.label];
    if (proposedValue === undefined) {
      if (constraint.severity === "hard") {
        issues.push({
          severity: "error",
          constraint_id: constraint.id,
          message: `Missing required design field "${constraint.label}" (${constraint.constraint_type})`,
        });
      }
      continue;
    }

    if (constraint.constraint_type === "max_dimension") {
      const limit = parseNumeric(constraint.value);
      const actual = parseNumeric(String(proposedValue));
      if (limit != null && actual != null && actual > limit) {
        issues.push({
          severity: constraint.severity === "hard" ? "error" : "warning",
          constraint_id: constraint.id,
          message: `${constraint.label} ${actual} exceeds max ${limit}`,
        });
      }
    }

    if (constraint.constraint_type === "style") {
      const allowed = constraint.value
        .split(",")
        .map((entry) => entry.trim().toLowerCase())
        .filter(Boolean);
      const actual = String(proposedValue).toLowerCase();
      if (allowed.length > 0 && !allowed.includes(actual)) {
        issues.push({
          severity: constraint.severity === "hard" ? "error" : "warning",
          constraint_id: constraint.id,
          message: `Style "${proposedValue}" is not in allowed set: ${allowed.join(", ")}`,
        });
      }
    }

    if (constraint.constraint_type === "budget") {
      const budget = parseNumeric(constraint.value);
      const cost = parseNumeric(String(proposedValue));
      if (budget != null && cost != null && cost > budget) {
        issues.push({
          severity: constraint.severity === "hard" ? "error" : "warning",
          constraint_id: constraint.id,
          message: `Estimated cost ${cost} exceeds budget ${budget}`,
        });
      }
    }
  }

  const floorArea = measurements.find((measurement) =>
    ["floor_area", "room_area", "area"].includes(
      measurement.label.toLowerCase(),
    ),
  );
  const proposedWidth = parseNumeric(String(input.proposed.width ?? ""));
  const proposedDepth = parseNumeric(String(input.proposed.depth ?? ""));

  if (floorArea && proposedWidth != null && proposedDepth != null) {
    const proposedArea = proposedWidth * proposedDepth;
    if (proposedArea > floorArea.value * 1.05) {
      issues.push({
        severity: "warning",
        constraint_id: null,
        message: `Proposed footprint ${proposedArea} exceeds stored floor area ${floorArea.value} ${floorArea.unit}`,
      });
    }
  }

  const hasError = issues.some((issue) => issue.severity === "error");
  return {
    valid: !hasError,
    issues,
  };
}
