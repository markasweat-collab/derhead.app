import { auditLog } from "@derhead/security";

export const ALLOWED_TOOLS = [
  "ping",
  "get_status",
  "echo",
  "get_time",
  "list_properties",
  "get_property",
  "create_property",
  "set_property_address",
  "add_measurement",
  "update_measurement",
  "list_measurements",
  "estimate_paint",
  "estimate_trim",
  "estimate_rug",
  "estimate_curtains",
  "estimate_tile",
  "source_products",
  "compare_products",
  "create_shopping_list",
  "validate_design",
] as const;

export type AllowedTool = (typeof ALLOWED_TOOLS)[number];

export function isAllowedTool(name: string): name is AllowedTool {
  return (ALLOWED_TOOLS as readonly string[]).includes(name);
}

export function logEvent(
  event: string,
  meta: {
    ip?: string;
    path?: string;
    method?: string;
    success?: boolean;
    [key: string]: unknown;
  } = {},
): void {
  const { ip = "unknown", path = "/mcp", method = "POST", success = true, ...rest } =
    meta;

  auditLog({
    service: "derhead-mcp",
    event,
    ip,
    path,
    method,
    success,
    meta: rest,
  });
}
