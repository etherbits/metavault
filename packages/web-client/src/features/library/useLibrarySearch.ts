import { generate_ast } from "@etherbits/ezq-web";
import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "react-router";
import { canonicalizeEzqQuery } from "@/features/library/ezqCanonical";
import { useEzqSearch } from "@/features/library/hooks";
import type { MediaItem } from "@/features/library/types";

const QUERY_PARAM = "query";

export type QueryAction = "search" | "create" | "update" | "delete";

export function useLibrarySearch() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get(QUERY_PARAM) ?? "";

  const [draft, setDraft] = useState(urlQuery);
  const [executedQuery, setExecutedQuery] = useState<string>(() =>
    getExecutableLoadQuery(urlQuery)
  );
  const [canonicalError, setCanonicalError] = useState<string | null>(null);
  const [override, setOverride] = useState<MediaItem[] | null>(null);
  const submittedQueryRef = useRef<string | null>(null);

  useEffect(() => {
    setDraft(urlQuery);
    setCanonicalError(null);
    setOverride(null);

    if (submittedQueryRef.current === urlQuery) {
      submittedQueryRef.current = null;
    } else {
      setExecutedQuery(getExecutableLoadQuery(urlQuery));
    }
  }, [urlQuery]);

  const ezqSearch = useEzqSearch(executedQuery);

  const queryResults = useMemo(() => {
    if (override) return override;
    return ezqSearch.data ?? [];
  }, [override, ezqSearch.data]);

  const canonicalPreview = useMemo(() => {
    const trimmed = draft.trim();

    try {
      return { query: canonicalizeEzqQuery(trimmed), error: null };
    } catch (error) {
      return {
        query: "",
        error: error instanceof Error ? error.message : undefined,
      };
    }
  }, [draft]);

  const queryAction = useMemo(() => parseDraftAction(draft), [draft]);

  const handleQueryChange = (value: string) => {
    setDraft(value);
    setCanonicalError(null);
  };

  const handleQuerySearch = (value: string) => {
    const next = value.trim();
    let canonical = "";

    try {
      canonical = canonicalizeEzqQuery(next);
    } catch (error) {
      setDraft(value);
      setOverride([]);
      setCanonicalError(
        error instanceof Error ? error.message : "Unable to parse query"
      );
      return;
    }

    setDraft(value);
    setExecutedQuery(canonical);
    if (canonical === executedQuery) {
      void ezqSearch.refetch();
    }
    submittedQueryRef.current = next;
    setCanonicalError(null);
    setOverride(null);
    setSearchParams(
      (params) => {
        if (next === "") {
          params.delete(QUERY_PARAM);
        } else {
          params.set(QUERY_PARAM, next);
        }
        return params;
      },
      { replace: true }
    );
  };

  const replaceQueryResults = (items: MediaItem[]) => {
    setOverride(items);
  };

  const refreshQuery = async () => {
    if (executedQuery.length > 0) {
      await ezqSearch.refetch();
    }
  };

  const clearQuery = () => {
    setSearchParams(
      (params) => {
        params.delete(QUERY_PARAM);
        return params;
      },
      { replace: true }
    );
  };

  return {
    clearQuery,
    handleQueryChange,
    handleQuerySearch,
    isQueryExecuting: ezqSearch.isFetching,
    canonicalQuery: canonicalPreview.query,
    canonicalQueryError: canonicalPreview.error,
    query: draft,
    queryAction,
    queryError:
      canonicalError ??
      (ezqSearch.error instanceof Error ? ezqSearch.error.message : null),
    queryResults,
    replaceQueryResults,
    refreshQuery,
  };
}

function parseDraftAction(draft: string): QueryAction {
  const trimmed = draft.trim();
  if (trimmed === "") return "search";

  try {
    const ast = generate_ast(trimmed);
    if ("Root" in ast && isQueryAction(ast.Root.action)) {
      return ast.Root.action;
    }
  } catch {}

  return "search";
}

function isQueryAction(value: string): value is QueryAction {
  return (
    value === "search" ||
    value === "create" ||
    value === "update" ||
    value === "delete"
  );
}

function getExecutableLoadQuery(query: string) {
  const trimmed = query.trim();
  if (trimmed === "") return "/search";

  try {
    const canonical = canonicalizeEzqQuery(trimmed);
    return isSearchQuery(canonical) ? canonical : "";
  } catch {
    return "";
  }
}

function isSearchQuery(query: string) {
  const action = query.trim().match(/^\/([^\s]+)/)?.[1] ?? "";
  return action === "s" || action === "search";
}
