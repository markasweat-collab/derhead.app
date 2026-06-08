import {
  findMeasurementValue,
  listMeasurements,
  toFeet,
  toSquareFeet,
} from "./measurements";
import { getProperty } from "./properties";
import type { EstimateResult } from "./types";

const PAINT_COVERAGE_SQFT = 350;
const PAINT_COATS = 2;
const TILE_WASTE = 0.1;
const RUG_MARGIN_FT = 0.5;
const CURTAIN_FULLNESS = 2;

function round(value: number, digits = 2): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

async function loadRoomMeasurements(
  db: D1Database,
  propertyId: string,
  roomId?: string,
) {
  const property = await getProperty(db, propertyId);
  if (!property) {
    throw new Error(`Property not found: ${propertyId}`);
  }

  const measurements = await listMeasurements(db, {
    property_id: propertyId,
    room_id: roomId,
  });

  return { property, measurements };
}

export async function estimatePaint(
  db: D1Database,
  input: { property_id: string; room_id?: string; coats?: number },
): Promise<EstimateResult> {
  const { measurements } = await loadRoomMeasurements(
    db,
    input.property_id,
    input.room_id,
  );

  const coats = input.coats ?? PAINT_COATS;
  const assumptions: string[] = [
    `${coats} coats assumed`,
    `${PAINT_COVERAGE_SQFT} sqft per gallon coverage`,
  ];

  const wallArea = findMeasurementValue(measurements, [
    "wall_area",
    "paintable_area",
    "wall_surface_area",
  ]);
  if (wallArea) {
    const sqft = toSquareFeet(wallArea.value, wallArea.unit);
    assumptions.push(`Used stored measurement "${wallArea.label}"`);
    return {
      quantity: round((sqft * coats) / PAINT_COVERAGE_SQFT, 2),
      unit: "gallons",
      assumptions,
      confidence: "high",
    };
  }

  const floorArea = findMeasurementValue(measurements, [
    "floor_area",
    "room_area",
    "area",
  ]);
  const ceilingHeight = findMeasurementValue(measurements, [
    "ceiling_height",
    "wall_height",
    "height",
  ]);

  if (floorArea && ceilingHeight) {
    const sqft = toSquareFeet(floorArea.value, floorArea.unit);
    const side = Math.sqrt(sqft);
    const perimeter = side * 4;
    const height = toFeet(ceilingHeight.value, ceilingHeight.unit);
    const paintable = perimeter * height;
    assumptions.push(
      "Estimated wall area from square floor + ceiling height (assumes square room)",
    );
    return {
      quantity: round((paintable * coats) / PAINT_COVERAGE_SQFT, 2),
      unit: "gallons",
      assumptions,
      confidence: "medium",
    };
  }

  assumptions.push("No paintable-area measurements found; using 400 sqft default room");
  return {
    quantity: round((400 * coats) / PAINT_COVERAGE_SQFT, 2),
    unit: "gallons",
    assumptions,
    confidence: "low",
  };
}

export async function estimateTrim(
  db: D1Database,
  input: { property_id: string; room_id?: string },
): Promise<EstimateResult> {
  const { measurements } = await loadRoomMeasurements(
    db,
    input.property_id,
    input.room_id,
  );

  const perimeter = findMeasurementValue(measurements, [
    "perimeter",
    "room_perimeter",
    "trim_length",
  ]);
  if (perimeter) {
    return {
      quantity: round(toFeet(perimeter.value, perimeter.unit), 2),
      unit: "linear_feet",
      assumptions: [`Used stored measurement "${perimeter.label}"`],
      confidence: "high",
    };
  }

  const floorArea = findMeasurementValue(measurements, [
    "floor_area",
    "room_area",
    "area",
  ]);
  if (floorArea) {
    const sqft = toSquareFeet(floorArea.value, floorArea.unit);
    const side = Math.sqrt(sqft);
    return {
      quantity: round(side * 4, 2),
      unit: "linear_feet",
      assumptions: ["Estimated perimeter from square floor area"],
      confidence: "medium",
    };
  }

  return {
    quantity: 60,
    unit: "linear_feet",
    assumptions: ["No perimeter measurements found; using 60 ft default"],
    confidence: "low",
  };
}

