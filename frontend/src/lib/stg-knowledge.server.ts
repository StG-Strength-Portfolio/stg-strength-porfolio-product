export type StgKnowledgeChunk = {
  id: string;
  title: string;
  language: "en" | "fi" | "sv";
  module?: string;
  tags: string[];
  content: string;
};

export type RetrievedKnowledge = StgKnowledgeChunk & { score: number };

// Approved starter knowledge distilled only from the supplied course sources.
// It is intentionally small and conservative: missing knowledge should stay
// missing until an approved See the Good source is added to the corpus.
export const STG_KNOWLEDGE: StgKnowledgeChunk[] = [
  {
    id: "course-m5-core-strengths",
    title: "Core strengths in everyday situations",
    language: "en",
    module: "Module 5",
    tags: ["core strengths", "student", "courage", "competence", "wellbeing"],
    content:
      "A student's core strength may show up outside conventional schoolwork. A new or difficult situation can become a chance to ask what that strength would do. Using a core strength can feel natural, energising, and important. Awareness alone is not enough: students need concrete experiences of using strengths for their own benefit and for others, because successes help build a sense of competence.",
  },
  {
    id: "course-m6-use-strengths",
    title: "Guiding students to use their own strengths",
    language: "en",
    module: "Module 6",
    tags: ["strength awareness", "reflection", "self-regulation", "courage", "classroom questions"],
    content:
      "Knowing core strengths helps when students learn to use them consciously in different situations, for themselves and for others. Useful everyday reflection questions include: What went well? Where did you use your strengths? How did you use courage today? How will you use your self-regulation today? Teachers can also ask how a strength helped the whole class.",
  },
  {
    id: "course-m7-feedback",
    title: "Giving strength-based feedback",
    language: "en",
    module: "Module 7",
    tags: ["feedback", "strength language", "perseverance", "specific praise", "reflection"],
    content:
      "Strength-based feedback is most useful when it is specific and names the strength behind an action, not only the outcome. Useful sentence starters include: I especially noticed your [strength] when...; I really appreciate the way you use your [strength] to...; I have learned something from the way you use your [strength]...; It was wonderful to see your [strength] in action when.... Feedback can also invite the student to reuse a strength next time.",
  },
  {
    id: "course-m8-families",
    title: "Bringing families in to See the Good",
    language: "en",
    module: "Module 8",
    tags: ["families", "home", "strength spotting", "family strengths", "strength language"],
    content:
      "Families help children recognise strengths by noticing them in everyday life at home, in hobbies, friendships, learning, and challenges. When children hear similar strength language at school and home, they have more chances to recognise what is good and strong in themselves. Families can also notice strengths across the whole family, name them, discuss how they help in daily life, and practise developing them together.",
  },
  {
    id: "course-kaisa-reflection-style",
    title: "Kaisa reflection interaction",
    language: "en",
    tags: ["kaisa", "reflection", "follow-up", "tone", "teacher"],
    content:
      "Inside the teacher course, Kaisa responds briefly and warmly. The first response should reference something specific from the teacher's reflection rather than generic praise, then ask one short curious follow-up question that goes one layer deeper or becomes more concrete. After the teacher answers the follow-up, Kaisa gives one short warm acknowledgement tied to the latest answer.",
  },
];

const STOP_WORDS = new Set([
  "the", "a", "an", "and", "or", "to", "of", "in", "on", "for", "with", "is", "are", "was", "were", "be", "this", "that", "it", "i", "you", "your", "their", "they", "we", "our", "what", "how", "when", "where",
]);

function tokens(text: string) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s-]/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length > 2 && !STOP_WORDS.has(token));
}

function scoreChunk(chunk: StgKnowledgeChunk, queryTokens: string[], moduleTitle?: string) {
  const haystack = tokens(`${chunk.title} ${chunk.tags.join(" ")} ${chunk.content}`);
  const frequencies = new Map<string, number>();
  for (const token of haystack) frequencies.set(token, (frequencies.get(token) ?? 0) + 1);

  let score = 0;
  for (const token of queryTokens) {
    const hits = frequencies.get(token) ?? 0;
    if (hits) score += 1 + Math.min(hits, 3) * 0.35;
    if (chunk.tags.some((tag) => tag.toLowerCase().includes(token))) score += 0.8;
  }

  if (moduleTitle && chunk.module && moduleTitle.toLowerCase().includes(chunk.module.toLowerCase())) score += 4;
  if (moduleTitle && chunk.title.toLowerCase().includes(moduleTitle.toLowerCase())) score += 2;
  return score;
}

export function retrieveStgKnowledge(input: {
  moduleTitle?: string;
  reflectionPrompt?: string;
  answer?: string;
  clarification?: string;
  language?: "en" | "fi" | "sv";
  limit?: number;
}): RetrievedKnowledge[] {
  const query = [input.moduleTitle, input.reflectionPrompt, input.answer, input.clarification]
    .filter(Boolean)
    .join(" ");
  const queryTokens = tokens(query);
  const limit = Math.max(1, Math.min(input.limit ?? 4, 6));

  return STG_KNOWLEDGE
    .filter((chunk) => chunk.language === "en" || chunk.language === input.language)
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, queryTokens, input.moduleTitle) }))
    .filter((chunk) => chunk.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function formatKnowledgeContext(chunks: RetrievedKnowledge[]) {
  if (!chunks.length) return "No approved See the Good knowledge chunk matched this reflection.";
  return chunks
    .map((chunk, index) => `[STG-${index + 1} | ${chunk.id} | ${chunk.title}]\n${chunk.content}`)
    .join("\n\n");
}
