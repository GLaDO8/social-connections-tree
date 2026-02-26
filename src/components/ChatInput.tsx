"use client";

import {
	ChevronDown,
	ChevronUp,
	MessageSquare,
	Plus,
	SendHorizontal,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGraph } from "@/context/GraphContext";
import { resolveOperations } from "@/lib/apply-operations";
import { RELATIONSHIP_TYPES } from "@/lib/graph-constants";
import type { RelationshipType } from "@/types/graph";
import type { ParseInputResponse } from "@/types/operations";

type InputMode = "chat" | "manual";

interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "error" | "loading";
	content: string;
}

export default function ChatInput() {
	const { state, batchDispatch } = useGraph();
	const [mode, setMode] = useState<InputMode>("chat");
	const [messages, setMessages] = useState<ChatMessage[]>([]);
	const [input, setInput] = useState("");
	const [loading, setLoading] = useState(false);
	const [collapsed, setCollapsed] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-scroll to bottom on new message
	// biome-ignore lint/correctness/useExhaustiveDependencies: messages is an intentional trigger for scroll
	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	}, [messages]);

	// Auto-focus input on mount and mode switch
	// biome-ignore lint/correctness/useExhaustiveDependencies: mode is an intentional trigger for focus
	useEffect(() => {
		inputRef.current?.focus();
	}, [mode]);

	const handleSubmit = useCallback(
		async (e?: React.FormEvent) => {
			e?.preventDefault();
			const trimmed = input.trim();
			if (!trimmed || loading) return;

			const userMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: "user",
				content: trimmed,
			};
			const loadingMsg: ChatMessage = {
				id: crypto.randomUUID(),
				role: "loading",
				content: "",
			};

			setMessages((prev) => [...prev, userMsg, loadingMsg]);
			setInput("");
			setLoading(true);

			try {
				const res = await fetch("/api/parse-input", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						input: trimmed,
						existingPersonNames: state.persons.map((p) => p.name),
						existingCohortNames: state.cohorts.map((c) => c.name),
					}),
				});

				if (!res.ok) {
					const err = await res
						.json()
						.catch(() => ({ error: "Request failed" }));
					throw new Error(err.error || `HTTP ${res.status}`);
				}

				const data: ParseInputResponse = await res.json();

				// Apply operations to graph (batched = one undo step)
				const actions = resolveOperations(data.operations, state);
				batchDispatch(actions);

				// Replace loading message with explanation
				setMessages((prev) =>
					prev.map((m) =>
						m.id === loadingMsg.id
							? { ...m, role: "assistant", content: data.explanation }
							: m,
					),
				);
			} catch (err) {
				const errorMessage =
					err instanceof Error ? err.message : "Something went wrong";
				setMessages((prev) =>
					prev.map((m) =>
						m.id === loadingMsg.id
							? { ...m, role: "error", content: errorMessage }
							: m,
					),
				);
			} finally {
				setLoading(false);
				inputRef.current?.focus();
			}
		},
		[input, loading, state, batchDispatch],
	);

	return (
		<div
			className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-border bg-background/95 backdrop-blur"
			style={{ maxHeight: collapsed ? "auto" : "40vh" }}
		>
			{/* Top bar: collapse toggle + mode tabs */}
			<div className="flex items-center justify-between px-4 py-1">
				<div className="flex gap-1">
					<button
						type="button"
						onClick={() => setMode("chat")}
						className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
							mode === "chat"
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<MessageSquare size={12} />
						Chat
					</button>
					<button
						type="button"
						onClick={() => setMode("manual")}
						className={`flex items-center gap-1 rounded px-2 py-1 text-[11px] transition-colors ${
							mode === "manual"
								? "bg-muted text-foreground"
								: "text-muted-foreground hover:text-foreground"
						}`}
					>
						<Plus size={12} />
						Manual
					</button>
				</div>
				<button
					type="button"
					onClick={() => setCollapsed((prev) => !prev)}
					className="flex items-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors"
				>
					{collapsed ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
				</button>
			</div>

			{!collapsed &&
				(mode === "chat" ? (
					<ChatMode
						messages={messages}
						messagesEndRef={messagesEndRef}
						input={input}
						setInput={setInput}
						loading={loading}
						inputRef={inputRef}
						onSubmit={handleSubmit}
					/>
				) : (
					<ManualMode />
				))}
		</div>
	);
}

// ---------------------------------------------------------------------------
// Chat mode
// ---------------------------------------------------------------------------

const EXAMPLE_PROMPTS = [
	"Kavya is my childhood friend from FIITJEE",
	"Ashish is my college roommate",
	"Nishant and I work together at the same company",
	"Connect Kavya and Nishant as classmates",
];

