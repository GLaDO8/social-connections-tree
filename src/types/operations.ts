import type {
  BondStrength,
  Person,
  Relationship,
  RelationshipType,
} from "./graph";

export type GraphOperation =
  | { op: "add_person"; data: { name: string; cohortNames?: string[] } }
  | {
      op: "add_relationship";
      data: {
        sourceName: string;
        targetName: string;
        type: RelationshipType;
        label: string;
        bondStrength: BondStrength;
      };
    }
  | { op: "add_cohort"; data: { name: string } }
  | {
      op: "update_person";
      data: { name: string; updates: Partial<Person> };
    }
  | {
      op: "update_relationship";
      data: {
        sourceName: string;
        targetName: string;
        updates: Partial<Relationship>;
      };
    }
  | { op: "remove_person"; data: { name: string } }
  | {
      op: "remove_relationship";
      data: { sourceName: string; targetName: string };
    };