export async function estimateRug(
  db: D1Database,
  input: { property_id: string; room_id?: string },
): Promise<EstimateResult> {
  const { measurements } = await loadRoomMeasurements(
    db,
    input.property_id,
    input.room_id,
  );

  const rugWidth = findMeasurementValue(measurements, ["rug_width", "width"]);
  const rugLength = findMeasurementValue(measurements, [
    "rug_length",
    "length",
  ]);
  if (rugWidth && rugLength) {
    const width = toFeet(rugWidth.value, rugWidth.unit);
    const length = toFeet(rugLength.value, rugLength.unit);
    return {
      quantity: round(width * length, 2),
      unit: "sqft",
      assumptions: ["Used stored rug width and length measurements"],
      confidence: "high",
    };
  }

  const floorArea = findMeasurementValue(measurements, [
    "floor_area",
    "room_area",
    "area",
  ]);
  if (floorArea) {
    const sqft = toSquareFeet(floorArea.value, floorArea.unit);
    const side = Math.sqrt(sqft) - RUG_MARGIN_FT * 2;
    return {
      quantity: round(Math.max(side, 1) ** 2, 2),
      unit: "sqft",
      assumptions: [
        `Rug sized to floor area minus ${RUG_MARGIN_FT * 2} ft total margin (square room assumed)`,
      ],
      confidence: "medium",
    };
  }

  return {
    quantity: 80,
    unit: "sqft",
    assumptions: ["No floor measurements found; using 80 sqft default rug"],
    confidence: "low",
  };
}

export async function estimateCurtains(
  db: D1Database,
  input: { property_id: string; room_id?: string; panels?: number },
): Promise<EstimateResult> {
  const { measurements } = await loadRoomMeasurements(
    db,
    input.property_id,
    input.room_id,
  );

  const windowWidth = findMeasurementValue(measurements, [
    "window_width",
    "curtain_width",
  ]);
  const windowHeight = findMeasurementValue(measurements, [
    "window_height",
    "curtain_height",
    "ceiling_height",
  ]);

  const panels = input.panels ?? 2;
  const assumptions = [
    `${panels} panels assumed`,
    `${CURTAIN_FULLNESS}x fullness factor for fabric width`,
  ];

  if (windowWidth && windowHeight) {
    const width = toFeet(windowWidth.value, windowWidth.unit);
    const height = toFeet(windowHeight.value, windowHeight.unit);
    const fabricWidth = width * CURTAIN_FULLNESS * panels;
    return {
      quantity: round(fabricWidth * height, 2),
      unit: "sqft_fabric",
      assumptions: [
        ...assumptions,
        "Used stored window width and height measurements",
      ],
      confidence: "high",
    };
  }

  if (windowWidth) {
    const width = toFeet(windowWidth.value, windowWidth.unit);
    const height = 8;
    assumptions.push("Window height defaulted to 8 ft");
    return {
      quantity: round(width * CURTAIN_FULLNESS * panels * height, 2),
      unit: "sqft_fabric",
      assumptions,
      confidence: "medium",
    };
  }

  assumptions.push("No window measurements found; using 6 ft x 8 ft window default");
  return {
    quantity: round(6 * CURTAIN_FULLNESS * panels * 8, 2),
    unit: "sqft_fabric",
    assumptions,
    confidence: "low",
  };
}

export async function estimateTile(
  db: D1Database,
  input: { property_id: string; room_id?: string; waste_factor?: number },
): Promise<EstimateResult> {
  const { measurements } = await loadRoomMeasurements(
    db,
    input.property_id,
    input.room_id,
  );

  const waste = input.waste_factor ?? TILE_WASTE;
  const floorArea = findMeasurementValue(measurements, [
    "floor_area",
    "tile_area",
    "room_area",
    "area",
  ]);

  if (floorArea) {
    const sqft = toSquareFeet(floorArea.value, floorArea.unit);
    return {
      quantity: round(sqft * (1 + waste), 2),
      unit: "sqft",
      assumptions: [
        `Used stored measurement "${floorArea.label}"`,
        `${Math.round(waste * 100)}% waste factor applied`,
      ],
      confidence: "high",
    };
  }

  return {
    quantity: round(100 * (1 + waste), 2),
    unit: "sqft",
    assumptions: [
      "No floor area measurements found; using 100 sqft default",
      `${Math.round(waste * 100)}% waste factor applied`,
    ],
    confidence: "low",
  };
}
