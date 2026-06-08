import type { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  addMeasurement,
  compareProducts,
  createProperty,
  createShoppingList,
  estimateCurtains,
  estimatePaint,
  estimateRug,
  estimateTile,
  estimateTrim,
  getProperty,
  listMeasurements,
  listProperties,
  setPropertyAddress,
  sourceProducts,
  toolError,
  toolJson,
  updateMeasurement,
  validateDesign,
} from "@derhead/db";
import { READ_ONLY_TOOL, WRITE_TOOL } from "./annotations";
import { logEvent } from "../lib";

type HomeTwinContext = {
  db: D1Database | undefined;
};

function requireDb(db: D1Database | undefined): D1Database | null {
  return db ?? null;
}

export function registerHomeTwinTools(
  server: McpServer,
  ctx: HomeTwinContext,
): void {
  server.registerTool(
    "list_properties",
    {
      title: "List Properties",
      description: "List all properties in the HomeTwin digital twin database.",
      inputSchema: {},
      ...READ_ONLY_TOOL,
    },
    async () => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "list_properties", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const properties = await listProperties(db);
      logEvent("tool.call", {
        tool: "list_properties",
        success: true,
        count: properties.length,
      });
      return toolJson({ properties });
    },
  );

  server.registerTool(
    "get_property",
    {
      title: "Get Property",
      description: "Get a property by ID from the HomeTwin database.",
      inputSchema: {
        property_id: z.string().describe("Property ID"),
      },
      ...READ_ONLY_TOOL,
    },
    async ({ property_id }) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "get_property", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const property = await getProperty(db, property_id);
      if (!property) {
        logEvent("tool.call", { tool: "get_property", success: false });
        return toolError(`Property not found: ${property_id}`);
      }

      logEvent("tool.call", { tool: "get_property", success: true });
      return toolJson({ property });
    },
  );

  server.registerTool(
    "create_property",
    {
      title: "Create Property",
      description: "Create a new property in the HomeTwin database.",
      inputSchema: {
        name: z.string().describe("Property name"),
        address_line1: z.string().optional(),
        address_line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional(),
      },
      ...WRITE_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "create_property", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const property = await createProperty(db, {
        name: input.name,
        address: {
          address_line1: input.address_line1,
          address_line2: input.address_line2,
          city: input.city,
          state: input.state,
          postal_code: input.postal_code,
          country: input.country,
        },
      });

      logEvent("tool.call", { tool: "create_property", success: true });
      return toolJson({ property });
    },
  );

  server.registerTool(
    "set_property_address",
    {
      title: "Set Property Address",
      description: "Update the address for an existing property.",
      inputSchema: {
        property_id: z.string().describe("Property ID"),
        address_line1: z.string().optional(),
        address_line2: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        postal_code: z.string().optional(),
        country: z.string().optional(),
      },
      ...WRITE_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "set_property_address", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const property = await setPropertyAddress(db, input.property_id, {
        address_line1: input.address_line1,
        address_line2: input.address_line2,
        city: input.city,
        state: input.state,
        postal_code: input.postal_code,
        country: input.country,
      });

      if (!property) {
        logEvent("tool.call", { tool: "set_property_address", success: false });
        return toolError(`Property not found: ${input.property_id}`);
      }

      logEvent("tool.call", { tool: "set_property_address", success: true });
      return toolJson({ property });
    },
  );

  server.registerTool(
    "add_measurement",
    {
      title: "Add Measurement",
      description: "Add a measurement to a property (optionally scoped to a room).",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
        label: z.string().describe("e.g. floor_area, ceiling_height, window_width"),
        value: z.number(),
        unit: z.string().describe("e.g. sqft, ft, in"),
        source: z.string().optional(),
        notes: z.string().optional(),
      },
      ...WRITE_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "add_measurement", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const measurement = await addMeasurement(db, input);
      logEvent("tool.call", { tool: "add_measurement", success: true });
      return toolJson({ measurement });
    },
  );

  server.registerTool(
    "update_measurement",
    {
      title: "Update Measurement",
      description: "Update an existing measurement by ID.",
      inputSchema: {
        measurement_id: z.string(),
        label: z.string().optional(),
        value: z.number().optional(),
        unit: z.string().optional(),
        source: z.string().optional(),
        notes: z.string().optional(),
        room_id: z.string().nullable().optional(),
      },
      ...WRITE_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "update_measurement", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const { measurement_id, ...updates } = input;
      const measurement = await updateMeasurement(db, measurement_id, updates);
      if (!measurement) {
        logEvent("tool.call", { tool: "update_measurement", success: false });
        return toolError(`Measurement not found: ${measurement_id}`);
      }

      logEvent("tool.call", { tool: "update_measurement", success: true });
      return toolJson({ measurement });
    },
  );

  server.registerTool(
    "list_measurements",
    {
      title: "List Measurements",
      description: "List measurements for a property, optionally filtered by room or label.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
        label: z.string().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "list_measurements", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const measurements = await listMeasurements(db, input);
      logEvent("tool.call", {
        tool: "list_measurements",
        success: true,
        count: measurements.length,
      });
      return toolJson({ measurements });
    },
  );

  server.registerTool(
    "estimate_paint",
    {
      title: "Estimate Paint",
      description: "Estimate paint quantity from stored measurements.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
        coats: z.number().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "estimate_paint", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      try {
        const estimate = await estimatePaint(db, input);
        logEvent("tool.call", { tool: "estimate_paint", success: true });
        return toolJson({ estimate });
      } catch (error) {
        logEvent("tool.call", { tool: "estimate_paint", success: false });
        return toolError(error instanceof Error ? error.message : "Estimate failed");
      }
    },
  );

  server.registerTool(
    "estimate_trim",
    {
      title: "Estimate Trim",
      description: "Estimate trim length from stored measurements.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "estimate_trim", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      try {
        const estimate = await estimateTrim(db, input);
        logEvent("tool.call", { tool: "estimate_trim", success: true });
        return toolJson({ estimate });
      } catch (error) {
        logEvent("tool.call", { tool: "estimate_trim", success: false });
        return toolError(error instanceof Error ? error.message : "Estimate failed");
      }
    },
  );

  server.registerTool(
    "estimate_rug",
    {
      title: "Estimate Rug",
      description: "Estimate rug area from stored measurements.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "estimate_rug", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      try {
        const estimate = await estimateRug(db, input);
        logEvent("tool.call", { tool: "estimate_rug", success: true });
        return toolJson({ estimate });
      } catch (error) {
        logEvent("tool.call", { tool: "estimate_rug", success: false });
        return toolError(error instanceof Error ? error.message : "Estimate failed");
      }
    },
  );

  server.registerTool(
    "estimate_curtains",
    {
      title: "Estimate Curtains",
      description: "Estimate curtain fabric from stored window measurements.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
        panels: z.number().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "estimate_curtains", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      try {
        const estimate = await estimateCurtains(db, input);
        logEvent("tool.call", { tool: "estimate_curtains", success: true });
        return toolJson({ estimate });
      } catch (error) {
        logEvent("tool.call", { tool: "estimate_curtains", success: false });
        return toolError(error instanceof Error ? error.message : "Estimate failed");
      }
    },
  );

  server.registerTool(
    "estimate_tile",
    {
      title: "Estimate Tile",
      description: "Estimate tile area from stored floor measurements.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
        waste_factor: z.number().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "estimate_tile", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      try {
        const estimate = await estimateTile(db, input);
        logEvent("tool.call", { tool: "estimate_tile", success: true });
        return toolJson({ estimate });
      } catch (error) {
        logEvent("tool.call", { tool: "estimate_tile", success: false });
        return toolError(error instanceof Error ? error.message : "Estimate failed");
      }
    },
  );

  server.registerTool(
    "source_products",
    {
      title: "Source Products",
      description:
        "Return retailer search candidates for a product query (stub until live retailer APIs are connected).",
      inputSchema: {
        query: z.string(),
        category: z.string().optional(),
        limit: z.number().optional(),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const products = sourceProducts(input);
      logEvent("tool.call", {
        tool: "source_products",
        success: true,
        count: products.length,
      });
      return toolJson({ products, note: "Stub results — connect retailer APIs for live data" });
    },
  );

  server.registerTool(
    "compare_products",
    {
      title: "Compare Products",
      description: "Rank product candidates by match score and price.",
      inputSchema: {
        products: z.array(
          z.object({
            id: z.string(),
            name: z.string(),
            retailer: z.string(),
            price: z.number(),
            currency: z.string(),
            url: z.string(),
            match_score: z.number(),
          }),
        ),
      },
      ...READ_ONLY_TOOL,
    },
    async ({ products }) => {
      const ranked = compareProducts(products);
      logEvent("tool.call", {
        tool: "compare_products",
        success: true,
        count: ranked.length,
      });
      return toolJson({ products: ranked });
    },
  );

  server.registerTool(
    "create_shopping_list",
    {
      title: "Create Shopping List",
      description: "Persist shopping list items for a property in D1.",
      inputSchema: {
        property_id: z.string(),
        project_id: z.string().optional(),
        items: z.array(
          z.object({
            name: z.string(),
            quantity: z.number().optional(),
            unit: z.string().optional(),
            estimated_cost: z.number().optional(),
            retailer: z.string().optional(),
            product_url: z.string().optional(),
            notes: z.string().optional(),
          }),
        ),
      },
      ...WRITE_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "create_shopping_list", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const items = await createShoppingList(db, input);
      logEvent("tool.call", {
        tool: "create_shopping_list",
        success: true,
        count: items.length,
      });
      return toolJson({ items });
    },
  );

  server.registerTool(
    "validate_design",
    {
      title: "Validate Design",
      description:
        "Validate a proposed design against stored constraints and measurements.",
      inputSchema: {
        property_id: z.string(),
        room_id: z.string().optional(),
        proposed: z
          .record(z.string())
          .describe("Proposed design fields keyed by constraint label"),
      },
      ...READ_ONLY_TOOL,
    },
    async (input) => {
      const db = requireDb(ctx.db);
      if (!db) {
        logEvent("tool.call", { tool: "validate_design", success: false });
        return toolError("Database not configured (D1 binding missing)");
      }

      const result = await validateDesign(db, input);
      logEvent("tool.call", {
        tool: "validate_design",
        success: true,
        valid: result.valid,
        issue_count: result.issues.length,
      });
      return toolJson({ validation: result });
    },
  );
}
