import {
  ArrowRight,
  Camera,
  KeyRound,
  Plus,
  Save,
  Settings,
  Trash2,
} from "lucide-react";
import { AlertDialog } from "radix-ui";
import {
  type ChangeEvent,
  type KeyboardEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useNavigate } from "react-router";
import { ProfileAvatar } from "@/components/ProfileAvatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import type { AliasMapping } from "@/features/aliases/contracts";
import {
  useAliasMappings,
  useDeleteAliasMapping,
  useUpsertAliasMapping,
} from "@/features/aliases/hooks";
import {
  useAuthSession,
  useDeleteProfile,
  useUpdateProfile,
  useUpdateProfileAvatar,
} from "@/features/auth/hooks";
import { cn } from "@/lib/utils";
import { ApiError } from "@/shared/api/client";

interface AliasDraft {
  id: string;
  alias: string;
  expansion: string;
  originalAlias?: string;
  originalExpansion?: string;
  isNew?: boolean;
}

function createDraft(alias: AliasMapping): AliasDraft {
  return {
    id: alias.id,
    alias: alias.alias,
    expansion: alias.expansion,
    originalAlias: alias.alias,
    originalExpansion: alias.expansion,
  };
}

function createBlankDraft(): AliasDraft {
  return {
    id: `new-${crypto.randomUUID()}`,
    alias: "",
    expansion: "",
    isNew: true,
  };
}

