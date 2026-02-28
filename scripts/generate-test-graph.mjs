#!/usr/bin/env node
/**
 * Generates a comprehensive test graph JSON with ~60 nodes, 4 cohorts (with overlaps),
 * and a rich variety of relationship types and cross-connections.
 */

const cohorts = [
  { id: "c-school", name: "School", color: "#F97316" },
  { id: "c-college", name: "College", color: "#3B82F6" },
  { id: "c-work", name: "Work", color: "#22C55E" },
  { id: "c-neighborhood", name: "Neighborhood", color: "#A855F7" },
];

// Helper
let relCounter = 0;
function rel(sourceId, targetId, type, label) {
  relCounter++;
  return { id: `r-${relCounter}`, sourceId, targetId, type, ...(label ? { label } : {}) };
}

// --- People definitions ---
// Format: [id, name, cohortIds[], relationshipToMe, labelToMe?]

const peopleDefs = [
  // School only (9)
  ["p-vikram", "Vikram", ["c-school"], "classmate", "school buddy"],
  ["p-ananya", "Ananya", ["c-school"], "classmate"],
  ["p-siddharth", "Siddharth", ["c-school"], "childhood_friend", "known since kindergarten"],
  ["p-meera", "Meera", ["c-school"], "classmate"],
  ["p-arjun", "Arjun", ["c-school"], "close_friend", "cricket partner"],
  ["p-pooja", "Pooja", ["c-school"], "classmate"],
  ["p-karan", "Karan", ["c-school"], "friend"],
  ["p-divya", "Divya", ["c-school"], "classmate"],
  ["p-neha", "Neha", ["c-school"], "friend"],
  ["p-ritika", "Ritika", ["c-school"], "classmate"],
  ["p-dhruv", "Dhruv", ["c-school"], "friend", "debate team"],

  // School + College overlap (3)
  ["p-rahul", "Rahul", ["c-school", "c-college"], "close_friend", "best school + college buddy"],
  ["p-priya", "Priya", ["c-school", "c-college"], "friend"],
  ["p-amit", "Amit", ["c-school", "c-college"], "classmate"],

  // College only (10)
  ["p-rohan", "Rohan", ["c-college"], "classmate"],
  ["p-aishwarya", "Aishwarya", ["c-college"], "friend"],
  ["p-sneha", "Sneha", ["c-college"], "classmate"],
  ["p-ritu", "Ritu", ["c-college"], "classmate"],
  ["p-gaurav", "Gaurav", ["c-college"], "friend"],
  ["p-pallavi", "Pallavi", ["c-college"], "classmate"],
  ["p-manish", "Manish", ["c-college"], "roommate", "hostel roommate"],
  ["p-swati", "Swati", ["c-college"], "classmate"],
  ["p-kunal", "Kunal", ["c-college"], "roommate", "hostel neighbor"],
  ["p-harsh-c", "Harsh K", ["c-college"], "acquaintance"],

  // College + Work overlap (3)
  ["p-deepak", "Deepak", ["c-college", "c-work"], "colleague", "college friend turned colleague"],
  ["p-nikhil", "Nikhil", ["c-college", "c-work"], "colleague"],
  ["p-nandini", "Nandini", ["c-college", "c-work"], "colleague"],

  // Work only (13)
  ["p-suresh", "Suresh", ["c-work"], "colleague"],
  ["p-kavita", "Kavita", ["c-work"], "colleague", "team lead"],
  ["p-rajesh", "Rajesh", ["c-work"], "colleague"],
  ["p-megha", "Megha", ["c-work"], "colleague"],
  ["p-akash", "Akash", ["c-work"], "colleague", "desk neighbor"],
  ["p-varun", "Varun", ["c-work"], "colleague"],
  ["p-shweta", "Shweta", ["c-work"], "colleague"],
  ["p-pranav", "Pranav", ["c-work"], "colleague"],
  ["p-tanya", "Tanya", ["c-work"], "colleague"],
  ["p-harsh-w", "Harsh M", ["c-work"], "colleague"],
  ["p-simran", "Simran", ["c-work"], "colleague"],
  ["p-anil", "Anil", ["c-work"], "acquaintance", "different team"],
  ["p-prashant", "Prashant", ["c-work"], "colleague"],

  // Neighborhood (10)
  ["p-sharma", "Uncle Sharma", ["c-neighborhood"], "family", "dad's friend"],
  ["p-gupta", "Aunty Gupta", ["c-neighborhood"], "family", "mom's friend"],
  ["p-ravi", "Ravi", ["c-neighborhood"], "friend", "neighborhood cricket"],
  ["p-anjali", "Anjali", ["c-neighborhood"], "friend"],
  ["p-saurabh", "Saurabh", ["c-neighborhood"], "childhood_friend", "grew up together"],
  ["p-nisha", "Nisha", ["c-neighborhood"], "friend"],
  ["p-mohit", "Mohit", ["c-neighborhood"], "acquaintance"],
  ["p-preeti", "Preeti", ["c-neighborhood"], "acquaintance"],
  ["p-tarun", "Tarun", ["c-neighborhood"], "childhood_friend"],
  ["p-isha", "Isha", ["c-neighborhood"], "friend"],

  // Unaffiliated (10)
  ["p-abhishek", "Abhishek", [], "best_friend", "childhood best friend"],
  ["p-shruti", "Shruti", [], "partner"],
  ["p-vivek", "Vivek", [], "acquaintance", "met at conference"],
  ["p-natasha", "Natasha", [], "ex"],
  ["p-aditi", "Aditi", [], "crush"],
  ["p-yash", "Yash", [], "other", "gym buddy"],
  ["p-tanvi", "Tanvi", [], "friend", "travel friend"],
  ["p-sameer", "Sameer", [], "childhood_friend", "summer camp"],
  ["p-rohini", "Rohini", [], "acquaintance"],
  ["p-farhan", "Farhan", [], "friend", "online gaming"],
];

