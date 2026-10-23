"use client";

import { useEffect, useRef, useState } from "react";

type TicketResult = {
  branchName: string;
  commitMessage: string;
  prTitle: string;
  prDescription: string;
};

const FIELDS: {
  key: keyof TicketResult;
  label: string;
  description: string;
  mono?: boolean;
  rows?: number;
}[] = [
  {
    key: "branchName",
    label: "Branch Name",
    description: "Git branch for your ticket (no prefix)",
    mono: true,
    rows: 1,
  },
  {
    key: "commitMessage",
    label: "Commit Message",
    description: "Direct commit message (no prefix)",
    mono: true,
    rows: 2,
  },
  {
    key: "prTitle",
    label: "PR Title",
    description: "Concise summary for review",
    rows: 1,
  },
  {
    key: "prDescription",
    label: "PR Description",
    description: "Markdown overview and test plan",
    rows: 7,
  },
];

export default function Home() {
  const [image, setImage] = useState<File | null>(null);
  const [description, setDescription] = useState("");
  const [preview, setPreview] = useState<string | null>(null);
  const [result, setResult] = useState<TicketResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!image) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(image);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [image]);

  function validateAndSetFile(file?: File) {
    setError("");
    setResult(null);
    setCopiedKey(null);

    if (!file) {
      setImage(null);
      return;
    }

    const allowed = ["image/jpeg", "image/png", "image/webp"];
    if (!allowed.includes(file.type)) {
      setError("Please select a JPEG, PNG, or WebP image.");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File exceeds 5 MB limit.");
      return;
    }

    setDescription("");
    setImage(file);
  }

  function handleDescriptionChange(value: string) {
    setError("");
    setResult(null);
    setCopiedKey(null);
    setDescription(value);
    if (value.trim()) setImage(null);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    validateAndSetFile(e.target.files?.[0]);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    validateAndSetFile(e.dataTransfer.files?.[0]);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
  }

  async function handleScan() {
    if (!image && !description.trim()) {
      setError("Please upload a ticket screenshot or enter a description first.");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCopiedKey(null);

    try {
      const formData = new FormData();
      if (image) formData.append("image", image);
      else formData.append("description", description.trim());

      const res = await fetch("/api/scan-ticket", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Unable to analyze ticket.");
      }

      const cleanBranch = (data.branchName || "").replace(/^(feat|fix|chore|bug|refactor|docs|test)\//i, "");
      const cleanCommit = (data.commitMessage || "").replace(/^(feat|fix|chore|bug|refactor|docs|test)(\([^)]*\))?:\s*/i, "");

      setResult({
        ...data,
        branchName: cleanBranch,
        commitMessage: cleanCommit,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  function updateField(key: keyof TicketResult, val: string) {
    setResult((prev) => (prev ? { ...prev, [key]: val } : prev));
  }

  async function copyText(text: string, key: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((curr) => (curr === key ? null : curr));
      }, 2000);
    } catch {
      setError("Copy failed. Please copy manually.");
    }
  }

  async function copyAll() {
    if (!result) return;
    const full = FIELDS.map((f) => `### ${f.label}\n${result[f.key]}`).join("\n\n");
    await copyText(full, "all");
  }

  function resetAll() {
    setImage(null);
    setDescription("");
    setResult(null);
    setError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 flex flex-col justify-between">
      {/* Top Navigation */}
      <header className="sticky top-0 z-20 border-b border-zinc-200 dark:border-zinc-800 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 flex items-center justify-center font-semibold text-sm shadow-xs">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <circle cx="18" cy="18" r="3" />
                <circle cx="6" cy="6" r="3" />
                <path d="M13 6h3a2 2 0 0 1 2 2v7" />
                <line x1="6" y1="9" x2="6" y2="21" />
              </svg>
            </div>
            <span className="font-semibold text-sm tracking-tight">AI Ticket-to-PR</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Gemini 2.5 Flash
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-4 py-8 flex-1">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
          id="ticket-upload"
        />

        {!image && !description.trim() ? (
          /* View 1: Centered Upload State (No Image) */
          <div className="max-w-xl mx-auto pt-6 pb-12">
            <div className="text-center mb-8">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-900/60 mb-3">
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                </svg>
                Automated Git Workflow
              </div>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
                From ticket input to ready-to-merge PR
              </h1>
              <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                Upload any ticket from Jira, Linear, or GitHub. Instant branch names, commit messages, and PR descriptions.
              </p>
            </div>

            <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-6">
              <label
                htmlFor="ticket-upload"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                className={`flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-10 cursor-pointer transition-colors ${
                  isDragging
                    ? "border-blue-500 bg-blue-50/50 dark:bg-blue-950/20"
                    : "border-zinc-300 dark:border-zinc-700 hover:border-zinc-400 dark:hover:border-zinc-600 bg-zinc-50/50 dark:bg-zinc-900/50"
                }`}
              >
                <div className="w-12 h-12 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-600 dark:text-zinc-400 mb-3 shadow-xs">
                  <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" />
                    <path d="M12 12v9" />
                    <path d="m16 16-4-4-4 4" />
                  </svg>
                </div>
                <p className="text-sm font-medium text-zinc-800 dark:text-zinc-200">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                  Supported formats: PNG, JPG, WebP up to 5 MB
                </p>
              </label>

              <div className="my-5 flex items-center gap-3 text-[11px] uppercase tracking-wider text-zinc-400">
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
                or describe it
                <span className="h-px flex-1 bg-zinc-200 dark:bg-zinc-800" />
              </div>
              <label htmlFor="ticket-description" className="text-xs font-medium text-zinc-700 dark:text-zinc-300">
                Ticket description
              </label>
              <textarea
                id="ticket-description"
                value={description}
                onChange={(e) => handleDescriptionChange(e.target.value)}
                placeholder="Describe what needs to be built or fixed..."
                rows={5}
                maxLength={10000}
                className="mt-1.5 w-full rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50/50 dark:bg-zinc-950/50 p-3 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 resize-y"
              />
              <button
                type="button"
                onClick={handleScan}
                disabled={!description.trim() || loading}
                className="mt-3 w-full h-10 rounded-lg bg-zinc-900 text-white text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Generate PR Details
              </button>

              {error && (
                <div className="mt-4 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-800 dark:text-red-300">
                  {error}
                </div>
              )}
            </div>
          </div>
        ) : (
          /* View 2: Horizontal 2-Column Layout (Image or Description) */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Column: Ticket Preview & Controls */}
            <div className="lg:col-span-5 lg:sticky lg:top-20 space-y-4">
              <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-4">
                <div className="flex items-center justify-between pb-3 border-b border-zinc-100 dark:border-zinc-800">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    <h2 className="text-sm font-semibold">{image ? "Ticket Screenshot" : "Ticket Description"}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition"
                    >
                      Change
                    </button>
                    <span className="text-zinc-300 dark:text-zinc-700">|</span>
                    <button
                      type="button"
                      onClick={resetAll}
                      className="text-xs text-red-600 dark:text-red-400 hover:underline transition"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {image ? (
                  <>
                    {preview && (
                      <div className="mt-3 rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-950/5 dark:bg-zinc-950/50 p-2 overflow-hidden flex items-center justify-center max-h-[460px]">
                        <img
                          src={preview}
                          alt="Ticket screenshot preview"
                          className="max-h-[440px] w-full rounded object-contain"
                        />
                      </div>
                    )}
                    <div className="mt-3 flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
                      <span className="truncate max-w-[220px] font-mono">{image.name}</span>
                      <span>{(image.size / (1024 * 1024)).toFixed(2)} MB</span>
                    </div>
                  </>
                ) : (
                  <textarea
                    aria-label="Ticket description"
                    value={description}
                    onChange={(e) => handleDescriptionChange(e.target.value)}
                    rows={10}
                    maxLength={10000}
                    className="mt-3 w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-3 text-sm outline-none focus:border-zinc-400 focus:ring-1 focus:ring-zinc-300 resize-y"
                  />
                )}

                <button
                  type="button"
                  onClick={handleScan}
                  disabled={loading}
                  className="mt-4 w-full inline-flex items-center justify-center gap-2 h-10 px-4 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:hover:bg-zinc-200 dark:text-zinc-900 text-sm font-medium transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                      </svg>
                      <span>Analyzing ticket with Gemini...</span>
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
                      </svg>
                      <span>{result ? "Re-generate PR Details" : "Generate PR Details"}</span>
                    </>
                  )}
                </button>

                {error && (
                  <div className="mt-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/40 p-3 text-xs text-red-800 dark:text-red-300">
                    <p className="font-semibold uppercase tracking-wider text-[10px]">Error</p>
                    <p className="mt-0.5">{error}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Output / Review & Git Commands */}
            <div className="lg:col-span-7 space-y-4">
              {loading && (
                <div className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-8 text-center space-y-4 shadow-xs">
                  <div className="w-10 h-10 mx-auto rounded-full bg-blue-50 dark:bg-blue-950/60 flex items-center justify-center text-blue-600 dark:text-blue-400">
                    <svg className="w-5 h-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm">Reading Ticket</h3>
                    <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                      Gemini is generating branch name, commit message, and PR template...
                    </p>
                  </div>
                  <div className="space-y-2 pt-2">
                    <div className="h-10 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-16 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                    <div className="h-28 bg-zinc-100 dark:bg-zinc-800 rounded animate-pulse" />
                  </div>
                </div>
              )}

              {!loading && !result && (
                <div className="rounded-xl border border-dashed border-zinc-300 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 p-12 text-center">
                  <div className="w-10 h-10 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-500 mb-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="4 17 10 11 4 5" />
                      <line x1="12" y1="19" x2="20" y2="19" />
                    </svg>
                  </div>
                  <h3 className="text-sm font-semibold">Ready to Generate</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 max-w-sm mx-auto mt-1">
                    Click &quot;Generate PR Details&quot; on the left to analyze this ticket and produce your Git branch, commit, and PR template.
                  </p>
                </div>
              )}

              {result && (
                <div className="space-y-4 animate-in fade-in duration-300">
                  {/* Top Bar */}
                  <div className="flex items-center justify-between pb-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        Ready
                      </span>
                      <h2 className="text-sm font-semibold">Review & Copy</h2>
                    </div>

                    <button
                      type="button"
                      onClick={copyAll}
                      className="inline-flex items-center gap-1.5 h-7 px-2.5 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-700 text-xs font-medium transition shadow-2xs"
                    >
                      {copiedKey === "all" ? (
                        <>
                          <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                            <polyline points="20 6 9 17 4 12" />
                          </svg>
                          <span>Copied All</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                          </svg>
                          <span>Copy All</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Terminal Git Commands */}
                  <div className="rounded-xl border border-zinc-800 bg-zinc-950 text-zinc-100 shadow-xs p-3.5">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 rounded-full bg-red-500/80" />
                          <span className="w-2 h-2 rounded-full bg-yellow-500/80" />
                          <span className="w-2 h-2 rounded-full bg-emerald-500/80" />
                        </div>
                        <span className="text-[11px] font-mono text-zinc-400">Git Terminal Commands</span>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            [
                              `git checkout -b ${result.branchName}`,
                              `git add .`,
                              `git commit -m "${result.commitMessage.replace(/"/g, '\\"')}"`,
                              `git push -u origin ${result.branchName}`,
                            ].join("\n"),
                            "git-commands"
                          )
                        }
                        className={`inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium transition border shadow-2xs ${
                          copiedKey === "git-commands"
                            ? "bg-emerald-950/80 border-emerald-500 text-emerald-300"
                            : "border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-zinc-200"
                        }`}
                      >
                        {copiedKey === "git-commands" ? (
                          <>
                            <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                              <polyline points="20 6 9 17 4 12" />
                            </svg>
                            <span>Copied</span>
                          </>
                        ) : (
                          <>
                            <svg className="w-3 h-3 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                            <span>Copy Commands</span>
                          </>
                        )}
                      </button>
                    </div>

                    <pre className="font-mono text-xs text-emerald-400/95 bg-black/60 p-2.5 rounded-md overflow-x-auto leading-relaxed border border-zinc-800/80">
                      <code>
                        <span className="text-zinc-500">$ </span>git checkout -b {result.branchName}{"\n"}
                        <span className="text-zinc-500">$ </span>git add .{"\n"}
                        <span className="text-zinc-500">$ </span>git commit -m &quot;{result.commitMessage}&quot;{"\n"}
                        <span className="text-zinc-500">$ </span>git push -u origin {result.branchName}
                      </code>
                    </pre>
                  </div>

                  {/* Field Cards */}
                  <div className="grid gap-3">
                    {FIELDS.map((field) => {
                      const isCopied = copiedKey === field.key;
                      return (
                        <div
                          key={field.key}
                          className="rounded-xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-xs p-3.5 transition-all hover:border-zinc-300 dark:hover:border-zinc-700"
                        >
                          <div className="flex items-center justify-between gap-3 mb-1.5">
                            <div>
                              <label
                                htmlFor={field.key}
                                className="text-[11px] font-semibold text-zinc-800 dark:text-zinc-200 uppercase tracking-wide"
                              >
                                {field.label}
                              </label>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                                {field.description}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => copyText(result[field.key], field.key)}
                              className={`inline-flex items-center gap-1.5 h-6 px-2 rounded text-[11px] font-medium transition border shadow-2xs ${
                                isCopied
                                  ? "bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 text-emerald-700 dark:text-emerald-300"
                                  : "border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300"
                              }`}
                            >
                              {isCopied ? (
                                <>
                                  <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                  <span>Copied</span>
                                </>
                              ) : (
                                <>
                                  <svg className="w-3 h-3 text-zinc-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                                  </svg>
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          <textarea
                            id={field.key}
                            value={result[field.key]}
                            onChange={(e) => updateField(field.key, e.target.value)}
                            rows={field.rows || 2}
                            className={`w-full rounded-lg border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-950/50 p-2 text-xs text-zinc-900 dark:text-zinc-100 outline-none transition focus:border-zinc-400 dark:focus:border-zinc-600 focus:bg-white dark:focus:bg-zinc-900 focus:ring-1 focus:ring-zinc-300 dark:focus:ring-zinc-700 resize-y leading-relaxed ${
                              field.mono ? "font-mono" : ""
                            }`}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-200 dark:border-zinc-800 py-4 text-center text-xs text-zinc-500 dark:text-zinc-400">
        AI Ticket-to-PR · Powered by Google Gemini
      </footer>
    </div>
  );
}
