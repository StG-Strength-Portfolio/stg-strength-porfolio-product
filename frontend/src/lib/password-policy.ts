export const PASSWORD_MIN_LENGTH = 8;

export type PasswordPolicyLanguage = "fi" | "en" | "sv";

/**
 * Strength Portfolio password policy from the service description:
 * - at least 8 characters
 * - at least one letter
 * - at least one number
 * - at least one special character
 */
export function isStrongPassword(password: string): boolean {
  return (
    password.length >= PASSWORD_MIN_LENGTH &&
    /[A-Za-z]/.test(password) &&
    /[0-9]/.test(password) &&
    /[^A-Za-z0-9]/.test(password)
  );
}

export function passwordPolicyMessage(language: PasswordPolicyLanguage): string {
  if (language === "fi") {
    return "Salasanassa pitää olla vähintään 8 merkkiä, yksi kirjain, yksi numero ja yksi erikoismerkki.";
  }
  if (language === "sv") {
    return "Lösenordet måste ha minst 8 tecken och innehålla en bokstav, en siffra och ett specialtecken.";
  }
  return "Password must be at least 8 characters and include a letter, number and special character.";
}
