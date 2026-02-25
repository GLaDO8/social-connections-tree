"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGraph } from "@/context/GraphContext";
import { RELATIONSHIP_TYPES } from "@/lib/graph-constants";
import {
	getDefaultBondStrength,
	getRelationshipCategory,
} from "@/lib/graph-utils";
import type { RelationshipType } from "@/types/graph";

export default function TempAddForm() {
	const { state, dispatch } = useGraph();

	const [name, setName] = useState("");
	const [connectToId, setConnectToId] = useState("");
	const [relType, setRelType] = useState<RelationshipType>("friend");

	function handleSubmit(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed || !connectToId) return;

		const existingPerson = state.persons.find(
			(p) => p.name.toLowerCase() === trimmed.toLowerCase(),
		);

		const relPayload = {
			targetId: connectToId,
			type: relType,
			category: getRelationshipCategory(relType),
			label: relType.replace(/_/g, " "),
			bondStrength: getDefaultBondStrength(relType),
		};

		if (existingPerson) {
			// Person already exists — just add relationship
			dispatch({
				type: "ADD_RELATIONSHIP",
				payload: { sourceId: existingPerson.id, ...relPayload },
			});
		} else {
			// New person + relationship atomically
			dispatch({
				type: "ADD_PERSON_WITH_RELATIONSHIP",
				payload: {
					person: { name: trimmed, cohortIds: [], isEgo: false },
					relationship: relPayload,
				},
			});
		}

		setName("");
		setConnectToId("");
		setRelType("friend");
	}

	return (
		<div className="fixed bottom-0 left-0 right-0 bg-card border-t border-border px-4 py-3 z-50">
			<form
				onSubmit={handleSubmit}
				className="flex items-end gap-3 max-w-screen-xl mx-auto flex-wrap"
			>
				<div className="flex flex-col gap-1">
					<Label htmlFor="person-name">Name</Label>
					<Input
						id="person-name"
						placeholder="Person name"
						value={name}
						onChange={(e) => setName(e.target.value)}
						className="w-40"
						autoComplete="off"
					/>
				</div>

				<div className="flex flex-col gap-1">
					<Label>Connect to</Label>
					<Select value={connectToId} onValueChange={setConnectToId}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="Select..." />
						</SelectTrigger>
						<SelectContent>
							{state.persons.map((p) => (
								<SelectItem key={p.id} value={p.id}>
									{p.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<div className="flex flex-col gap-1">
					<Label>Relationship</Label>
					<Select
						value={relType}
						onValueChange={(v) => setRelType(v as RelationshipType)}
					>
						<SelectTrigger className="w-40">
							<SelectValue />
						</SelectTrigger>
						<SelectContent>
							{RELATIONSHIP_TYPES.map((t) => (
								<SelectItem key={t.value} value={t.value}>
									{t.label}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>

				<Button type="submit" disabled={!name.trim() || !connectToId}>
					Add & Connect
				</Button>
			</form>
		</div>
	);
}
