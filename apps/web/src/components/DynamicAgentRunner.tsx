"use client";

import { useMemo, useState, type FormEvent } from "react";
import { ImageIcon, Loader2, Upload } from "lucide-react";
import { uploadFile, type UploadedAttachment } from "@/lib/api";

export type AgentInputField = {
  id: string;
  label?: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
  options?: Array<string | { label?: string; value?: string }>;
  accept?: string;
  description?: string;
};

export type AgentInterfaceSchema = {
  mode?: string;
  title?: string;
  description?: string;
  submit_label?: string;
  input_fields?: AgentInputField[];
  output?: { type?: string; label?: string };
};

type Props = {
  schema: AgentInterfaceSchema;
  busy?: boolean;
  onSubmit: (payload: {
    fields: Record<string, unknown>;
    attachments: UploadedAttachment[];
  }) => void | Promise<void>;
  onError?: (message: string) => void;
};

function optionParts(option: string | { label?: string; value?: string }) {
  if (typeof option === "string") return { label: option, value: option };
  return {
    label: option.label || option.value || "",
    value: option.value || option.label || "",
  };
}

export function DynamicAgentRunner({ schema, busy, onSubmit, onError }: Props) {
  const fields = useMemo(
    () => (Array.isArray(schema.input_fields) ? schema.input_fields : []),
    [schema.input_fields]
  );
  const [values, setValues] = useState<Record<string, unknown>>({});
  const [files, setFiles] = useState<Record<string, UploadedAttachment[]>>({});
  const [uploading, setUploading] = useState<string | null>(null);

  const setValue = (id: string, value: unknown) => {
    setValues((current) => ({ ...current, [id]: value }));
  };

  const addFiles = async (field: AgentInputField, selected: FileList | null) => {
    if (!selected?.length) return;
    setUploading(field.id);
    try {
      const uploaded: UploadedAttachment[] = [];
      for (const file of Array.from(selected)) {
        uploaded.push(await uploadFile(file));
      }
      setFiles((current) => ({
        ...current,
        [field.id]: [...(current[field.id] || []), ...uploaded],
      }));
      setValue(field.id, uploaded.map((item) => item.filename));
    } catch (error) {
      onError?.(error instanceof Error ? error.message : "Upload failed");
    } finally {
      setUploading(null);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const attachments = Object.values(files).flat();
    await onSubmit({ fields: values, attachments });
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      {fields.map((field, index) => {
        const id = field.id || `field-${index}`;
        const type = String(field.type || "text").toLowerCase();
        const label = field.label || id;
        const options = (field.options || []).map(optionParts);

        return (
          <label key={id} className="block space-y-2">
            <span className="text-sm font-medium">
              {label}
              {field.required ? <span className="ml-1 text-danger">*</span> : null}
            </span>
            {field.description ? (
              <span className="block text-xs text-muted">{field.description}</span>
            ) : null}

            {type === "textarea" || type === "markdown" || type === "code" ? (
              <textarea
                required={field.required}
                value={String(values[id] || "")}
                onChange={(event) => setValue(id, event.target.value)}
                placeholder={field.placeholder}
                rows={5}
                className="field-input min-h-32 resize-y"
              />
            ) : type === "select" || (options.length > 0 && type !== "multiselect") ? (
              <select
                required={field.required}
                value={String(values[id] || "")}
                onChange={(event) => setValue(id, event.target.value)}
                className="field-input"
              >
                <option value="">Choose…</option>
                {options.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            ) : type === "multiselect" ? (
              <div className="flex flex-wrap gap-2">
                {options.map((option) => {
                  const selected = Array.isArray(values[id])
                    ? (values[id] as string[]).includes(option.value)
                    : false;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => {
                        const current = Array.isArray(values[id])
                          ? (values[id] as string[])
                          : [];
                        setValue(
                          id,
                          selected
                            ? current.filter((value) => value !== option.value)
                            : [...current, option.value]
                        );
                      }}
                      className={`min-h-tap rounded-full px-4 text-sm ring-1 transition ${
                        selected
                          ? "bg-alive/15 text-alive ring-alive/30"
                          : "bg-background text-muted ring-border"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            ) : type === "boolean" || type === "checkbox" ? (
              <input
                type="checkbox"
                checked={Boolean(values[id])}
                onChange={(event) => setValue(id, event.target.checked)}
                className="h-5 w-5 accent-[var(--alive)]"
              />
            ) : ["image", "file", "audio", "video", "document", "upload"].includes(type) ? (
              <span className="flex min-h-28 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-background/60 p-4 text-center text-sm text-muted hover:border-alive/50">
                {type === "image" ? <ImageIcon className="mb-2" /> : <Upload className="mb-2" />}
                {uploading === id ? "Uploading…" : field.placeholder || `Choose ${type}`}
                <input
                  type="file"
                  required={field.required && !(files[id]?.length > 0)}
                  accept={field.accept || (type === "image" ? "image/*" : undefined)}
                  multiple={type !== "image"}
                  disabled={busy || uploading === id}
                  onChange={(event) => void addFiles(field, event.target.files)}
                  className="sr-only"
                />
                {files[id]?.length ? (
                  <span className="mt-2 text-xs text-alive">
                    {files[id].map((file) => file.filename).join(", ")}
                  </span>
                ) : null}
              </span>
            ) : (
              <input
                type={type === "number" ? "number" : type === "email" ? "email" : "text"}
                required={field.required}
                value={String(values[id] || "")}
                onChange={(event) =>
                  setValue(id, type === "number" ? event.target.valueAsNumber : event.target.value)
                }
                placeholder={field.placeholder}
                className="field-input"
              />
            )}
          </label>
        );
      })}

      <button
        type="submit"
        disabled={busy || uploading !== null}
        className="inline-flex min-h-tap items-center justify-center gap-2 rounded-full bg-alive px-6 font-semibold text-on-alive disabled:opacity-50"
      >
        {busy ? <Loader2 size={18} className="animate-spin" /> : null}
        {schema.submit_label || "Run"}
      </button>
    </form>
  );
}
