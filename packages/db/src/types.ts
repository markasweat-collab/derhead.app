export type Property = {
  id: string;
  name: string;
  address_line1: string | null;
  address_line2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  country: string;
  created_at: string;
  updated_at: string;
};

export type Room = {
  id: string;
  property_id: string;
  name: string;
  room_type: string | null;
  floor: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Measurement = {
  id: string;
  property_id: string;
  room_id: string | null;
  label: string;
  value: number;
  unit: string;
  source: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Project = {
  id: string;
  property_id: string;
  room_id: string | null;
  name: string;
  project_type: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Asset = {
  id: string;
  property_id: string;
  room_id: string | null;
  name: string;
  asset_type: string | null;
  width: number | null;
  height: number | null;
  depth: number | null;
  unit: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type ShoppingListItem = {
  id: string;
  property_id: string;
  project_id: string | null;
  name: string;
  quantity: number;
  unit: string | null;
  estimated_cost: number | null;
  currency: string;
  retailer: string | null;
  product_url: string | null;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type Constraint = {
  id: string;
  property_id: string;
  room_id: string | null;
  constraint_type: string;
  label: string;
  value: string;
  severity: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyAddress = {
  address_line1?: string | null;
  address_line2?: string | null;
  city?: string | null;
  state?: string | null;
  postal_code?: string | null;
  country?: string | null;
};

export type EstimateResult = {
  quantity: number;
  unit: string;
  assumptions: string[];
  confidence: "low" | "medium" | "high";
};

export type ProductCandidate = {
  id: string;
  name: string;
  retailer: string;
  price: number;
  currency: string;
  url: string;
  match_score: number;
};

export type ValidationIssue = {
  severity: "error" | "warning";
  constraint_id: string | null;
  message: string;
};

export type ValidationResult = {
  valid: boolean;
  issues: ValidationIssue[];
};