function ChatMode({
	messages,
	messagesEndRef,
	input,
	setInput,
	loading,
	inputRef,
	onSubmit,
}: {
	messages: ChatMessage[];
	messagesEndRef: React.RefObject<HTMLDivElement | null>;
	input: string;
	setInput: (v: string) => void;
	loading: boolean;
	inputRef: React.RefObject<HTMLInputElement | null>;
	onSubmit: (e?: React.FormEvent) => void;
}) {
	const { state } = useGraph();
	const [hasMounted, setHasMounted] = useState(false);
	useEffect(() => setHasMounted(true), []);
	const isEmptyGraph = state.persons.length <= 1;
	const showExamplePrompts =
		hasMounted && messages.length === 0 && isEmptyGraph;

	return (
		<>
			{/* Message history */}
			{messages.length > 0 && (
				<ScrollArea className="flex-1">
					<div className="px-4 pb-2 space-y-2">
						{messages.map((msg) => (
							<MessageBubble key={msg.id} message={msg} />
						))}
						<div ref={messagesEndRef} />
					</div>
				</ScrollArea>
			)}

			{/* Example prompts for empty state */}
			{showExamplePrompts && (
				<div className="px-4 pb-2 pt-1">
					<p className="text-[11px] text-muted-foreground mb-2">
						Try one of these to get started:
					</p>
					<div className="flex flex-wrap gap-2">
						{EXAMPLE_PROMPTS.map((prompt) => (
							<button
								key={prompt}
								type="button"
								onClick={() => {
									setInput(prompt);
									inputRef.current?.focus();
								}}
								className="rounded-md border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted hover:text-foreground hover:border-muted-foreground/50"
							>
								{prompt}
							</button>
						))}
					</div>
				</div>
			)}

			{/* Input */}
			<form onSubmit={onSubmit} className="flex items-center gap-2 px-4 py-3">
				<Input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type to add people and connections..."
					disabled={loading}
					className="flex-1 bg-muted text-foreground placeholder:text-muted-foreground"
				/>
				<Button
					type="submit"
					variant="secondary"
					size="icon"
					disabled={loading || !input.trim()}
					className="shrink-0"
				>
					<SendHorizontal size={18} />
				</Button>
			</form>
		</>
	);
}

// ---------------------------------------------------------------------------
// Manual mode
// ---------------------------------------------------------------------------

function ManualMode() {
	const { state, dispatch } = useGraph();

	const egoId = state.persons.find((p) => p.isEgo)?.id ?? "";
	const [name, setName] = useState("");
	const [connectToId, setConnectToId] = useState(egoId);
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
			label: relType.replace(/_/g, " "),
		};

		if (existingPerson) {
			dispatch({
				type: "ADD_RELATIONSHIP",
				payload: { sourceId: existingPerson.id, ...relPayload },
			});
		} else {
			dispatch({
				type: "ADD_PERSON_WITH_RELATIONSHIP",
				payload: {
					person: { name: trimmed, cohortIds: [], isEgo: false },
					relationship: relPayload,
				},
			});
		}

		setName("");
		setConnectToId(egoId);
		setRelType("friend");
	}

	return (
		<form
			onSubmit={handleSubmit}
			className="flex items-end gap-3 px-4 py-3 flex-wrap"
		>
			<div className="flex flex-col gap-1">
				<label
					htmlFor="manual-name"
					className="text-[11px] text-muted-foreground"
				>
					Name
				</label>
				<Input
					id="manual-name"
					placeholder="Person name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-40 h-8 text-sm bg-muted border-border text-foreground"
					autoComplete="off"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label
					htmlFor="manual-connect"
					className="text-[11px] text-muted-foreground"
				>
					Connect to
				</label>
				<Select value={connectToId} onValueChange={setConnectToId}>
					<SelectTrigger
						id="manual-connect"
						className="w-40 h-8 text-sm bg-muted border-border text-foreground"
					>
						<SelectValue placeholder="Select..." />
					</SelectTrigger>
					<SelectContent className="bg-muted border-border">
						{state.persons.map((p) => (
							<SelectItem
								key={p.id}
								value={p.id}
								className="text-sm text-foreground"
							>
								{p.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1">
				<label
					htmlFor="manual-reltype"
					className="text-[11px] text-muted-foreground"
				>
					Relationship
				</label>
				<Select
					value={relType}
					onValueChange={(v) => setRelType(v as RelationshipType)}
				>
					<SelectTrigger
						id="manual-reltype"
						className="w-40 h-8 text-sm bg-muted border-border text-foreground"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="bg-muted border-border">
						{RELATIONSHIP_TYPES.map((t) => (
							<SelectItem
								key={t.value}
								value={t.value}
								className="text-sm text-foreground"
							>
								{t.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<Button
				type="submit"
				disabled={!name.trim() || !connectToId}
				variant="secondary"
				size="sm"
				className="h-8"
			>
				<Plus size={14} className="mr-1" />
				Add
			</Button>
		</form>
	);
}

// ---------------------------------------------------------------------------
// Message bubble
// ---------------------------------------------------------------------------

function MessageBubble({ message }: { message: ChatMessage }) {
	if (message.role === "loading") {
		return (
			<div className="flex justify-start">
				<div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
					<span className="inline-flex gap-1">
						<span className="animate-bounce" style={{ animationDelay: "0ms" }}>
							.
						</span>
						<span
							className="animate-bounce"
							style={{ animationDelay: "150ms" }}
						>
							.
						</span>
						<span
							className="animate-bounce"
							style={{ animationDelay: "300ms" }}
						>
							.
						</span>
					</span>
				</div>
			</div>
		);
	}

	if (message.role === "user") {
		return (
			<div className="flex justify-end">
				<div className="max-w-[80%] rounded-lg bg-secondary px-3 py-2 text-sm text-foreground">
					{message.content}
				</div>
			</div>
		);
	}

	if (message.role === "error") {
		return (
			<div className="flex justify-start">
				<div className="max-w-[80%] rounded-lg border border-red-900/50 bg-red-950/30 px-3 py-2 text-sm text-red-300">
					{message.content}
				</div>
			</div>
		);
	}

	// assistant
	return (
		<div className="flex justify-start">
			<div className="max-w-[80%] rounded-lg bg-muted px-3 py-2 text-sm text-foreground">
				{message.content}
			</div>
		</div>
	);
}
