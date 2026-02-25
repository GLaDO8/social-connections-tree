"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";
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
				<h3 className="text-sm font-semibold text-gray-100">
					{person.isEgo ? "You" : "Person"}
				</h3>
				<button
					type="button"
					onClick={() => setSelectedNodeId(null)}
					className="text-gray-400 hover:text-gray-200 transition-colors"
				>
					<X size={16} />
				</button>
			</div>

			{/* Name */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<Label className="text-xs text-gray-300 mb-1.5 block">Name</Label>
				<Input
					value={name}
					onChange={(e) => setName(e.target.value)}
					onBlur={commitName}
					onKeyDown={(e) => {
						if (e.key === "Enter") commitName();
					}}
					className="h-8 text-sm bg-gray-800 border-gray-700 text-gray-100"
					disabled={person.isEgo}
				/>
			</div>

			{/* Cohorts */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<Label className="text-xs text-gray-300 mb-1.5 block">Cohorts</Label>
				<div className="flex flex-wrap gap-1.5 mb-2">
					{personCohorts.length === 0 && (
						<span className="text-xs text-gray-500 italic">None</span>
					)}
					{personCohorts.map((cohort) => (
						<span
							key={cohort.id}
							className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
							style={{
								backgroundColor: `${cohort.color}22`,
								color: cohort.color,
								border: `1px solid ${cohort.color}44`,
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
						</span>
					))}
				</div>
				{availableCohorts.length > 0 && (
					<Select onValueChange={addCohort}>
						<SelectTrigger className="h-7 text-xs bg-gray-800 border-gray-700 text-gray-300">
							<SelectValue placeholder="Add cohort..." />
						</SelectTrigger>
						<SelectContent className="bg-gray-800 border-gray-700">
							{availableCohorts.map((cohort) => (
								<SelectItem
									key={cohort.id}
									value={cohort.id}
									className="text-xs text-gray-200"
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
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<Label className="text-xs text-gray-300 mb-1.5 block">Notes</Label>
				<Textarea
					value={notes}
					onChange={(e) => setNotes(e.target.value)}
					onBlur={commitNotes}
					placeholder="Add notes..."
					className="text-sm bg-gray-800 border-gray-700 text-gray-100 min-h-[60px] resize-none"
					rows={3}
				/>
			</div>

			{/* Relationships */}
			{connectedRelationships.length > 0 && (
				<div className="px-3 pb-3 border-t border-gray-800 pt-3">
					<Label className="text-xs text-gray-300 mb-1.5 block">
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
									className="w-full text-left px-2 py-1.5 rounded text-xs text-gray-300 hover:bg-gray-800 transition-colors flex items-center justify-between"
								>
									<span className="truncate">{otherName}</span>
									<span className="text-gray-500 ml-2 flex-shrink-0">
										{typeLabel}
									</span>
								</button>
							);
						})}
					</div>
				</div>
			)}

			{/* Delete */}
			{!person.isEgo && (
				<div className="px-3 pb-3 border-t border-gray-800 pt-3">
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
				<h3 className="text-sm font-semibold text-gray-100">Relationship</h3>
				<button
					type="button"
					onClick={() => setSelectedEdgeId(null)}
					className="text-gray-400 hover:text-gray-200 transition-colors"
				>
					<X size={16} />
				</button>
			</div>

			{/* Source -> Target */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<p className="text-sm text-gray-100 font-medium">
					{sourcePerson?.name ?? "Unknown"}
					<span className="text-gray-500 mx-1.5">&rarr;</span>
					{targetPerson?.name ?? "Unknown"}
				</p>
			</div>

			{/* Type */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<Label className="text-xs text-gray-300 mb-1.5 block">Type</Label>
				<Select value={relationship.type} onValueChange={handleTypeChange}>
					<SelectTrigger className="h-8 text-sm bg-gray-800 border-gray-700 text-gray-100">
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="bg-gray-800 border-gray-700">
						{RELATIONSHIP_TYPES.map((rt) => (
							<SelectItem
								key={rt.value}
								value={rt.value}
								className="text-sm text-gray-200"
							>
								{rt.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Label */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<Label className="text-xs text-gray-300 mb-1.5 block">Label</Label>
				<Input
					value={label}
					onChange={(e) => setLabel(e.target.value)}
					onBlur={commitLabel}
					onKeyDown={(e) => {
						if (e.key === "Enter") commitLabel();
					}}
					placeholder="e.g. college roommate"
					className="h-8 text-sm bg-gray-800 border-gray-700 text-gray-100"
				/>
			</div>

			{/* Bond Strength */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
				<div className="flex items-center justify-between mb-2">
					<Label className="text-xs text-gray-300">Bond Strength</Label>
					<span className="text-xs text-gray-400">
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
					<span className="text-[10px] text-gray-500">1</span>
					<span className="text-[10px] text-gray-500">2</span>
					<span className="text-[10px] text-gray-500">3</span>
					<span className="text-[10px] text-gray-500">4</span>
					<span className="text-[10px] text-gray-500">5</span>
				</div>
			</div>

			{/* Delete */}
			<div className="px-3 pb-3 border-t border-gray-800 pt-3">
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
		<div
			className="fixed right-4 top-16 w-72 bg-gray-900 border border-gray-700 rounded-lg shadow-xl overflow-hidden"
			style={{ zIndex: 40 }}
		>
			{selectedNodeId ? <NodePanel /> : <EdgePanel />}
		</div>
	);
}