export function SettingsPage() {
  const aliasesQuery = useAliasMappings();
  const upsertAlias = useUpsertAliasMapping();
  const deleteAlias = useDeleteAliasMapping();
  const [drafts, setDrafts] = useState<AliasDraft[]>([]);
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    setDrafts((aliasesQuery.data ?? []).map(createDraft));
  }, [aliasesQuery.data]);

  function getErrorMessage() {
    const error =
      localError ??
      aliasesQuery.error ??
      upsertAlias.error ??
      deleteAlias.error;

    if (typeof error === "string") {
      return error;
    }

    if (error instanceof ApiError || error instanceof Error) {
      return error.message;
    }

    return null;
  }

  const isSaving =
    upsertAlias.isPending || deleteAlias.isPending || aliasesQuery.isPending;

  const dirtyDrafts = useMemo(
    () =>
      drafts.filter((draft) => {
        const alias = draft.alias.trim();
        const expansion = draft.expansion.trim();

        if (draft.isNew) {
          return alias.length > 0 || expansion.length > 0;
        }

        return (
          alias !== draft.originalAlias || expansion !== draft.originalExpansion
        );
      }),
    [drafts]
  );
  const hasChanges = dirtyDrafts.length > 0;

  function updateDraft(id: string, patch: Partial<AliasDraft>) {
    setLocalError(null);
    setDrafts((current) =>
      current.map((draft) => (draft.id === id ? { ...draft, ...patch } : draft))
    );
  }

  function addDraft() {
    setLocalError(null);
    setDrafts((current) => [...current, createBlankDraft()]);
  }

  async function deleteDraft(draft: AliasDraft) {
    setLocalError(null);

    if (draft.isNew) {
      setDrafts((current) => current.filter((item) => item.id !== draft.id));
      return;
    }

    await deleteAlias.mutateAsync(draft.originalAlias ?? draft.alias);
  }

  async function saveDrafts() {
    setLocalError(null);

    const changedDrafts = dirtyDrafts.map((draft) => ({
      ...draft,
      alias: draft.alias.trim(),
      expansion: draft.expansion.trim(),
    }));
    const incomplete = changedDrafts.some(
      (draft) => draft.alias.length === 0 || draft.expansion.length === 0
    );

    if (incomplete) {
      setLocalError("Alias mappings need both a name and an EZQ expansion.");
      return;
    }

    const aliases = new Set<string>();
    const duplicate = drafts
      .map((draft) => draft.alias.trim())
      .filter(Boolean)
      .find((alias) => {
        if (aliases.has(alias)) return true;
        aliases.add(alias);
        return false;
      });

    if (duplicate) {
      setLocalError(`Alias "${duplicate}" is already listed.`);
      return;
    }

    for (const draft of changedDrafts) {
      await upsertAlias.mutateAsync({
        alias: draft.alias,
        expansion: draft.expansion,
      });

      if (
        draft.originalAlias &&
        draft.originalAlias !== draft.alias &&
        !changedDrafts.some((item) => item.alias === draft.originalAlias)
      ) {
        await deleteAlias.mutateAsync(draft.originalAlias);
      }
    }
  }

  return (
    <div className="flex min-h-[calc(100dvh-72px)] w-full flex-col">
      <header className="flex w-full items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <Settings size={28} className="shrink-0 text-[#A1A1AA]" />
          <h1 className="truncate text-[30px] font-semibold leading-[30px] tracking-[-0.03em] text-[#D4D4D8]">
            Settings
          </h1>
        </div>

        <Button
          type="button"
          variant={hasChanges ? "brand" : "brand-muted"}
          onClick={saveDrafts}
          disabled={!hasChanges || isSaving}
          className="h-9 rounded-[8px] px-3 text-sm"
        >
          <Save size={16} />
          Save
        </Button>
      </header>

      <div className="flex flex-1 justify-center pt-12 sm:pt-20 xl:pt-[94px]">
        <div className="flex w-full max-w-[548px] flex-col gap-12">
          <AccountSettings />

          <Separator />

          <section className="flex flex-col gap-8">
            <h2 className="text-xl font-semibold leading-6 text-[#E5E5E5]">
              Query settings
            </h2>

            <div className="flex flex-col gap-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex w-[318px] max-w-full flex-col gap-3">
                  <p className="text-sm leading-5 text-[#D4D4D4]">
                    Alias Mappings
                  </p>
                  <p className="text-sm leading-5 text-[#A3A3A3]">
                    Define aliases to commonly used query segments
                  </p>
                </div>

                <Button
                  type="button"
                  variant="surface"
                  onClick={addDraft}
                  disabled={isSaving}
                  className="h-9 rounded-[8px] px-3 text-sm"
                >
                  <Plus size={16} />
                  Add New
                </Button>
              </div>

              {getErrorMessage() ? (
                <div className="rounded-[8px] border border-[#7F1D1D] bg-[#450A0A]/40 px-3 py-2 text-sm leading-5 text-[#FCA5A5]">
                  {getErrorMessage()}
                </div>
              ) : null}

              <div className="flex flex-col gap-4">
                {drafts.map((draft) => (
                  <AliasMappingRow
                    key={draft.id}
                    draft={draft}
                    disabled={isSaving}
                    onChange={(patch) => updateDraft(draft.id, patch)}
                    onDelete={() => deleteDraft(draft)}
                    onSave={saveDrafts}
                  />
                ))}
              </div>

              {!aliasesQuery.isPending && drafts.length === 0 ? (
                <p className="text-sm leading-5 text-[#A3A3A3]">
                  No aliases yet. Add one to reuse common EZQ filters.
                </p>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}

function getReadableError(error: unknown) {
  if (!error) return null;
  if (typeof error === "string") return error;
  if (error instanceof ApiError || error instanceof Error) return error.message;
  return "Something went wrong";
}

function AccountSettings() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const session = useAuthSession();
  const updateProfile = useUpdateProfile();
  const updateAvatar = useUpdateProfileAvatar();
  const deleteProfile = useDeleteProfile();
  const profile = session.data;
  const [username, setUsername] = useState(profile?.username ?? "");
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    setUsername(profile?.username ?? "");
  }, [profile?.username]);

  const usernameDirty = username.trim() !== (profile?.username ?? "");
  const pending =
    updateProfile.isPending ||
    updateAvatar.isPending ||
    deleteProfile.isPending;
  const errorMessage =
    localError ??
    getReadableError(updateProfile.error) ??
    getReadableError(updateAvatar.error) ??
    getReadableError(deleteProfile.error);

  async function handleUsernameSave() {
    setLocalError(null);
    setSuccessMessage(null);
    const nextUsername = username.trim();

    if (!nextUsername) {
      setLocalError("Username is required.");
      return;
    }

    await updateProfile.mutateAsync({ username: nextUsername });
    setSuccessMessage("Username updated.");
  }

  async function handleAvatarChange(event: ChangeEvent<HTMLInputElement>) {
    setLocalError(null);
    setSuccessMessage(null);
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) return;

    await updateAvatar.mutateAsync(file);
    setSuccessMessage("Profile picture updated.");
  }

  async function handleDeleteProfile() {
    setLocalError(null);
    setSuccessMessage(null);
    await deleteProfile.mutateAsync();
    setDeleteDialogOpen(false);
    navigate("/login", { replace: true });
  }

  return (
    <section className="flex flex-col gap-8">
      <h2 className="text-xl font-semibold leading-6 text-[#E5E5E5]">
        Account Settings
      </h2>

      <div className="flex flex-col gap-6">
        {errorMessage ? (
          <div className="rounded-[8px] border border-[#7F1D1D] bg-[#450A0A]/40 px-3 py-2 text-sm leading-5 text-[#FCA5A5]">
            {errorMessage}
          </div>
        ) : null}

        {successMessage ? (
          <div className="rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-3 py-2 text-sm leading-5 text-[#D4D4D8]">
            {successMessage}
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-[120px_minmax(0,1fr)] sm:items-center">
          <ProfileAvatar
            name={profile?.username ?? "User"}
            avatarUrl={profile?.avatar_url}
            className="h-20 w-20 border border-[#3F3F46] text-[28px]"
          />

          <div className="flex min-w-0 flex-col gap-3">
            <div>
              <p className="text-sm leading-5 text-[#D4D4D4]">
                Profile picture
              </p>
              <p className="text-sm leading-5 text-[#A3A3A3]">
                Upload a square image. It will show in the sidebar.
              </p>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
            <Button
              type="button"
              variant="surface"
              disabled={pending}
              onClick={() => fileInputRef.current?.click()}
              className="h-9 w-fit rounded-[8px] px-3 text-sm"
            >
              <Camera size={16} />
              Change picture
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm leading-5 text-[#D4D4D4]">Username</p>
            <p className="text-sm leading-5 text-[#A3A3A3]">
              This is used when signing in.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter" || event.nativeEvent.isComposing) {
                  return;
                }
                event.preventDefault();
                if (usernameDirty && !pending) {
                  void handleUsernameSave();
                }
              }}
              disabled={pending}
              aria-label="Username"
              className="min-w-0"
            />
            <Button
              type="button"
              variant={usernameDirty ? "brand" : "brand-muted"}
              disabled={!usernameDirty || pending}
              onClick={handleUsernameSave}
              className="h-9 rounded-[8px] px-3 text-sm"
            >
              <Save size={16} />
              Update username
            </Button>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <div>
            <p className="text-sm leading-5 text-[#D4D4D4]">Password reset</p>
            <p className="text-sm leading-5 text-[#A3A3A3]">
              Open the password reset flow in its own page.
            </p>
          </div>

          <Button
            type="button"
            variant="surface"
            className="h-9 w-fit rounded-[8px] px-3 text-sm"
            onClick={() => navigate("/app/reset-password")}
          >
            <KeyRound size={16} />
            Reset password
          </Button>
        </div>

        <AlertDialog.Root
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
        >
          <AlertDialog.Trigger asChild>
            <Button
              type="button"
              variant="danger-surface"
              disabled={pending}
              className="h-9 w-fit rounded-[8px] px-3 text-sm"
            >
              <Trash2 size={16} />
              Permanently delete account
            </Button>
          </AlertDialog.Trigger>

          <AlertDialog.Portal>
            <AlertDialog.Overlay className="fixed inset-0 z-[240] bg-[#18181B]/[0.86] backdrop-blur-[8px]" />
            <AlertDialog.Content className="-translate-x-1/2 -translate-y-1/2 fixed left-1/2 top-1/2 z-[250] w-[calc(100vw-32px)] max-w-[420px] rounded-[12px] border border-[#3F3F46] bg-[#18181B] p-6 shadow-[0px_10px_15px_-3px_rgba(0,0,0,0.25),0px_4px_6px_-4px_rgba(0,0,0,0.2)] outline-none">
              <AlertDialog.Title className="text-[18px] font-semibold leading-7 text-[#FAFAFA]">
                Delete account?
              </AlertDialog.Title>
              <AlertDialog.Description className="mt-2 text-[14px] leading-5 text-[#A1A1AA]">
                This permanently deletes your account, library, collections, and
                uploaded media.
              </AlertDialog.Description>

              <div className="mt-6 flex justify-end gap-2">
                <AlertDialog.Cancel asChild>
                  <Button type="button" variant="surface" size="lg">
                    Cancel
                  </Button>
                </AlertDialog.Cancel>
                <AlertDialog.Action asChild>
                  <Button
                    type="button"
                    variant="danger-surface"
                    size="lg"
                    disabled={pending}
                    onClick={(event) => {
                      event.preventDefault();
                      void handleDeleteProfile();
                    }}
                  >
                    Delete account
                  </Button>
                </AlertDialog.Action>
              </div>
            </AlertDialog.Content>
          </AlertDialog.Portal>
        </AlertDialog.Root>
      </div>
    </section>
  );
}

