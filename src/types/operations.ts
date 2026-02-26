import type { BondStrength, RelationshipType } from "./graph";

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
			data: { name: string; updates: { name?: string; notes?: string } };
	  }
	| {
			op: "update_relationship";
			data: {
				sourceName: string;
				targetName: string;
				updates: {
					type?: RelationshipType;
					label?: string;
					bondStrength?: BondStrength;
				};
			};
	  }
	| { op: "remove_person"; data: { name: string } }
	| {
			op: "remove_relationship";
			data: { sourceName: string; targetName: string };
	  };

export interface ParseInputResponse {
	operations: GraphOperation[];
	explanation: string;
}
