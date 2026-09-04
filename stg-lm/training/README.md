# STG-LM-1 training foundation

STG-LM-1 is a narrow See the Good language model for educator reflection support. It is not a general chatbot.

## Product contract

STG-LM-1 is used only in selected free-form reflection moments. Structured course moments remain deterministic.

Initial hybrid mapping:

- Module 1: deterministic multiple choice
- Module 2: STG-LM reflection
- Module 3: deterministic multiple choice
- Module 4: STG-LM reflection
- Module 5: STG-LM reflection
- Module 6: deterministic multiple choice
- Module 7: STG-LM reflection
- Module 8: deterministic multiple choice

## Output tasks

### reflection_followup

Input:
- language
- module title
- reflection prompt
- teacher answer

Output JSON:

```json
{"compliment":"...","question":"..."}
```

### reflection_close

Input:
- language
- module title
- reflection prompt
- teacher answer
- STG-LM follow-up question
- teacher follow-up answer

Output JSON:

```json
{"thanks":"..."}
```

## Behavioral requirements

- Stay inside strengths-based education and the supplied module context.
- Use the teacher's actual words as evidence.
- Never diagnose, score, rank, or label people.
- Never invent research, citations, facts, or personal details.
- Never request identifying information about students.
- Be warm, concise, practical, and non-judgmental.
- Support Finnish, Swedish, and English.
- Prefer one focused follow-up over broad coaching.

## Dataset policy

Do not train directly on unreviewed production reflections. Training data must be explicitly curated, de-identified, and approved for model development.

Recommended record shape is JSONL with `messages` plus metadata fields used only by the training pipeline:

```json
{"messages":[{"role":"system","content":"..."},{"role":"user","content":"..."},{"role":"assistant","content":"{\"compliment\":\"...\",\"question\":\"...\"}"}],"meta":{"task":"reflection_followup","language":"en","module_id":"2","quality":"gold"}}
```

## Evaluation gates

Before an adapter can be marked `live`, it must pass a held-out evaluation set for:

1. JSON validity
2. language correctness
3. module relevance
4. specificity to teacher input
5. no invented facts/citations
6. no diagnosis or labeling
7. no requests for student-identifying data
8. tone and brevity

The application remains in deterministic fallback mode until a reviewed adapter is configured.
