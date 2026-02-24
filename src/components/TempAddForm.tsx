"use client";

import { useState } from "react";
import { useGraph } from "@/context/GraphContext";
import type { RelationshipType, BondStrength } from "@/types/graph";
import { getRelationshipCategory } from "@/lib/graph-utils";

const RELATIONSHIP_TYPES: RelationshipType[] = [
  "friend",
  "close_friend",
  "best_friend",
  "childhood_friend",
  "partner",
  "ex",
  "crush",
  "colleague",
  "classmate",
  "roommate",
  "family",
  "sibling",
  "acquaintance",
  "other",
];

export default function TempAddForm() {
  const { state, dispatch } = useGraph();

  // Add Person state
  const [name, setName] = useState("");

  // Add Relationship state
  const [sourceId, setSourceId] = useState("");
  const [targetId, setTargetId] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("friend");
  const [bondStrength, setBondStrength] = useState<number>(3);

  function handleAddPerson(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    dispatch({
      type: "ADD_PERSON",
      payload: { name: trimmed, cohortIds: [], isEgo: false },
    });
    setName("");
  }

  function handleAddRelationship(e: React.FormEvent) {
    e.preventDefault();
    if (!sourceId || !targetId || sourceId === targetId) return;
    dispatch({
      type: "ADD_RELATIONSHIP",
      payload: {
        sourceId,
        targetId,
        type: relType,
        category: getRelationshipCategory(relType),
        label: relType.replace(/_/g, " "),
        bondStrength: bondStrength as BondStrength,
      },
    });
    setSourceId("");
    setTargetId("");
    setRelType("friend");
    setBondStrength(3);
  }

  const inputClass =
    "bg-gray-800 text-white text-sm rounded px-2 py-1 border border-gray-700 focus:outline-none focus:border-gray-500";
  const btnClass =
    "bg-gray-700 hover:bg-gray-600 text-white text-sm rounded px-3 py-1 font-medium transition-colors";

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white rounded-t-lg shadow-[0_-4px_12px_rgba(0,0,0,0.3)] px-4 py-3 z-50">
      <div className="flex items-center gap-6 max-w-screen-xl mx-auto flex-wrap">
        {/* Add Person */}
        <form onSubmit={handleAddPerson} className="flex items-center gap-2">
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Person
          </span>
          <input
            type="text"
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />
          <button type="submit" className={btnClass}>
            Add
          </button>
        </form>

        <div className="w-px h-6 bg-gray-700" />

        {/* Add Relationship */}
        <form
          onSubmit={handleAddRelationship}
          className="flex items-center gap-2"
        >
          <span className="text-xs text-gray-400 uppercase tracking-wide">
            Relationship
          </span>
          <select
            value={sourceId}
            onChange={(e) => setSourceId(e.target.value)}
            className={inputClass}
          >
            <option value="">From...</option>
            {state.persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={targetId}
            onChange={(e) => setTargetId(e.target.value)}
            className={inputClass}
          >
            <option value="">To...</option>
            {state.persons.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select
            value={relType}
            onChange={(e) => setRelType(e.target.value as RelationshipType)}
            className={inputClass}
          >
            {RELATIONSHIP_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            max={5}
            value={bondStrength}
            onChange={(e) => setBondStrength(Number(e.target.value))}
            className={`${inputClass} w-14`}
            title="Bond strength (1-5)"
          />
          <button type="submit" className={btnClass}>
            Connect
          </button>
        </form>
      </div>
    </div>
  );
}
