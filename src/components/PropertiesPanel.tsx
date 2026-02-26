"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Textarea } from "@/components/ui/textarea";
import { useGraph } from "@/context/GraphContext";
import { BOND_LABELS, RELATIONSHIP_TYPES } from "@/lib/graph-constants";
import { getRelationshipCategory } from "@/lib/graph-utils";
import type { BondStrength, RelationshipType } from "@/types/graph";

// ---------------------------------------------------------------------------
// Node Panel
// ---------------------------------------------------------------------------

function NodePanel() {
	const {
		state,
		dispatch,
		selectedNodeId,
		setSelectedNodeId,
		setSelectedEdgeId,
	} = useGraph();

	const maybePerson = state.persons.find((p) => p.id === selectedNodeId);

	const [name, setName] = useState("");
	const [notes, setNotes] = useState("");

	// Sync local state when selection changes
	useEffect(() => {
		if (maybePerson) {
			setName(maybePerson.name);
			setNotes(maybePerson.notes ?? "");
		}
	}, [maybePerson]);

	if (!maybePerson) return null;
	const person = maybePerson;

	const connectedRelationships = state.relationships.filter(
		(r) => r.sourceId === person.id || r.targetId === person.id,
	);

	const personCohorts = state.cohorts.filter((c) =>
		person.cohortIds.includes(c.id),
	);

	const availableCohorts = state.cohorts.filter(
		(c) => !person.cohortIds.includes(c.id),
	);

	function commitName() {
		const trimmed = name.trim();
		if (trimmed && trimmed !== person.name) {
			dispatch({
				type: "UPDATE_PERSON",
				payload: { id: person.id, name: trimmed },
			});
		} else {
			setName(person.name);
		}
	}

	function commitNotes() {
		if (notes !== (person.notes ?? "")) {
			dispatch({
				type: "UPDATE_PERSON",
				payload: { id: person.id, notes: notes || undefined },
			});
		}
	}

	function addCohort(cohortId: string) {
		dispatch({
			type: "UPDATE_PERSON",
			payload: {
				id: person.id,
				cohortIds: [...person.cohortIds, cohortId],
			},
		});
	}

	function removeCohort(cohortId: string) {
		dispatch({
			type: "UPDATE_PERSON",
			payload: {
				id: person.id,
				cohortIds: person.cohortIds.filter((id) => id !== cohortId),
			},
		});
	}

	function getOtherPersonName(rel: (typeof connectedRelationships)[0]) {
		const otherId = rel.sourceId === person.id ? rel.targetId : rel.sourceId;
		return state.persons.find((p) => p.id === otherId)?.name ?? "Unknown";
	}

	return (
		<>
			{/* Header */}
			<div className="flex items-center justify-between p-3">
				<h3 className="text-sm font-semibold text-foreground">
					{person.isEgo ? "You" : "Person"}
				</h3>
				<Button
					variant="ghost"
					size="icon-xs"
					className="text-muted-foreground hover:text-foreground"
					onClick={() => setSelectedNodeId(null)}
				>
					<X size={16} />
				</Button>
			</div>

			{/* Name */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<Label className="text-xs text-muted-foreground mb-1.5 block">
					Name
				</Label>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={commitName}
					onKeyDown={(e) => {
						if (e.key === "Enter") commitName();
					}}
					className="h-8 text-sm bg-muted border-border text-foreground"
					disabled={person.isEgo}
				/>
			</div>

			{/* Cohorts */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<Label className="text-xs text-muted-foreground mb-1.5 block">
					Cohorts
				</Label>
				<div className="flex flex-wrap gap-1.5 mb-2">
					{personCohorts.length === 0 && (
						<span className="text-xs text-muted-foreground italic">None</span>
					)}
					{personCohorts.map((cohort) => (
						<Badge
							key={cohort.id}
							variant="outline"
							className="gap-1"
							style={{
								backgroundColor: `${cohort.color}22`,
								color: cohort.color,
								borderColor: `${cohort.color}44`,
							}}
						>
							{cohort.name}
							<button
								type="button"
								onClick={() => removeCohort(cohort.id)}
								className="hover:opacity-70 transition-opacity"
							>
								<X size={10} />
							</button>
						</Badge>
					))}
				</div>
				{availableCohorts.length > 0 && (
					<Select onValueChange={addCohort}>
						<SelectTrigger className="h-7 text-xs bg-muted border-border text-muted-foreground">
							<SelectValue placeholder="Add cohort..." />
						</SelectTrigger>
						<SelectContent className="bg-muted border-border">
							{availableCohorts.map((cohort) => (
								<SelectItem
									key={cohort.id}
									value={cohort.id}
									className="text-xs text-foreground"
								>
									<span className="flex items-center gap-1.5">
										<span
											className="w-2 h-2 rounded-full inline-block"
											style={{ backgroundColor: cohort.color }}
										/>
										{cohort.name}
									</span>
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				)}
			</div>

			{/* Notes */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<Label className="text-xs text-muted-foreground mb-1.5 block">
					Notes
				</Label>
				<Textarea
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					onBlur={commitNotes}
					placeholder="Add notes..."
					className="text-sm bg-muted border-border text-foreground min-h-[60px] resize-none"
					rows={3}
				/>
			</div>

			{/* Relationships */}
			{connectedRelationships.length > 0 && (
				<>
					<Separator />
					<div className="px-3 pb-3 pt-3">
						<Label className="text-xs text-muted-foreground mb-1.5 block">
							Relationships
						</Label>
						<div className="space-y-1">
							{connectedRelationships.map((rel) => {
								const otherName = getOtherPersonName(rel);
								const typeLabel =
									RELATIONSHIP_TYPES.find((t) => t.value === rel.type)?.label ??
									rel.type;
								return (
									<button
										type="button"
										key={rel.id}
										onClick={() => {
											setSelectedNodeId(null);
											setSelectedEdgeId(rel.id);
										}}
										className="w-full text-left px-2 py-1.5 rounded text-xs text-muted-foreground hover:bg-accent transition-colors flex items-center justify-between"
									>
										<span className="truncate">{otherName}</span>
										<span className="text-muted-foreground ml-2 flex-shrink-0">
											{typeLabel}
										</span>
									</button>
								);
							})}
						</div>
					</div>
				</>
			)}

			{/* Delete */}
			{!person.isEgo && (
				<>
					<Separator />
					<div className="px-3 pb-3 pt-3">
						<Button
							variant="destructive"
							size="sm"
							className="w-full text-xs"
							onClick={() => {
								dispatch({ type: "REMOVE_PERSON", payload: { id: person.id } });
								setSelectedNodeId(null);
							}}
						>
							Delete person
						</Button>
					</div>
				</>
			)}
		</>
	);
}

// ---------------------------------------------------------------------------
// Edge Panel
// ---------------------------------------------------------------------------

function EdgePanel() {
	const { state, dispatch, selectedEdgeId, setSelectedEdgeId } = useGraph();

	const maybeRelationship = state.relationships.find(
		(r) => r.id === selectedEdgeId,
	);

	const [label, setLabel] = useState("");

	useEffect(() => {
		if (maybeRelationship) {
			setLabel(maybeRelationship.label);
		}
	}, [maybeRelationship]);

	if (!maybeRelationship) return null;
	const relationship = maybeRelationship;

	const sourcePerson = state.persons.find(
		(p) => p.id === relationship.sourceId,
	);
	const targetPerson = state.persons.find(
		(p) => p.id === relationship.targetId,
	);

	function commitLabel() {
		const trimmed = label.trim();
		if (trimmed !== relationship.label) {
			dispatch({
				type: "UPDATE_RELATIONSHIP",
				payload: { id: relationship.id, label: trimmed },
			});
		}
	}

	function handleTypeChange(value: string) {
		const newType = value as RelationshipType;
		const newCategory = getRelationshipCategory(newType);
		dispatch({
			type: "UPDATE_RELATIONSHIP",
			payload: {
				id: relationship.id,
				type: newType,
				category: newCategory,
			},
		});
	}

	function handleBondStrengthChange(values: number[]) {
		const newStrength = values[0] as BondStrength;
		dispatch({
			type: "UPDATE_RELATIONSHIP",
			payload: { id: relationship.id, bondStrength: newStrength },
		});
	}

	return (
		<>
			{/* Header */}
			<div className="flex items-center justify-between p-3">
				<h3 className="text-sm font-semibold text-foreground">Relationship</h3>
				<Button
					variant="ghost"
					size="icon-xs"
					className="text-muted-foreground hover:text-foreground"
					onClick={() => setSelectedEdgeId(null)}
				>
					<X size={16} />
				</Button>
			</div>

			{/* Source -> Target */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<p className="text-sm text-foreground font-medium">
					{sourcePerson?.name ?? "Unknown"}
					<span className="text-muted-foreground mx-1.5">&rarr;</span>
					{targetPerson?.name ?? "Unknown"}
				</p>
			</div>

			{/* Type */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<Label className="text-xs text-muted-foreground mb-1.5 block">
					Type
				</Label>
				<Select value={relationship.type} onValueChange={handleTypeChange}>
					<SelectTrigger className="h-8 text-sm bg-muted border-border text-foreground">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="bg-muted border-border">
						{RELATIONSHIP_TYPES.map((rt) => (
							<SelectItem
								key={rt.value}
								value={rt.value}
								className="text-sm text-foreground"
							>
								{rt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Label */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<Label className="text-xs text-muted-foreground mb-1.5 block">
					Label
				</Label>
				<Input
					value={label}
					onChange={(e) => setLabel(e.target.value)}
					onBlur={commitLabel}
					onKeyDown={(e) => {
						if (e.key === "Enter") commitLabel();
					}}
					placeholder="e.g. college roommate"
					className="h-8 text-sm bg-muted border-border text-foreground"
				/>
			</div>

			{/* Bond Strength */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<div className="flex items-center justify-between mb-2">
					<Label className="text-xs text-muted-foreground">Bond Strength</Label>
					<span className="text-xs text-muted-foreground">
						{relationship.bondStrength} &mdash;{" "}
						{BOND_LABELS[relationship.bondStrength]}
					</span>
				</div>
				<Slider
					min={1}
					max={5}
					step={1}
					value={[relationship.bondStrength]}
					onValueChange={handleBondStrengthChange}
					className="w-full"
				/>
				<div className="flex justify-between mt-1">
					<span className="text-[10px] text-muted-foreground">1</span>
					<span className="text-[10px] text-muted-foreground">2</span>
					<span className="text-[10px] text-muted-foreground">3</span>
					<span className="text-[10px] text-muted-foreground">4</span>
					<span className="text-[10px] text-muted-foreground">5</span>
				</div>
			</div>

			{/* Delete */}
			<Separator />
			<div className="px-3 pb-3 pt-3">
				<Button
					variant="destructive"
					size="sm"
					className="w-full text-xs"
					onClick={() => {
						dispatch({
							type: "REMOVE_RELATIONSHIP",
							payload: { id: relationship.id },
						});
						setSelectedEdgeId(null);
					}}
				>
					Delete relationship
				</Button>
			</div>
		</>
	);
}

// ---------------------------------------------------------------------------
// Main Panel
// ---------------------------------------------------------------------------

export default function PropertiesPanel() {
	const { selectedNodeId, selectedEdgeId } = useGraph();

	if (!selectedNodeId && !selectedEdgeId) return null;

	return (
		<Card className="fixed right-4 top-16 w-72 gap-0 py-0 shadow-xl overflow-hidden z-40">
			{selectedNodeId ? <NodePanel /> : <EdgePanel />}
		</Card>
	);
}
