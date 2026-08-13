import { useCallback, useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { StickyNote } from "@/components/StickyNote";
import { StrengthPickerGrid } from "@/components/strengths/StrengthPickerGrid";
import { useLanguage } from "@/lib/i18n";
import {
  giveStrengthToSchoolMember,
  listSchoolStrengthRecipients,
  type SchoolCommunityRole,
  type SchoolStrengthRecipient,
} from "@/lib/give-strength.functions";

const COPY = {
  fi: {
    title: "Anna vahvuus",
    intro: "Valitse kouluyhteisöstä henkilö, jolle haluat antaa vahvuuspalautetta.",
    search: "Etsi nimellä…",
    all: "Kaikki",
    student: "Opiskelijat",
    teacher: "Opettajat",
    school_admin: "Koulun adminit",
    choose: "Valitse henkilö",
    strength: "Valitse vahvuus",
    message: "Viesti (valinnainen)",
    send: "Lahjoita vahvuus",
    sent: "Vahvuus lähetetty!",
    empty: "Hakuehdoilla ei löytynyt henkilöitä.",
    loading: "Ladataan kouluyhteisöä…",
  },
  en: {
    title: "Give a strength",
    intro: "Choose someone in your school community and give them strength feedback.",
    search: "Search by name…",
    all: "All",
    student: "Students",
    teacher: "Teachers",
    school_admin: "School admins",
    choose: "Choose a person",
    strength: "Choose a strength",
    message: "Message (optional)",
    send: "Give strength",
    sent: "Strength sent!",
    empty: "No people match your search.",
    loading: "Loading school community…",
  },
  sv: {
    title: "Ge en styrka",
    intro: "Välj någon i skolgemenskapen och ge personen styrkefeedback.",
    search: "Sök med namn…",
    all: "Alla",
    student: "Elever",
    teacher: "Lärare",
    school_admin: "Skoladministratörer",
    choose: "Välj en person",
    strength: "Välj en styrka",
    message: "Meddelande (valfritt)",
    send: "Ge styrka",
    sent: "Styrkan har skickats!",
    empty: "Ingen matchar din sökning.",
    loading: "Laddar skolgemenskapen…",
  },
} as const;

type FilterRole = "all" | SchoolCommunityRole;

export function SchoolGiftPanel({ title }: { title?: string }) {
  const { language } = useLanguage();
  const text = COPY[language];
  const lang = language === "sv" ? "sv" : language === "en" ? "en" : "fi";
  const loadRecipients = useServerFn(listSchoolStrengthRecipients);
  const give = useServerFn(giveStrengthToSchoolMember);

  const [recipients, setRecipients] = useState<SchoolStrengthRecipient[]>([]);
  const [recipientId, setRecipientId] = useState("");
  const [filter, setFilter] = useState<FilterRole>("all");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<number[]>([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRecipients(await loadRecipients());
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [loadRecipients]);

  useEffect(() => {
    void load();
  }, [load]);

  const availableRoles = useMemo(
    () => [...new Set(recipients.map((recipient) => recipient.role))],
    [recipients],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLocaleLowerCase();
    return recipients.filter((recipient) => {
      if (filter !== "all" && recipient.role !== filter) return false;
      return !q || recipient.name.toLocaleLowerCase().includes(q);
    });
  }, [filter, query, recipients]);

  useEffect(() => {
    if (recipientId && !filtered.some((recipient) => recipient.id === recipientId)) {
      setRecipientId("");
    }
  }, [filtered, recipientId]);

  function toggleStrength(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((value) => value !== id)
        : current.length >= 3
          ? current
          : [...current, id],
    );
  }

  async function submit() {
    if (!recipientId || selected.length === 0) return;
    setBusy(true);
    try {
      await give({
        data: {
          recipientId,
          strengthIds: selected,
          message: message.trim() || null,
        },
      });
      toast.success(text.sent);
      setSelected([]);
      setMessage("");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Error");
    } finally {
      setBusy(false);
    }
  }

  const filterOptions: Array<{ id: FilterRole; label: string }> = [
    { id: "all", label: text.all },
    ...(["student", "teacher", "school_admin"] as const)
      .filter((role) => availableRoles.includes(role))
      .map((role) => ({ id: role, label: text[role] })),
  ];

  return (
    <StickyNote seed="school-community-gift" className="space-y-5">
      <div className="space-y-1">
        <h2 className="font-display text-2xl">{title ?? text.title}</h2>
        <p className="text-sm opacity-75">{text.intro}</p>
      </div>

      {loading ? (
        <p className="text-sm opacity-70">{text.loading}</p>
      ) : (
        <>
          <div className="space-y-3">
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={text.search}
              className="max-w-md bg-white text-[color:var(--ink)]"
            />

            <div className="flex flex-wrap gap-2">
              {filterOptions.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setFilter(option.id)}
                  className={
                    filter === option.id
                      ? "rounded-full bg-[color:var(--purple)] px-3 py-1.5 text-xs font-bold text-white"
                      : "rounded-full border border-[color:var(--purple)] bg-white px-3 py-1.5 text-xs font-bold text-[color:var(--purple)]"
                  }
                >
                  {option.label}
                </button>
              ))}
            </div>

            <div className="max-w-md space-y-1.5">
              <Label htmlFor="school-gift-recipient">{text.choose}</Label>
              <select
                id="school-gift-recipient"
                value={recipientId}
                onChange={(event) => setRecipientId(event.target.value)}
                className="h-11 w-full rounded-2xl border border-black/10 bg-white px-3 text-sm text-slate-900"
              >
                <option value="">{text.choose}</option>
                {filtered.map((recipient) => (
                  <option key={recipient.id} value={recipient.id}>
                    {recipient.name} · {text[recipient.role]}
                  </option>
                ))}
              </select>
              {filtered.length === 0 && <p className="text-xs opacity-65">{text.empty}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>{text.strength}</Label>
            <StrengthPickerGrid
              lang={lang}
              selectedIds={selected}
              disabled={busy || !recipientId}
              onSelect={toggleStrength}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="school-gift-message">{text.message}</Label>
            <Textarea
              id="school-gift-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              className="bg-white text-[color:var(--ink)]"
              rows={3}
              maxLength={500}
            />
          </div>

          <Button
            type="button"
            disabled={busy || !recipientId || selected.length === 0}
            onClick={() => void submit()}
            className="rounded-full bg-[color:var(--yellow)] font-bold text-[color:var(--ink)] hover:brightness-95"
          >
            {text.send}
          </Button>
        </>
      )}
    </StickyNote>
  );
}
