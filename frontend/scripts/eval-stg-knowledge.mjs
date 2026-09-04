import assert from "node:assert/strict";
import { STG_KNOWLEDGE, retrieveStgKnowledge, formatKnowledgeContext } from "../src/lib/stg-knowledge.server.ts";

const cases = [
  { moduleTitle: "Module 1 — What are character strengths?", answer: "Perseverance helped a student learn to read.", expected: "course-m1-character-strengths" },
  { moduleTitle: "Module 2 — The language of strengths", answer: "I want to name kindness when I see it.", expected: "course-m2-strength-language" },
  { moduleTitle: "Module 3 — Different environments, different strengths", answer: "At home courage looks different than at school.", expected: "course-m3-contexts" },
  { moduleTitle: "Module 4 — Discover your own core strengths", answer: "People often turn to me when they need calm perspective.", expected: "course-m4-own-core-strengths" },
  { moduleTitle: "Module 5 — Spotting the strengths of your students", answer: "A student shows compassion outside normal schoolwork.", expected: "course-m5-core-strengths" },
  { moduleTitle: "Module 6 — Guiding students to use their own strengths", answer: "Where did you use your strengths today?", expected: "course-m6-use-strengths" },
  { moduleTitle: "Module 7 — Giving strength-based feedback", answer: "I noticed your perseverance when you kept trying.", expected: "course-m7-feedback" },
  { moduleTitle: "Module 8 — Bringing families in to See the Good!", answer: "Families can notice strengths at home and in hobbies.", expected: "course-m8-families" },
];

assert.equal(STG_KNOWLEDGE.length >= 9, true, "expected full course starter knowledge plus Kaisa style");
assert.equal(new Set(STG_KNOWLEDGE.map((x) => x.id)).size, STG_KNOWLEDGE.length, "knowledge IDs must be unique");

for (const testCase of cases) {
  const results = retrieveStgKnowledge({
    moduleTitle: testCase.moduleTitle,
    answer: testCase.answer,
    language: "en",
    limit: 4,
  });
  assert.ok(results.length > 0, `no retrieval result for ${testCase.moduleTitle}`);
  assert.equal(results[0].id, testCase.expected, `${testCase.moduleTitle} should retrieve its approved module chunk first`);
  assert.ok(results.every((result) => Number.isFinite(result.score) && result.score > 0), "all retrieved scores must be positive finite numbers");
  assert.ok(results.length <= 4, "retrieval must obey limit");
}

const noMatch = retrieveStgKnowledge({ answer: "zxqv jklm pqrt", language: "en" });
assert.equal(noMatch.length, 0, "unknown content must not fabricate a knowledge match");
assert.match(formatKnowledgeContext(noMatch), /No approved See the Good knowledge chunk matched/i);

const feedback = retrieveStgKnowledge({
  moduleTitle: "Module 7 — Giving strength-based feedback",
  answer: "I want to avoid just saying good job and name perseverance instead.",
  language: "en",
});
const context = formatKnowledgeContext(feedback);
assert.match(context, /course-m7-feedback/);
assert.match(context, /specific/i);
assert.match(context, /strength/i);

console.log(`STG knowledge eval passed: ${cases.length} module retrieval cases + integrity checks.`);