// Create person objects
const ego = { id: "ego", name: "Me", cohortIds: [], isEgo: true };
const persons = [ego, ...peopleDefs.map(([id, name, cohortIds]) => ({
  id, name, cohortIds, isEgo: false,
}))];

// Create relationships
const relationships = [];

// 1. Everyone connected to Me
for (const [id, , , type, label] of peopleDefs) {
  relationships.push(rel("ego", id, type, label));
}

// 2. School internal connections
const schoolInternal = [
  ["p-rahul", "p-priya", "classmate", "school classmates"],
  ["p-vikram", "p-arjun", "friend"],
  ["p-ananya", "p-meera", "close_friend", "best friends"],
  ["p-siddharth", "p-karan", "friend"],
  ["p-pooja", "p-divya", "classmate"],
  ["p-neha", "p-ananya", "friend"],
  ["p-arjun", "p-rahul", "friend"],
  ["p-dhruv", "p-vikram", "classmate"],
  ["p-ritika", "p-neha", "friend"],
  ["p-karan", "p-divya", "classmate"],
  ["p-siddharth", "p-arjun", "childhood_friend"],
  ["p-meera", "p-pooja", "classmate"],
];

// 3. College internal connections
const collegeInternal = [
  ["p-rohan", "p-aishwarya", "classmate"],
  ["p-sneha", "p-ritu", "close_friend"],
  ["p-gaurav", "p-pallavi", "classmate"],
  ["p-manish", "p-kunal", "roommate", "hostel mates"],
  ["p-swati", "p-sneha", "classmate"],
  ["p-rahul", "p-rohan", "classmate", "college classmates too"],
  ["p-priya", "p-aishwarya", "friend"],
  ["p-amit", "p-gaurav", "classmate"],
  ["p-deepak", "p-rohan", "friend"],
  ["p-nikhil", "p-sneha", "classmate"],
  ["p-nandini", "p-ritu", "friend"],
  ["p-harsh-c", "p-swati", "classmate"],
  ["p-kunal", "p-gaurav", "friend"],
  ["p-manish", "p-pallavi", "classmate"],
];

// 4. Work internal connections
const workInternal = [
  ["p-suresh", "p-kavita", "colleague", "same team"],
  ["p-rajesh", "p-megha", "colleague"],
  ["p-akash", "p-varun", "colleague", "pair programming"],
  ["p-shweta", "p-pranav", "colleague"],
  ["p-tanya", "p-harsh-w", "colleague"],
  ["p-simran", "p-deepak", "colleague"],
  ["p-deepak", "p-nikhil", "colleague", "engineering team"],
  ["p-nandini", "p-suresh", "colleague"],
  ["p-anil", "p-prashant", "colleague"],
  ["p-kavita", "p-shweta", "colleague", "women in tech group"],
  ["p-varun", "p-pranav", "colleague"],
  ["p-rajesh", "p-akash", "colleague"],
  ["p-megha", "p-tanya", "colleague"],
  ["p-harsh-w", "p-simran", "colleague"],
];

// 5. Neighborhood internal connections
const neighborhoodInternal = [
  ["p-sharma", "p-gupta", "friend", "old neighbors"],
  ["p-ravi", "p-saurabh", "friend"],
  ["p-anjali", "p-nisha", "friend"],
  ["p-mohit", "p-tarun", "friend"],
  ["p-preeti", "p-isha", "friend"],
  ["p-saurabh", "p-tarun", "childhood_friend"],
  ["p-ravi", "p-mohit", "acquaintance"],
  ["p-sharma", "p-ravi", "family", "Ravi's dad's friend"],
];

// 6. Cross-cohort connections (interesting overlaps)
const crossCohort = [
  ["p-abhishek", "p-siddharth", "friend", "met through me"],
  ["p-shruti", "p-priya", "friend", "get along well"],
  ["p-sameer", "p-arjun", "friend"],
  ["p-tanvi", "p-aishwarya", "friend", "travel trip together"],
  ["p-farhan", "p-akash", "friend", "gaming buddies"],
  ["p-natasha", "p-sneha", "friend"],
  ["p-abhishek", "p-ravi", "friend", "neighborhood connection"],
  ["p-shruti", "p-kavita", "acquaintance", "met at office party"],
  ["p-rahul", "p-deepak", "friend", "school to work connection"],
  ["p-saurabh", "p-sameer", "friend"],
];

for (const edges of [schoolInternal, collegeInternal, workInternal, neighborhoodInternal, crossCohort]) {
  for (const [src, tgt, type, label] of edges) {
    relationships.push(rel(src, tgt, type, label));
  }
}

const graph = {
  persons,
  relationships,
  cohorts,
  activeCohortId: null,
  metadata: {
    title: "My Social Graph",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

console.log(`Generated: ${persons.length} persons, ${relationships.length} relationships, ${cohorts.length} cohorts`);

// Write to file
import { writeFileSync } from "fs";
const outPath = new URL("../test-data/large-test-graph.json", import.meta.url).pathname;
import { mkdirSync } from "fs";
mkdirSync(new URL("../test-data", import.meta.url).pathname, { recursive: true });
writeFileSync(outPath, JSON.stringify(graph, null, 2));
console.log(`Written to: ${outPath}`);
