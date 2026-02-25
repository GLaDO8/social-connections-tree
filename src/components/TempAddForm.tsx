"use client";

import { useState } from "react";
import { useGraph } from "@/context/GraphContext";
import type { RelationshipType, BondStrength } from "@/types/graph";
import { getRelationshipCategory } from "@/lib/graph-utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const RELATIONSHIP_TYPES: { value: RelationshipType; label: string }[] = [
  { value: "friend", label: "Friend" },
  { value: "close_friend", label: "Close friend" },
  { value: "best_friend", label: "Best friend" },
  { value: "childhood_friend", label: "Childhood friend" },
  { value: "partner", label: "Partner" },
  { value: "ex", label: "Ex" },
  { value: "crush", label: "Crush" },
  { value: "colleague", label: "Colleague" },
  { value: "classmate", label: "Classmate" },
  { value: "roommate", label: "Roommate" },
  { value: "family", label: "Family" },
  { value: "sibling", label: "Sibling" },
  { value: "acquaintance", label: "Acquaintance" },
  { value: "other", label: "Other" },
];

const BOND_STRENGTHS: { value: BondStrength; label: string }[] = [
  { value: 1, label: "1 (distant)" },
  { value: 2, label: "2 (casual)" },
  { value: 3, label: "3 (regular)" },
  { value: 4, label: "4 (close)" },
  { value: 5, label: "5 (inseparable)" },
];

export default function TempAddForm() {
  const { state, dispatch } = useGraph();

  const [name, setName] = useState("");
  const [connectToId, setConnectToId] = useState("");
  const [relType, setRelType] = useState<RelationshipType>("friend");
  const [bondStrength, setBondStrength] = useState<BondStrength>(3);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed || !connectToId) return;

    const existingPerson = state.persons.find(
      (p) => p.name.toLowerCase() === trimmed.toLowerCase()
    );

    const relPayload = {
      targetId: connectToId,
      type: relType,
      category: getRelationshipCategory(relType),
      label: relType.replace(/_/g, " "),
      bondStrength,
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
    setBondStrength(3);
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

        <div className="flex flex-col gap-1">
          <Label>Bond</Label>
          <Select
            value={String(bondStrength)}
            onValueChange={(v) => setBondStrength(Number(v) as BondStrength)}
          >
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOND_STRENGTHS.map((b) => (
                <SelectItem key={b.value} value={String(b.value)}>
                  {b.label}
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
