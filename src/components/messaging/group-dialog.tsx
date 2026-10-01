"use client";

import { useMemo, useState } from "react";
import { Check, Crown, Loader2, LogOut, Search, X } from "lucide-react";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ContactAvatar } from "@/components/messaging/contact-avatar";
import {
  GROUP_MAX_MEMBERS,
  GROUP_TITLE_MAX_LENGTH,
  messagingRoleLabel,
  type ConversationSummary,
  type MessagingContact,
} from "@/domain/messaging";

type GroupPatch = { title?: string; addMemberIds?: string[]; removeMemberIds?: string[] };

type GroupDialogProps = {
  /** `create` : nouveau groupe. Une conversation de groupe : sa gestion. `null` : ferme. */
  target: "create" | ConversationSummary | null;
  currentUserId: string;
  /** Annuaire : toute la console, les seules personnes que l'on peut ajouter. */
  contacts: MessagingContact[];
  onClose: () => void;
  onCreate: (title: string, memberIds: string[]) => Promise<string | null>;
  /** Rend le message d'erreur, ou `null` si tout s'est bien passe. */
  onUpdate: (conversationId: string, patch: GroupPatch) => Promise<string | null>;
  onLeave: (conversationId: string) => Promise<string | null>;
};

/**
 * Creation et gestion d'un groupe.
 *
 * Seul le createur modifie (nom, membres) ; les autres voient la liste et peuvent partir.
 * La fenetre est remontee a chaque ouverture (`key`), ce qui remet ses champs a zero sans
 * effet de synchronisation.
 */
