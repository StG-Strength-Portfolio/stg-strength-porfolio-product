# Strength Portfolio service-description compliance plan

This draft branch is based on `main` commit `878af78389a451c80d6133107da43acad4cbee72` and is intentionally separate from PR #67.

## Agreed product decisions

- A student may belong to only one active Strength Portfolio class at a time. A second join attempt is blocked and requires teacher/admin action.
- Same-school student moves are performed by an authorized teacher/admin and preserve the student's account, answers, progress and portfolio.
- A student removed from a class keeps their account and portfolio but cannot continue normal portfolio work until assigned to another active class.
- School Admin supports both deactivate/reactivate and delete/restore for users.
- Removing School Admin rights lets the acting admin choose whether the user becomes a Teacher or is deactivated. The last active School Admin cannot be demoted/deleted.
- Deleting/deactivating a teacher who owns classes requires choosing another same-school teacher as the new owner first.
- School Admin gets a Trash area for deleted Users and Classes; Teachers get a smaller authorized Trash view.
- Deleted users/classes use a 90-day restore window.
- Authorized Teacher/School Admin can delete an individual student response but cannot edit it. The deletion creates an audit record without retaining the deleted answer text.
- Student Detail exposes received strengths, sender, optional message and date to authorized teachers/admins.
- Students can print/export their own portfolio using the shared portfolio renderer and browser Save as PDF.
- Normal Give a Strength rules remain same-school and role-restricted.
- Strength Sprint must not accept or persist free-text messages.
- Monthly email reports contain aggregate data only, no named students, and support per-user opt-out.
- Monthly email templates/content are managed in Resend, not in the Strength Portfolio Super Admin dashboard.
- Remove the Super Admin Email Templates UI and active frontend/server editor code, but keep the existing Supabase `email_templates` table/data untouched for now.
- Monthly reports are sent automatically on the 3rd day of each month. Initial implementation target is 08:00 Europe/Helsinki unless product scheduling is changed later.
- The platform supplies approved aggregate report data to the Resend-managed template.
- Password rules: minimum 8 characters, including at least one letter, one number and one special character, consistently across signup/reset/change flows.
- Inactivity handling: warning at about 28 minutes; automatic sign-out at about 30 minutes.
- Google Slides/YouTube external content requires explicit permission for all regions before external content loads.
- PR stays Draft until product-owner review and explicit approval.

## Implementation groups

1. Class membership and controlled moves
2. User/class lifecycle, ownership transfer and 90-day trash
3. Admin-role safeguards
4. Student-response deletion audit
5. Received-strength visibility and student portfolio export
6. Strength Sprint free-text removal
7. Authentication/password and inactivity controls
8. External-content consent alignment
9. Remove Super Admin email-template editor while preserving legacy Supabase data
10. Resend monthly aggregate reporting, opt-out and 3rd-day schedule
11. Regression tests for role boundaries, RLS and cross-school isolation
