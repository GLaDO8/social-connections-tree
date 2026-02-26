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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { useGraph } from "@/context/GraphContext";
import { applyOperations } from "@/lib/apply-operations";
import { RELATIONSHIP_TYPES } from "@/lib/graph-constants";
import {
	getDefaultBondStrength,
	getRelationshipCategory,
} from "@/lib/graph-utils";
import type { RelationshipType } from "@/types/graph";
import type { ParseInputResponse } from "@/types/operations";

type InputMode = "chat" | "manual";

interface ChatMessage {
	id: string;
	role: "user" | "assistant" | "error" | "loading";
	content: string;
}

export default function ChatInput() {
	const { state, dispatch } = useGraph();
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

				// Apply operations to graph
				applyOperations(data.operations, state, dispatch);

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
		[input, loading, state, dispatch],
	);

	return (
		<div
			className="fixed bottom-0 left-0 right-0 z-50 flex flex-col border-t border-gray-800 bg-gray-900/95 backdrop-blur"
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
								? "bg-gray-800 text-gray-200"
								: "text-gray-500 hover:text-gray-300"
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
								? "bg-gray-800 text-gray-200"
								: "text-gray-500 hover:text-gray-300"
						}`}
					>
						<Plus size={12} />
						Manual
					</button>
				</div>
				<button
					type="button"
					onClick={() => setCollapsed((prev) => !prev)}
					className="flex items-center gap-1 text-[10px] text-gray-500 hover:text-gray-300 transition-colors"
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
	return (
		<>
			{/* Message history */}
			{messages.length > 0 && (
				<div className="flex-1 overflow-y-auto px-4 pb-2 space-y-2">
					{messages.map((msg) => (
						<MessageBubble key={msg.id} message={msg} />
					))}
					<div ref={messagesEndRef} />
				</div>
			)}

			{/* Input */}
			<form onSubmit={onSubmit} className="flex items-center gap-2 px-4 py-3">
				<input
					ref={inputRef}
					type="text"
					value={input}
					onChange={(e) => setInput(e.target.value)}
					placeholder="Type to add people and connections..."
					disabled={loading}
					className="flex-1 rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-gray-100 placeholder-gray-500 outline-none focus:border-gray-600 focus:ring-1 focus:ring-gray-600 disabled:opacity-50"
				/>
				<button
					type="submit"
					disabled={loading || !input.trim()}
					className="flex items-center justify-center rounded-lg bg-gray-700 p-2 text-gray-300 transition-colors hover:bg-gray-600 hover:text-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"
				>
					<SendHorizontal size={18} />
				</button>
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
			category: getRelationshipCategory(relType),
			label: relType.replace(/_/g, " "),
			bondStrength: getDefaultBondStrength(relType),
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
				<label htmlFor="manual-name" className="text-[11px] text-gray-400">
					Name
				</label>
				<Input
					id="manual-name"
					placeholder="Person name"
					value={name}
					onChange={(e) => setName(e.target.value)}
					className="w-40 h-8 text-sm bg-gray-800 border-gray-700 text-gray-100"
					autoComplete="off"
				/>
			</div>

			<div className="flex flex-col gap-1">
				<label htmlFor="manual-connect" className="text-[11px] text-gray-400">
					Connect to
				</label>
				<Select value={connectToId} onValueChange={setConnectToId}>
					<SelectTrigger
						id="manual-connect"
						className="w-40 h-8 text-sm bg-gray-800 border-gray-700 text-gray-100"
					>
						<SelectValue placeholder="Select..." />
					</SelectTrigger>
					<SelectContent className="bg-gray-800 border-gray-700">
						{state.persons.map((p) => (
							<SelectItem
								key={p.id}
								value={p.id}
								className="text-sm text-gray-200"
							>
								{p.name}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			<div className="flex flex-col gap-1">
				<label htmlFor="manual-reltype" className="text-[11px] text-gray-400">
					Relationship
				</label>
				<Select
					value={relType}
					onValueChange={(v) => setRelType(v as RelationshipType)}
				>
					<SelectTrigger
						id="manual-reltype"
						className="w-40 h-8 text-sm bg-gray-800 border-gray-700 text-gray-100"
					>
						<SelectValue />
					</SelectTrigger>
					<SelectContent className="bg-gray-800 border-gray-700">
						{RELATIONSHIP_TYPES.map((t) => (
							<SelectItem
								key={t.value}
								value={t.value}
								className="text-sm text-gray-200"
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
				size="sm"
				className="h-8 bg-gray-700 text-gray-200 hover:bg-gray-600"
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
				<div className="rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-400">
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
				<div className="max-w-[80%] rounded-lg bg-gray-700 px-3 py-2 text-sm text-gray-100">
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
			<div className="max-w-[80%] rounded-lg bg-gray-800 px-3 py-2 text-sm text-gray-200">
				{message.content}
			</div>
		</div>
	);
}
