import {
  GripVertical,
  Link2,
  Pencil,
  Plus,
  Save,
  Trash2,
  Type,
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  useContentNodes,
  useCreateContentNode,
  useDeleteContentNode,
  useUpdateContentNode,
} from "@/features/content-nodes/hooks";
import type { ContentNode } from "@/features/content-nodes/types";

export function ContentNodesSection({
  libraryEntryId,
}: {
  libraryEntryId: string;
}) {
  const contentNodesQuery = useContentNodes(libraryEntryId);
  const createContentNode = useCreateContentNode(libraryEntryId);
  const updateContentNode = useUpdateContentNode(libraryEntryId);
  const deleteContentNode = useDeleteContentNode(libraryEntryId);
  const [isAddingNode, setIsAddingNode] = useState(false);
  const [draftNode, setDraftNode] = useState({ title: "", link: "" });
  const [editingNodeId, setEditingNodeId] = useState<string | null>(null);
  const [editingDraft, setEditingDraft] = useState({ title: "", link: "" });
  const [nodeError, setNodeError] = useState<string | null>(null);
  const contentNodes = contentNodesQuery.data ?? [];

  const isMutatingNode =
    createContentNode.isPending ||
    updateContentNode.isPending ||
    deleteContentNode.isPending;

  function startAddingNode() {
    setNodeError(null);
    setEditingNodeId(null);
    setEditingDraft({ title: "", link: "" });
    setDraftNode({ title: "", link: "" });
    setIsAddingNode(true);
  }

  function cancelAddingNode() {
    setNodeError(null);
    setDraftNode({ title: "", link: "" });
    setIsAddingNode(false);
  }

  function startEditingNode(node: ContentNode) {
    setNodeError(null);
    setIsAddingNode(false);
    setDraftNode({ title: "", link: "" });
    setEditingNodeId(node.id);
    setEditingDraft({ title: node.title, link: node.link });
  }

  function cancelEditingNode() {
    setNodeError(null);
    setEditingNodeId(null);
    setEditingDraft({ title: "", link: "" });
  }

  async function handleCreateNode() {
    const error = validateNodeDraft(draftNode);
    if (error) {
      setNodeError(error);
      return;
    }

    try {
      setNodeError(null);
      await createContentNode.mutateAsync({
        libraryEntryId,
        title: draftNode.title.trim(),
        link: draftNode.link.trim(),
      });
      setDraftNode({ title: "", link: "" });
      setIsAddingNode(false);
    } catch (error) {
      setNodeError(
        error instanceof Error
          ? error.message
          : "Failed to create content node."
      );
    }
  }

  async function handleUpdateNode() {
    if (!editingNodeId) {
      return;
    }

    const error = validateNodeDraft(editingDraft);
    if (error) {
      setNodeError(error);
      return;
    }

    try {
      setNodeError(null);
      await updateContentNode.mutateAsync({
        id: editingNodeId,
        title: editingDraft.title.trim(),
        link: editingDraft.link.trim(),
      });
      cancelEditingNode();
    } catch (error) {
      setNodeError(
        error instanceof Error
          ? error.message
          : "Failed to update content node."
      );
    }
  }

  async function handleDeleteNode(id: string) {
    try {
      setNodeError(null);

      if (editingNodeId === id) {
        cancelEditingNode();
      }

      await deleteContentNode.mutateAsync(id);
    } catch (error) {
      setNodeError(
        error instanceof Error
          ? error.message
          : "Failed to delete content node."
      );
    }
  }

  return (
    <section className="flex min-w-0 flex-1 flex-col gap-6 pt-2 xl:pt-10">
      <div className="flex w-full flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-[20px] font-semibold leading-6 text-[#FAFAFA]">
          Content Nodes
        </h2>

        <Button
          type="button"
          variant="surface"
          onClick={startAddingNode}
          disabled={isAddingNode || isMutatingNode}
          className="h-9 w-fit px-3 text-sm"
        >
          <Plus size={16} />
          Add New
        </Button>
      </div>

      <div className="flex w-full flex-col gap-3">
        {nodeError ? (
          <p className="text-sm text-[#F87171]">{nodeError}</p>
        ) : null}

        {contentNodesQuery.isLoading ? (
          <div className="flex h-20 items-center justify-center rounded-[8px] border border-[#3F3F46] bg-[#18181B]">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#3F3F46] border-t-[#FAFAFA]" />
          </div>
        ) : null}

        {!contentNodesQuery.isLoading &&
        contentNodes.length === 0 &&
        !isAddingNode ? (
          <div className="rounded-[8px] border border-dashed border-[#3F3F46] bg-[#18181B] px-4 py-6 text-sm text-[#A1A1AA]">
            No content nodes yet. Press Add New to create the first one.
          </div>
        ) : null}

        {contentNodes.map((node) =>
          editingNodeId === node.id ? (
            <ContentNodeEditor
              key={node.id}
              value={editingDraft}
              onChange={setEditingDraft}
              onSave={handleUpdateNode}
              onCancel={cancelEditingNode}
              saving={updateContentNode.isPending}
            />
          ) : (
            <ContentNodeRow
              key={node.id}
              node={node}
              onOpen={
                node.link
                  ? () =>
                      window.open(node.link, "_blank", "noopener,noreferrer")
                  : undefined
              }
              onEdit={() => startEditingNode(node)}
              onDelete={() => handleDeleteNode(node.id)}
              deleting={deleteContentNode.isPending}
            />
          )
        )}

        {isAddingNode ? (
          <ContentNodeEditor
            value={draftNode}
            onChange={setDraftNode}
            onSave={handleCreateNode}
            onCancel={cancelAddingNode}
            saving={createContentNode.isPending}
          />
        ) : null}
      </div>
    </section>
  );
}