export function GroupDialog(props: GroupDialogProps) {
  const { target, onClose } = props;
  const key = target === null ? "closed" : target === "create" ? "create" : target.id;

  return (
    <Dialog open={target !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="border-app-line bg-app-surface text-app-text sm:max-w-md">
        {target === "create" && <CreateGroup key={key} {...props} />}
        {target && target !== "create" && target.group && (
          <ManageGroup key={key} {...props} conversation={target} />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Liste de contacts a cocher, avec recherche. */
function MemberPicker({
  contacts,
  selected,
  onToggle,
}: {
  contacts: MessagingContact[];
  selected: Set<string>;
  onToggle: (id: string) => void;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return contacts;
    return contacts.filter((contact) => `${contact.name} ${contact.email}`.toLowerCase().includes(query));
  }, [contacts, search]);

  if (!contacts.length) {
    return <p className="py-4 text-center text-app-sm text-app-text-muted">Aucun contact à ajouter.</p>;
  }

  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 rounded-app-control border border-app-line px-2.5 py-1.5">
        <Search aria-hidden="true" className="h-4 w-4 text-app-text-muted" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Rechercher un contact"
          aria-label="Rechercher un contact"
          className="min-w-0 flex-1 bg-transparent text-app-sm text-app-text outline-none placeholder:text-app-text-muted"
        />
      </label>
      <ul className="max-h-56 overflow-y-auto rounded-app-control border border-app-line">
        {filtered.map((contact) => {
          const checked = selected.has(contact.id);
          return (
            <li key={contact.id}>
              <button
                type="button"
                role="checkbox"
                aria-checked={checked}
                onClick={() => onToggle(contact.id)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-app-surface-hover focus-visible:outline-app"
              >
                <ContactAvatar
                  profileId={contact.id}
                  avatarUrl={contact.avatarUrl}
                  name={contact.name}
                  email={contact.email}
                  size={28}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-app-sm text-app-text">{contact.name}</span>
                  <span className="block truncate text-app-xs text-app-text-muted">
                    {messagingRoleLabel(contact.role)}
                  </span>
                </span>
                <span
                  aria-hidden="true"
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded border",
                    checked ? "border-app-accent bg-app-accent text-app-on-accent" : "border-app-line",
                  )}
                >
                  {checked && <Check className="h-3 w-3" />}
                </span>
              </button>
            </li>
          );
        })}
        {!filtered.length && (
          <li className="px-3 py-4 text-center text-app-sm text-app-text-muted">Aucun résultat.</li>
        )}
      </ul>
    </div>
  );
}

function useSelection() {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const toggle = (id: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  return { selected, toggle, clear: () => setSelected(new Set()) };
}

function TitleInput({ value, onChange, disabled }: { value: string; onChange: (value: string) => void; disabled?: boolean }) {
  return (
    <label className="block space-y-1">
      <span className="text-app-xs font-medium text-app-text-secondary">Nom du groupe</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value.slice(0, GROUP_TITLE_MAX_LENGTH))}
        disabled={disabled}
        placeholder="Ex. Équipe paie"
        className="w-full rounded-app-control border border-app-line bg-transparent px-2.5 py-1.5 text-app-sm text-app-text outline-none placeholder:text-app-text-muted focus-visible:border-app-accent disabled:opacity-70"
      />
    </label>
  );
}

function CreateGroup({ contacts, onCreate, onClose }: GroupDialogProps) {
  const [title, setTitle] = useState("");
  const { selected, toggle } = useSelection();
  const [saving, setSaving] = useState(false);
  const tooMany = selected.size + 1 > GROUP_MAX_MEMBERS;
  const canCreate = title.trim().length > 0 && selected.size > 0 && !tooMany && !saving;

  const create = async () => {
    setSaving(true);
    try {
      if (await onCreate(title.trim(), Array.from(selected))) onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-app-lg">Nouveau groupe</DialogTitle>
        <DialogDescription className="text-app-sm text-app-text-secondary">
          Choisissez un nom et les membres du groupe.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-3">
        <TitleInput value={title} onChange={setTitle} />
        <MemberPicker contacts={contacts} selected={selected} onToggle={toggle} />
        <p className={cn("text-app-xs", tooMany ? "text-red-500" : "text-app-text-muted")}>
          {selected.size} membre{selected.size > 1 ? "s" : ""} sélectionné{selected.size > 1 ? "s" : ""}
          {tooMany && ` — ${GROUP_MAX_MEMBERS} membres au plus, vous compris`}
        </p>
      </div>
      <DialogFooter className="gap-2 sm:gap-0">
        <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={saving}>
          Annuler
        </Button>
        <Button type="button" size="sm" onClick={() => void create()} disabled={!canCreate}>
          {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Créer le groupe
        </Button>
      </DialogFooter>
    </>
  );
}

function ManageGroup({
  conversation,
  currentUserId,
  contacts,
  onUpdate,
  onLeave,
  onClose,
}: GroupDialogProps & { conversation: ConversationSummary }) {
  const group = conversation.group!;
  const isOwner = group.createdBy === currentUserId;

  const [title, setTitle] = useState(group.title);
  const [adding, setAdding] = useState(false);
  const { selected, toggle, clear } = useSelection();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmLeave, setConfirmLeave] = useState(false);

  const memberIds = new Set(group.members.map((member) => member.id));
  const addable = contacts.filter((contact) => !memberIds.has(contact.id));

  const run = async (action: () => Promise<string | null>, after?: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const failure = await action();
      if (failure) setError(failure);
      else after?.();
    } finally {
      setBusy(false);
    }
  };

  const titleChanged = title.trim() !== group.title && title.trim().length > 0;

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-app-lg">{group.title}</DialogTitle>
        <DialogDescription className="text-app-sm text-app-text-secondary">
          {group.members.length + 1} membres
          {isOwner ? " · vous gérez ce groupe" : ""}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {isOwner && (
          <div className="flex items-end gap-2">
            <div className="min-w-0 flex-1">
              <TitleInput value={title} onChange={setTitle} disabled={busy} />
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={!titleChanged || busy}
              onClick={() => void run(() => onUpdate(conversation.id, { title: title.trim() }))}
            >
              Renommer
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-app-xs font-medium text-app-text-secondary">Membres</p>
          <ul className="max-h-56 divide-y divide-app-line overflow-y-auto rounded-app-control border border-app-line">
            <li className="flex items-center gap-3 px-3 py-2 text-app-sm text-app-text">
              <span className="min-w-0 flex-1 truncate">Vous</span>
              {isOwner && <Crown aria-label="Gère le groupe" className="h-4 w-4 text-app-text-muted" />}
            </li>
            {group.members.map((member) => (
              <li key={member.id} className="flex items-center gap-3 px-3 py-2">
                <ContactAvatar
                  profileId={member.id}
                  avatarUrl={member.avatarUrl}
                  name={member.name}
                  email={member.email}
                  size={28}
                />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-app-sm text-app-text">{member.name}</span>
                  <span className="block truncate text-app-xs text-app-text-muted">
                    {messagingRoleLabel(member.role)}
                  </span>
                </span>
                {group.createdBy === member.id && (
                  <Crown aria-label="Gère le groupe" className="h-4 w-4 text-app-text-muted" />
                )}
                {isOwner && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void run(() => onUpdate(conversation.id, { removeMemberIds: [member.id] }))}
                    aria-label={`Retirer ${member.name} du groupe`}
                    title="Retirer du groupe"
                    className="rounded-app-control p-1 text-app-text-muted transition-colors hover:text-red-500 focus-visible:outline-app disabled:opacity-50"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>

        {isOwner &&
          (adding ? (
            <div className="space-y-2">
              <p className="text-app-xs font-medium text-app-text-secondary">Ajouter des membres</p>
              <MemberPicker contacts={addable} selected={selected} onToggle={toggle} />
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    clear();
                    setAdding(false);
                  }}
                  disabled={busy}
                >
                  Annuler
                </Button>
                <Button
                  type="button"
                  size="sm"
                  disabled={!selected.size || busy}
                  onClick={() =>
                    void run(
                      () => onUpdate(conversation.id, { addMemberIds: Array.from(selected) }),
                      () => {
                        clear();
                        setAdding(false);
                      },
                    )
                  }
                >
                  Ajouter {selected.size > 0 ? `(${selected.size})` : ""}
                </Button>
              </div>
            </div>
          ) : (
            <Button type="button" variant="outline" size="sm" onClick={() => setAdding(true)} disabled={busy}>
              Ajouter des membres
            </Button>
          ))}

        {error && <p className="text-app-sm text-red-500">{error}</p>}
      </div>

      <DialogFooter className="gap-2 sm:justify-between sm:gap-0">
        {confirmLeave ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <span className="text-app-xs text-app-text-secondary">
              {isOwner && group.members.length
                ? "La gestion passera au plus ancien membre."
                : "Vous ne verrez plus ce groupe."}
            </span>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={() => setConfirmLeave(false)} disabled={busy}>
                Rester
              </Button>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                disabled={busy}
                onClick={() => void run(() => onLeave(conversation.id), onClose)}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Quitter
              </Button>
            </div>
          </div>
        ) : (
          <Button type="button" variant="outline" size="sm" onClick={() => setConfirmLeave(true)} disabled={busy}>
            <LogOut className="mr-2 h-4 w-4" />
            Quitter le groupe
          </Button>
        )}
        <Button type="button" size="sm" onClick={onClose} disabled={busy}>
          Fermer
        </Button>
      </DialogFooter>
    </>
  );
}
