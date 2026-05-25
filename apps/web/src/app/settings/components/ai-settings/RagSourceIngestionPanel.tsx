/**
 * @file RagSourceIngestionPanel.tsx
 * @description Source ingestion controls for adding text, uploaded files, and URL content to the RAG index.
 */

import { FormEvent, useMemo, useState } from "react";
import { FileUp, Link2, Loader2, TextCursorInput, UploadCloud } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { aiApi } from "@/lib/api-client";
import { cn } from "@/lib/utils";

type IngestionMode = "file" | "url" | "text";

interface RagSourceIngestionPanelProps {
  databaseId?: string;
  onIndexed: () => void;
}

const INGESTION_MODES: Array<{
  key: IngestionMode;
  label: string;
  icon: typeof FileUp;
}> = [
  { key: "file", label: "File", icon: FileUp },
  { key: "url", label: "URL", icon: Link2 },
  { key: "text", label: "Text", icon: TextCursorInput },
];

const SUPPORTED_FILE_TYPES = ".pdf,.docx,.md,.markdown,.txt,.html,.htm";

export function RagSourceIngestionPanel({ databaseId, onIndexed }: RagSourceIngestionPanelProps) {
  const [mode, setMode] = useState<IngestionMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [fileTitle, setFileTitle] = useState("");
  const [url, setUrl] = useState("");
  const [urlTitle, setUrlTitle] = useState("");
  const [textTitle, setTextTitle] = useState("");
  const [textContent, setTextContent] = useState("");

  const ingestFileMutation = useMutation({
    mutationFn: () => {
      if (!file) throw new Error("Choose a file before indexing.");
      return aiApi.ingestRagFile({
        file,
        title: fileTitle.trim() || undefined,
        databaseId,
        accessScope: "user",
      });
    },
    onSuccess: () => {
      toast.success("File source indexed.");
      setFile(null);
      setFileTitle("");
      onIndexed();
    },
    onError: (err: any) => toast.error(`File ingestion failed: ${err.message}`),
  });

  const ingestUrlMutation = useMutation({
    mutationFn: () => aiApi.ingestRagUrl({
      url: url.trim(),
      title: urlTitle.trim() || undefined,
      databaseId,
      accessScope: "user",
    }),
    onSuccess: () => {
      toast.success("URL source indexed.");
      setUrl("");
      setUrlTitle("");
      onIndexed();
    },
    onError: (err: any) => toast.error(`URL ingestion failed: ${err.message}`),
  });

  const indexTextMutation = useMutation({
    mutationFn: () => aiApi.indexRagSource({
      title: textTitle.trim(),
      content: textContent.trim(),
      sourceType: "document",
      databaseId,
      accessScope: "user",
    }),
    onSuccess: () => {
      toast.success("Text source indexed.");
      setTextTitle("");
      setTextContent("");
      onIndexed();
    },
    onError: (err: any) => toast.error(`Text indexing failed: ${err.message}`),
  });

  const isPending = ingestFileMutation.isPending || ingestUrlMutation.isPending || indexTextMutation.isPending;
  const canSubmit = useMemo(() => {
    if (mode === "file") return Boolean(file);
    if (mode === "url") return Boolean(url.trim());
    return Boolean(textTitle.trim() && textContent.trim());
  }, [file, mode, textContent, textTitle, url]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit || isPending) return;
    if (mode === "file") ingestFileMutation.mutate();
    if (mode === "url") ingestUrlMutation.mutate();
    if (mode === "text") indexTextMutation.mutate();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border border-border/50 bg-muted/10 p-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          className="inline-flex rounded-lg border border-border/50 bg-background/70 p-1"
          role="tablist"
          aria-label="RAG ingestion source type"
        >
          {INGESTION_MODES.map((item) => {
            const Icon = item.icon;
            const isActive = mode === item.key;
            return (
              <Button
                key={item.key}
                type="button"
                variant="ghost"
                size="sm"
                role="tab"
                aria-selected={isActive}
                className={cn(
                  "h-8 gap-2 rounded-md px-3 text-xs",
                  isActive ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 hover:text-primary-foreground" : "text-muted-foreground",
                )}
                onClick={() => setMode(item.key)}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
              </Button>
            );
          })}
        </div>
        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {mode === "file" ? "PDF DOCX MD HTML" : mode === "url" ? "HTTP GitHub" : "Manual"}
        </div>
      </div>

      {mode === "file" ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-lg border border-dashed border-border/70 bg-background/70 px-4 py-3 transition-colors hover:border-primary/50">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-emerald-500/20 bg-emerald-500/10 text-emerald-600">
              <UploadCloud className="h-5 w-5" />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-bold">{file?.name || "Choose source file"}</span>
              <span className="block truncate text-[10px] uppercase tracking-widest text-muted-foreground">
                {file ? `${Math.ceil(file.size / 1024)} KB` : "PDF DOCX Markdown Text HTML"}
              </span>
            </span>
            <input
              type="file"
              accept={SUPPORTED_FILE_TYPES}
              className="sr-only"
              onChange={(event) => setFile(event.target.files?.[0] || null)}
            />
          </label>
          <Input
            value={fileTitle}
            onChange={(event) => setFileTitle(event.target.value)}
            placeholder="Title override"
            className="h-10 self-center rounded-lg bg-background/70"
          />
          <SubmitButton isPending={isPending} disabled={!canSubmit} />
        </div>
      ) : null}

      {mode === "url" ? (
        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_220px_auto]">
          <Input
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            placeholder="https://example.com/docs"
            className="h-10 rounded-lg bg-background/70"
            inputMode="url"
          />
          <Input
            value={urlTitle}
            onChange={(event) => setUrlTitle(event.target.value)}
            placeholder="Title override"
            className="h-10 rounded-lg bg-background/70"
          />
          <SubmitButton isPending={isPending} disabled={!canSubmit} />
        </div>
      ) : null}

      {mode === "text" ? (
        <div className="grid gap-3 lg:grid-cols-[220px_minmax(0,1fr)_auto]">
          <Input
            value={textTitle}
            onChange={(event) => setTextTitle(event.target.value)}
            placeholder="Document title"
            className="h-10 rounded-lg bg-background/70"
          />
          <Textarea
            value={textContent}
            onChange={(event) => setTextContent(event.target.value)}
            placeholder="Markdown or text content"
            className="min-h-10 rounded-lg bg-background/70 text-xs"
          />
          <SubmitButton isPending={isPending} disabled={!canSubmit} />
        </div>
      ) : null}
    </form>
  );
}

function SubmitButton({ isPending, disabled }: { isPending: boolean; disabled: boolean }) {
  return (
    <Button type="submit" className="h-10 gap-2 self-start lg:self-center" disabled={disabled || isPending}>
      {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
      Index
    </Button>
  );
}
