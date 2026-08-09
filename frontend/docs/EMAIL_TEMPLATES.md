# Auth email templates (Vahvuusseikkailu)

These are the branded auth email templates. They are **not** configured in code —
paste them into the backend's Authentication → Email Templates settings.

## Confirm signup / welcome

Subject: `Tervetuloa Vahvuusseikkailuun! / Welcome to Strength Adventure!`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div
    style="background: linear-gradient(135deg, #3f276f, #6544a0); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;"
  >
    <h1 style="color: white; margin: 0; font-size: 24px;">Vahvuusseikkailu</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">
      See the Good! — Huomaa hyvä!
    </p>
  </div>
  <div
    style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;"
  >
    <h2 style="color: #3f276f; margin-top: 0;">Tervetuloa! / Welcome! / Välkommen!</h2>
    <p>Tilisi on luotu onnistuneesti. Vahvista sähköpostisi alla olevasta linkistä.</p>
    <p>Your account has been created successfully. Confirm your email below.</p>
    <p>Ditt konto har skapats. Bekräfta din e-postadress nedan.</p>
    <a
      href="{{ .ConfirmationURL }}"
      style="display: inline-block; background: #e97070; color: white; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; margin: 16px 0;"
    >
      Vahvista sähköposti / Confirm Email
    </a>
  </div>
</div>
```

## Reset password

Subject: `Vaihda salasanasi / Reset your password`

```html
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div
    style="background: linear-gradient(135deg, #3f276f, #6544a0); padding: 24px; border-radius: 12px 12px 0 0; text-align: center;"
  >
    <h1 style="color: white; margin: 0; font-size: 24px;">Vahvuusseikkailu</h1>
    <p style="color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px;">
      See the Good! — Huomaa hyvä!
    </p>
  </div>
  <div
    style="background: white; padding: 24px; border: 1px solid #e5e7eb; border-radius: 0 0 12px 12px;"
  >
    <h2 style="color: #3f276f; margin-top: 0;">Salasanan vaihto / Password Reset</h2>
    <p>Pyysit salasanan vaihtoa. Klikkaa alla olevaa linkkiä.</p>
    <p>You requested a password reset. Click the link below.</p>
    <p>Du begärde en lösenordsåterställning. Klicka på länken nedan.</p>
    <a
      href="{{ .ConfirmationURL }}"
      style="display: inline-block; background: #e97070; color: white; padding: 12px 24px; border-radius: 25px; text-decoration: none; font-weight: bold; margin: 16px 0;"
    >
      Vaihda salasana / Reset Password
    </a>
    <p style="color: #888; font-size: 12px;">
      Jos et pyytänyt tätä, voit jättää tämän viestin huomiotta.<br />If you didn't request this,
      you can ignore this email.
    </p>
  </div>
</div>
```

The reset link points at `/reset-password` in the app, which lets the user set a new password.

## Scheduled reports (weekly teacher / monthly principal)

Not enabled yet: sending app emails requires a verified sender domain the school
owns. Once the email domain is set up, the weekly teacher report and monthly
principal report can be scheduled and the manual "send now" buttons added to the
teacher and school-admin dashboards.
