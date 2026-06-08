import type { Property, PropertyAddress } from "./types";
import { newId } from "./util";

function rowToProperty(row: Record<string, unknown>): Property {
  return {
    id: String(row.id),
    name: String(row.name),
    address_line1: row.address_line1 == null ? null : String(row.address_line1),
    address_line2: row.address_line2 == null ? null : String(row.address_line2),
    city: row.city == null ? null : String(row.city),
    state: row.state == null ? null : String(row.state),
    postal_code: row.postal_code == null ? null : String(row.postal_code),
    country: String(row.country ?? "US"),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

export async function listProperties(db: D1Database): Promise<Property[]> {
  const result = await db
    .prepare(
      "SELECT * FROM properties ORDER BY datetime(created_at) DESC",
    )
    .all<Record<string, unknown>>();

  return (result.results ?? []).map(rowToProperty);
}

export async function getProperty(
  db: D1Database,
  id: string,
): Promise<Property | null> {
  const row = await db
    .prepare("SELECT * FROM properties WHERE id = ?")
    .bind(id)
    .first<Record<string, unknown>>();

  return row ? rowToProperty(row) : null;
}

export async function createProperty(
  db: D1Database,
  input: { name: string; address?: PropertyAddress },
): Promise<Property> {
  const id = newId("prop");
  const address = input.address ?? {};

  await db
    .prepare(
      `INSERT INTO properties (
        id, name, address_line1, address_line2, city, state, postal_code, country
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      input.name,
      address.address_line1 ?? null,
      address.address_line2 ?? null,
      address.city ?? null,
      address.state ?? null,
      address.postal_code ?? null,
      address.country ?? "US",
    )
    .run();

  const property = await getProperty(db, id);
  if (!property) {
    throw new Error("Failed to create property");
  }
  return property;
}

export async function setPropertyAddress(
  db: D1Database,
  id: string,
  address: PropertyAddress,
): Promise<Property | null> {
  const existing = await getProperty(db, id);
  if (!existing) {
    return null;
  }

  await db
    .prepare(
      `UPDATE properties SET
        address_line1 = ?,
        address_line2 = ?,
        city = ?,
        state = ?,
        postal_code = ?,
        country = ?,
        updated_at = datetime('now')
      WHERE id = ?`,
    )
    .bind(
      address.address_line1 ?? existing.address_line1,
      address.address_line2 ?? existing.address_line2,
      address.city ?? existing.city,
      address.state ?? existing.state,
      address.postal_code ?? existing.postal_code,
      address.country ?? existing.country,
      id,
    )
    .run();

  return getProperty(db, id);
}
