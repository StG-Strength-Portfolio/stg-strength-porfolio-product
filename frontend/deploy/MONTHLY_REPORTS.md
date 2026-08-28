# Monthly Strength Portfolio reports

The application includes a Cloudflare scheduled handler in `src/server.ts`.
It sends the previous calendar month's aggregate report to active Teachers and
School Admins who have not opted out.

## Required runtime bindings

Configure these as production Worker secrets/variables. Never commit their
values to GitHub.

- `RESEND_API_KEY` — Resend API key with permission to send from the verified domain.
- `RESEND_MONTHLY_REPORT_TEMPLATE_ID` — published Resend template ID managed by the Positive Learning team in Resend.
- `RESEND_MONTHLY_REPORT_FROM` — optional sender, defaults to `Strength Portfolio <hello@strengthportfolio.com>`.
- Existing `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` bindings remain required.

## Resend template variables

The published Resend template should define these variables:

- `ROLE`
- `MONTH`
- `SCHOOL`
- `CLASS_COUNT`
- `STUDENT_COUNT`
- `ACTIVE_STUDENTS`
- `COMPLETION_PERCENT`
- `TOP_STRENGTHS`
- `LANGUAGE`

The application intentionally does not send student names, student emails,
student response/reflection text, or portfolio content to Resend.
Pedagogical guidance/tips should be authored and maintained directly in the
published Resend template.

## Schedule

Configure the Cloudflare Worker Cron Trigger to invoke the scheduled handler
once per hour on the third day of each month:

```text
0 * 3 * *
```

Cloudflare cron expressions use UTC. The scheduled handler performs a second
check using `Europe/Helsinki` and sends only when local time is 08:00 on day 3.
This keeps the delivery time at 08:00 Finland time through daylight-saving
changes while harmlessly skipping the other hourly invocations.

## Reporting period and retry behavior

- A run on the third day reports the previous calendar month.
- Teacher scope: only active classes the teacher owns or co-teaches.
- School Admin scope: active classes in that Admin's Customer/school.
- The `monthly_report_deliveries` table has a unique recipient/month key.
- Resend calls use `Idempotency-Key: monthly-report/<recipient>/<month>`.
- A successfully sent recipient/month is skipped on later retries.
- Failed sends remain in the ledger with the provider error and may be retried
  by the next invocation without duplicating successful deliveries.

## Opt-out

Teacher and School Admin Profile settings include a monthly-report checkbox.
The preference is stored in `profiles.monthly_report_opt_out`; opt-out users are
excluded before any Resend request is made.