function ContentNodeRow({
  node,
  onOpen,
  onEdit,
  onDelete,
  deleting,
}: {
  node: ContentNode;
  onOpen?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
      <div className="flex h-[41px] min-w-[250px] flex-1 items-center gap-1.5 rounded-[8px] bg-[#27272A] px-3 text-left">
        <GripVertical size={20} className="shrink-0 text-[#A1A1AA]" />
        <span className="truncate text-[18px] font-semibold leading-[27px] text-[#D4D4D8]">
          {node.title || "Untitled node"}
        </span>
      </div>

      <NodeActions
        onOpen={onOpen}
        onEdit={onEdit}
        onDelete={onDelete}
        deleting={deleting}
      />
    </div>
  );
}

function ContentNodeEditor({
  value,
  onChange,
  onSave,
  onCancel,
  saving,
}: {
  value: { title: string; link: string };
  onChange: (value: { title: string; link: string }) => void;
  onSave: () => void;
  onCancel: () => void;
  saving: boolean;
}) {
  return (
    <div className="flex w-full flex-wrap items-center gap-2">
      <div className="flex h-[41px] min-w-[250px] flex-1 items-center gap-2 rounded-[8px] border border-[#3F3F46] bg-[#27272A] px-3">
        <Type size={16} className="shrink-0 text-[#71717A]" />
        <Input
          value={value.title}
          onChange={(event) =>
            onChange({ ...value, title: event.target.value })
          }
          placeholder="Movie name"
          className="h-[41px] border-0 bg-transparent px-0 text-[18px] font-semibold leading-[27px] text-[#D4D4D8] shadow-none focus:border-0"
        />
      </div>
      <div className="flex h-[41px] min-w-[250px] flex-1 items-center gap-2 rounded-[6px] border border-[#3F3F46] bg-[#27272A] px-3">
        <Link2 size={16} className="shrink-0 text-[#71717A]" />
        <Input
          value={value.link}
          onChange={(event) => onChange({ ...value, link: event.target.value })}
          placeholder="https://sample.link"
          className="h-10 border-0 bg-transparent px-0 text-[16px] leading-6 text-[#D4D4D8] shadow-none focus:border-0"
        />
      </div>
      <IconButton label="Save node" onClick={onSave} disabled={saving}>
        <Save size={16} />
      </IconButton>
      <IconButton
        label="Cancel editing"
        danger
        onClick={onCancel}
        disabled={saving}
      >
        <Trash2 size={16} />
      </IconButton>
    </div>
  );
}

function validateNodeDraft(value: { title: string; link: string }) {
  if (value.title.trim().length === 0) {
    return "Content node title is required.";
  }

  if (value.link.trim().length === 0) {
    return "Content node link is required.";
  }

  try {
    new URL(value.link.trim());
  } catch {
    return "Content node link must be a valid URL.";
  }

  return null;
}

function NodeActions({
  onOpen,
  onEdit,
  onDelete,
  deleting,
}: {
  onOpen?: () => void;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  return (
    <div className="ml-auto flex items-center gap-2 sm:ml-0">
      <IconButton
        label="Link node"
        onClick={onOpen}
        disabled={!onOpen || deleting}
      >
        <Link2 size={16} />
      </IconButton>
      <IconButton label="Edit node" onClick={onEdit} disabled={deleting}>
        <Pencil size={16} />
      </IconButton>
      <IconButton
        label="Delete node"
        danger
        onClick={onDelete}
        disabled={deleting}
      >
        <Trash2 size={16} />
      </IconButton>
    </div>
  );
}

function IconButton({
  label,
  danger,
  children,
  onClick,
  disabled,
}: {
  label: string;
  danger?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant={danger ? "danger-surface" : "surface"}
      size="icon"
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="h-10 w-10"
    >
      {children}
    </Button>
  );
}
