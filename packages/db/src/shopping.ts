import type { ProductCandidate, ShoppingListItem } from "./types";
import { newId } from "./util";

function rowToShoppingItem(row: Record<string, unknown>): ShoppingListItem {
  return {
    id: String(row.id),
    property_id: String(row.property_id),
    project_id: row.project_id == null ? null : String(row.project_id),
    name: String(row.name),
    quantity: Number(row.quantity),
    unit: row.unit == null ? null : String(row.unit),
    estimated_cost:
      row.estimated_cost == null ? null : Number(row.estimated_cost),
    currency: String(row.currency ?? "USD"),
    retailer: row.retailer == null ? null : String(row.retailer),
    product_url: row.product_url == null ? null : String(row.product_url),
    status: String(row.status ?? "pending"),
    notes: row.notes == null ? null : String(row.notes),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  };
}

const RETAILERS = ["Home Depot", "Lowe's", "Amazon", "Target"] as const;

export function sourceProducts(input: {
  query: string;
  category?: string;
  limit?: number;
}): ProductCandidate[] {
  const limit = Math.min(input.limit ?? 5, 10);
  const query = input.query.trim();
  const category = input.category?.trim() || "general";

  return Array.from({ length: limit }, (_, index) => {
    const retailer = RETAILERS[index % RETAILERS.length];
    const basePrice = 12 + query.length + index * 7;
    return {
      id: `candidate_${index + 1}`,
      name: `${query} — ${category} option ${index + 1}`,
      retailer,
      price: round(basePrice + index * 3.5, 2),
      currency: "USD",
      url: `https://example.com/search?q=${encodeURIComponent(query)}&retailer=${encodeURIComponent(retailer)}`,
      match_score: round(Math.max(0.55, 0.95 - index * 0.08), 2),
    };
  });
}

export function compareProducts(
  products: ProductCandidate[],
): ProductCandidate[] {
  return [...products].sort((a, b) => {
    if (b.match_score !== a.match_score) {
      return b.match_score - a.match_score;
    }
    return a.price - b.price;
  });
}

export async function createShoppingList(
  db: D1Database,
  input: {
    property_id: string;
    project_id?: string | null;
    items: Array<{
      name: string;
      quantity?: number;
      unit?: string | null;
      estimated_cost?: number | null;
      retailer?: string | null;
      product_url?: string | null;
      notes?: string | null;
    }>;
  },
): Promise<ShoppingListItem[]> {
  const created: ShoppingListItem[] = [];

  for (const item of input.items) {
    const id = newId("shop");
    await db
      .prepare(
        `INSERT INTO shopping_list_items (
          id, property_id, project_id, name, quantity, unit,
          estimated_cost, retailer, product_url, notes
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        input.property_id,
        input.project_id ?? null,
        item.name,
        item.quantity ?? 1,
        item.unit ?? null,
        item.estimated_cost ?? null,
        item.retailer ?? null,
        item.product_url ?? null,
        item.notes ?? null,
      )
      .run();

    const row = await db
      .prepare("SELECT * FROM shopping_list_items WHERE id = ?")
      .bind(id)
      .first<Record<string, unknown>>();

    if (row) {
      created.push(rowToShoppingItem(row));
    }
  }

  return created;
}

export async function listShoppingItems(
  db: D1Database,
  propertyId: string,
): Promise<ShoppingListItem[]> {
  const result = await db
    .prepare(
      "SELECT * FROM shopping_list_items WHERE property_id = ? ORDER BY datetime(created_at) DESC",
    )
    .bind(propertyId)
    .all<Record<string, unknown>>();

  return (result.results ?? []).map(rowToShoppingItem);
}

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}
