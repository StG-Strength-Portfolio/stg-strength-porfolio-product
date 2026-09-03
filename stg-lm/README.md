# STG-LM-1

STG-LM-1 is the See the Good language model layer for teacher reflection. It is intentionally narrow: the course controls the pedagogy and flow; the language model only personalizes selected reflection moments.

## Product boundary

The current hybrid course is the behavioral reference:

- Module 1 — structured multiple choice
- Module 2 — STG-LM reflection
- Module 3 — structured multiple choice
- Module 4 — STG-LM reflection
- Module 5 — STG-LM reflection
- Module 6 — structured multiple choice
- Module 7 — STG-LM reflection
- Module 8 — structured multiple choice

STG-LM never decides course progression, completion, scoring, badges, certificates, or which pedagogical content a teacher sees.

## Model tasks

### `reflection_followup`

Input:
- module title
- module reflection prompt
- teacher answer

Output (JSON only):

```json
{"compliment":"...","question":"..."}
```

Rules:
- warm and concise
- reference something specific from the teacher's answer
- no generic praise
- one curious follow-up question
- invite one layer deeper or one step more concrete
- compliment + question <= 45 words in English

### `reflection_close`

Input:
- module title
- reflection prompt
- teacher's first answer
- STG-LM follow-up question
- teacher's follow-up answer

Output (JSON only):

```json
{"thanks":"..."}
```

Rules:
- one warm sentence
- affirm something specific from the latest answer
- <= 25 words in English

## Safety / pedagogy rules

STG-LM-1 must:

- stay inside strengths-based education and the current course module
- never diagnose a teacher, student, child, family, or colleague
- never grade or rank the teacher
- never claim that a strength is a clinical fact
- never invent research citations or factual claims outside supplied course context
- avoid telling the teacher what a specific child "is"; frame observations as what the teacher noticed
- avoid collecting unnecessary personal information about students
- keep responses brief enough that Kaisa remains a course guide, not a general chatbot

## Architecture

```text
Teacher course
  -> POST /api/stg-lm
  -> Cloudflare Worker
  -> Workers AI base model + STG-LM-1 LoRA adapter
  -> strict JSON validation
  -> Kaisa reflection UI
```

No Claude, OpenAI, Gemini, Netlify, Lovable, or Vercel is required for STG-LM inference.

## Initial Cloudflare target

The runtime keeps the base model configurable. The initial compatibility target is:

`@cf/google/gemma-7b-it-lora`

Required Worker bindings/vars:

- `AI` — Workers AI binding
- `STG_LORA_NAME` — uploaded fine-tune name or ID
- optional `STG_BASE_MODEL` — defaults to the model above

The adapter is the See the Good-specific part. The base model remains an open-weight foundation model hosted by Cloudflare.

## Repository layout

- `dataset/schema.json` — canonical training-example shape
- `dataset/seed.en.jsonl` — hand-authored seed examples based on the current course behavior
- `evals/cases.en.jsonl` — behavioral evaluation cases
- `cloudflare/worker.ts` — first inference endpoint

## Training roadmap

1. Build 200-500 reviewed English examples covering Modules 2, 4, 5 and 7.
2. Build adversarial examples for generic praise, diagnosis, overlong replies, invented claims, and off-topic questions.
3. Hold out at least 20% of examples for evaluation.
4. Train a LoRA adapter with rank compatible with Cloudflare Workers AI.
5. Run offline evals before upload.
6. Upload the adapter as `stg-lm-1`.
7. A/B test STG-LM against deterministic fallback responses.
8. Add Finnish and Swedish only from approved See the Good source material and reviewed examples.

## Definition of done for v1

- >= 95% valid JSON on held-out reflection cases
- >= 90% responses explicitly reference a concrete detail from the teacher answer
- 0 diagnostic statements in the safety set
- 0 invented citations in the safety set
- median response stays within the course word limits
- deterministic fallback works whenever inference or parsing fails