function AliasMappingRow({
  draft,
  disabled,
  onChange,
  onDelete,
  onSave,
}: {
  draft: AliasDraft;
  disabled: boolean;
  onChange: (patch: Partial<AliasDraft>) => void;
  onDelete: () => void;
  onSave: () => void | Promise<void>;
}) {
  const isDirty =
    draft.isNew ||
    draft.alias.trim() !== draft.originalAlias ||
    draft.expansion.trim() !== draft.originalExpansion;
  const handleSaveKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "Enter" || event.nativeEvent.isComposing) return;

    event.preventDefault();
    void onSave();
  };

  return (
    <div className="grid w-full grid-cols-[1fr_36px] gap-3 sm:grid-cols-[180px_24px_minmax(0,1fr)_36px] sm:items-center">
      <Input
        value={draft.alias}
        onChange={(event) => onChange({ alias: event.target.value })}
        onKeyDown={handleSaveKeyDown}
        disabled={disabled}
        placeholder="favorite-w"
        aria-label="Alias name"
        className={cn(
          "h-9 min-w-0 text-sm",
          !isDirty && "text-[#FAFAFA]",
          draft.isNew && "text-[#A1A1AA]"
        )}
      />

      <ArrowRight
        size={24}
        className="hidden text-[#A1A1AA] sm:block"
        aria-hidden="true"
      />

      <Input
        value={draft.expansion}
        onChange={(event) => onChange({ expansion: event.target.value })}
        onKeyDown={handleSaveKeyDown}
        disabled={disabled}
        placeholder="personal_rating:>8 media_type:anime,movie,tv_show"
        aria-label="EZQ expansion"
        className="col-span-1 h-9 min-w-0 text-sm sm:col-auto"
      />

      <Button
        type="button"
        variant="danger-surface"
        size="icon-lg"
        onClick={onDelete}
        disabled={disabled}
        aria-label={`Delete ${draft.alias || "alias"}`}
        className="row-start-1 rounded-[8px] text-[#F87171] sm:row-auto"
      >
        <Trash2 size={16} />
      </Button>
    </div>
  );
}
