import fs from "fs";
import { dataPath } from "./paths";

export type PilotUnion = {
  upazila: string;
  upazila_geocode: string;
  union: string;
  union_bn: string;
  union_geocode: string;
  is_paurashava_ward: boolean;
  lat: number;
  lon: number;
  frs_union_code: string | null;
  boundary_source: string;
};

let unions: PilotUnion[] | null = null;

export function loadPilotUnions(): PilotUnion[] {
  if (!unions) {
    unions = JSON.parse(fs.readFileSync(dataPath("pilot_unions.json"), "utf8"));
  }
  return unions!;
}

export function getUnion(upazila: string, union: string): PilotUnion | undefined {
  return loadPilotUnions().find((u) => u.upazila === upazila && u.union === union);
}

export function ruralUnions(): PilotUnion[] {
  return loadPilotUnions().filter((u) => !u.is_paurashava_ward);
}
