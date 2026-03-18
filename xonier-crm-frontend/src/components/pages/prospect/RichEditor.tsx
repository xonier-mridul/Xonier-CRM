"use client";
import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { useState } from "react";
import { useEditor, EditorContent, Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Color from "@tiptap/extension-color";
import {TextStyle} from "@tiptap/extension-text-style";
import Link from "@tiptap/extension-link";
import CharacterCount from "@tiptap/extension-character-count";

// ─── Public API (via ref) ─────────────────────────────────────────────────────
export interface RichTextEditorHandle {
  /** Insert text/html at the current cursor position */
  insertAtCursor: (content: string) => void;
  /** Get the current HTML value */
  getHTML: () => string;
  /** Replace the entire editor content */
  setContent: (html: string) => void;
  /** Focus the editor */
  focus: () => void;
  /** Expose raw Tiptap editor instance if needed */
  editor: Editor | null;
}

// ─── Props ────────────────────────────────────────────────────────────────────
export interface RichTextEditorProps {
  /** Controlled HTML value */
  value?: string;
  /** Called on every content change with the new HTML string */
  onChange?: (html: string) => void;
  /** Placeholder text shown when editor is empty */
  placeholder?: string;
  /** Marks the editor border as errored */
  hasError?: boolean;
  /** Extra Tailwind classes applied to the outer wrapper */
  className?: string;
  /** Minimum height of the editable area (default: 280px) */
  minHeight?: number;
  /** Whether the editor is read-only */
  readOnly?: boolean;
  /** Hide the character count in the footer */
  hideCharCount?: boolean;
  /** Hide the footer bar entirely */
  hideFooter?: boolean;
}

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Toolbar Button
// ═══════════════════════════════════════════════════════════════════════════════
const TBtn = ({
  onClick, active, title, children, disabled,
}: {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) => (
  <button
    type="button"
    title={title}
    onClick={onClick}
    disabled={disabled}
    className={[
      "w-7 h-7 flex items-center justify-center rounded-lg text-[13px]",
      "transition-all duration-100 cursor-pointer select-none",
      "disabled:opacity-30 disabled:cursor-not-allowed",
      active
        ? "bg-violet-600 text-white shadow-sm"
        : "text-slate-500 hover:bg-violet-50 hover:text-violet-700 dark:text-slate-400 dark:hover:bg-gray-700 dark:hover:text-white",
    ].join(" ")}
  >
    {children}
  </button>
);

const TDivider = () => (
  <div className="w-px h-4 bg-slate-200 dark:bg-gray-600 mx-1 self-center shrink-0" />
);

// ═══════════════════════════════════════════════════════════════════════════════
// INTERNAL: Toolbar
// ═══════════════════════════════════════════════════════════════════════════════
const RichToolbar = ({ editor }: { editor: Editor | null }) => {
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkUrl, setLinkUrl]   = useState("");

  if (!editor) return null;

  const applyLink = () => {
    if (linkUrl) editor.chain().focus().extendMarkRange("link").setLink({ href: linkUrl }).run();
    else         editor.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setLinkUrl("");
  };

  const headingValue =
    editor.isActive("heading", { level: 1 }) ? "1" :
    editor.isActive("heading", { level: 2 }) ? "2" :
    editor.isActive("heading", { level: 3 }) ? "3" : "0";

  return (
    <div className="border-b border-slate-200 dark:border-gray-600 rounded-t-xl overflow-hidden bg-slate-50 dark:bg-gray-750">

      {/* ── Main toolbar row ─────────────────────────────────────── */}
      <div className="flex flex-wrap items-center gap-0.5 px-2.5 py-1.5">

        {/* Heading selector */}
        <select
          value={headingValue}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "0") editor.chain().focus().setParagraph().run();
            else editor.chain().focus().toggleHeading({ level: parseInt(v) as 1 | 2 | 3 }).run();
          }}
          className="h-7 text-xs font-semibold rounded-lg border border-slate-200 dark:border-gray-600
            bg-white dark:bg-gray-800 text-slate-700 dark:text-slate-300 px-2 pr-6
            focus:outline-none focus:ring-1 focus:ring-violet-400 cursor-pointer"
          style={{
            backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%2394a3b8'/%3E%3C/svg%3E\")",
            backgroundRepeat: "no-repeat",
            backgroundPosition: "right 6px center",
            appearance: "none",
          }}
        >
          <option value="0">Paragraph</option>
          <option value="1">Heading 1</option>
          <option value="2">Heading 2</option>
          <option value="3">Heading 3</option>
        </select>

        <TDivider />

        {/* Text formatting */}
        <TBtn onClick={() => editor.chain().focus().toggleBold().run()}       active={editor.isActive("bold")}      title="Bold (Ctrl+B)">        <b>B</b>   </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleItalic().run()}     active={editor.isActive("italic")}    title="Italic (Ctrl+I)">       <i>I</i>   </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleUnderline().run()}  active={editor.isActive("underline")} title="Underline (Ctrl+U)">    <u>U</u>   </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleStrike().run()}     active={editor.isActive("strike")}    title="Strikethrough">         <s>S</s>   </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleCode().run()}       active={editor.isActive("code")}      title="Inline Code">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
          </svg>
        </TBtn>

        <TDivider />

        {/* Alignment */}
        <TBtn onClick={() => editor.chain().focus().setTextAlign("left").run()}   active={editor.isActive({ textAlign: "left" })}   title="Align Left">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5"  width="18" height="2"/><rect x="3" y="10" width="12" height="2"/>
            <rect x="3" y="15" width="18" height="2"/><rect x="3" y="20" width="12" height="2"/>
          </svg>
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign("center").run()} active={editor.isActive({ textAlign: "center" })} title="Center">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5"  width="18" height="2"/><rect x="6" y="10" width="12" height="2"/>
            <rect x="3" y="15" width="18" height="2"/><rect x="6" y="20" width="12" height="2"/>
          </svg>
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setTextAlign("right").run()}  active={editor.isActive({ textAlign: "right" })}  title="Align Right">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <rect x="3" y="5"  width="18" height="2"/><rect x="9" y="10" width="12" height="2"/>
            <rect x="3" y="15" width="18" height="2"/><rect x="9" y="20" width="12" height="2"/>
          </svg>
        </TBtn>

        <TDivider />

        {/* Lists + extras */}
        <TBtn onClick={() => editor.chain().focus().toggleBulletList().run()}  active={editor.isActive("bulletList")}  title="Bullet List">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <circle cx="4" cy="7"  r="1.5"/><rect x="8" y="6"  width="13" height="2"/>
            <circle cx="4" cy="12" r="1.5"/><rect x="8" y="11" width="13" height="2"/>
            <circle cx="4" cy="17" r="1.5"/><rect x="8" y="16" width="13" height="2"/>
          </svg>
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleOrderedList().run()} active={editor.isActive("orderedList")} title="Numbered List">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <text x="2" y="9"  fontSize="7" fontWeight="bold">1.</text><rect x="9" y="6"  width="12" height="2"/>
            <text x="2" y="14" fontSize="7" fontWeight="bold">2.</text><rect x="9" y="11" width="12" height="2"/>
            <text x="2" y="19" fontSize="7" fontWeight="bold">3.</text><rect x="9" y="16" width="12" height="2"/>
          </svg>
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().toggleBlockquote().run()} active={editor.isActive("blockquote")} title="Blockquote">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M4.583 17.321C3.553 16.227 3 15 3 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-2.748-1.179zm10 0C13.553 16.227 13 15 13 13.011c0-3.5 2.457-6.637 6.03-8.188l.893 1.378c-3.335 1.804-3.987 4.145-4.247 5.621.537-.278 1.24-.375 1.929-.311 1.804.167 3.226 1.648 3.226 3.489a3.5 3.5 0 01-3.5 3.5 3.5 3.5 0 01-2.748-1.179z"/>
          </svg>
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} active={false} title="Horizontal Rule">
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="11" width="20" height="2" rx="1"/></svg>
        </TBtn>

        <TDivider />

        {/* Link */}
        <TBtn
          onClick={() => { setLinkOpen((v) => !v); setLinkUrl(editor.getAttributes("link").href || ""); }}
          active={editor.isActive("link") || linkOpen}
          title="Insert Link"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
        </TBtn>
        {editor.isActive("link") && (
          <TBtn onClick={() => editor.chain().focus().unsetLink().run()} active={false} title="Remove Link">
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"/>
            </svg>
          </TBtn>
        )}

        <TDivider />

        {/* Text color */}
        <label
          className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:bg-violet-50 dark:hover:bg-gray-700 transition-colors relative"
          title="Text Color"
        >
          <svg className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 pointer-events-none" viewBox="0 0 24 24" fill="currentColor">
            <text x="4" y="17" fontSize="14" fontWeight="bold">A</text>
            <rect x="4" y="19" width="16" height="2.5" rx="1"/>
          </svg>
          <input
            type="color"
            className="absolute opacity-0 w-full h-full cursor-pointer"
            onInput={(e) => editor.chain().focus().setColor((e.target as HTMLInputElement).value).run()}
          />
        </label>

        <TDivider />

        {/* Undo / Redo */}
        <TBtn onClick={() => editor.chain().focus().undo().run()} disabled={!editor.can().undo()} title="Undo (Ctrl+Z)">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"/>
          </svg>
        </TBtn>
        <TBtn onClick={() => editor.chain().focus().redo().run()} disabled={!editor.can().redo()} title="Redo (Ctrl+Y)">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6"/>
          </svg>
        </TBtn>

        <TDivider />

        {/* Clear formatting */}
        <TBtn onClick={() => editor.chain().focus().clearNodes().unsetAllMarks().run()} title="Clear Formatting">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/>
          </svg>
        </TBtn>

        {/* Char count – pushed to the far right */}
        <span className="ml-auto text-[10px] tabular-nums font-mono text-slate-300 dark:text-slate-600 select-none whitespace-nowrap pl-2">
          {editor.storage.characterCount.characters()} chars
        </span>
      </div>

      {/* ── Link input row (conditional) ─────────────────────────── */}
      {linkOpen && (
        <div className="flex items-center gap-2 px-3 py-2 border-t border-slate-200 dark:border-gray-600 bg-white dark:bg-gray-800">
          <svg className="w-4 h-4 text-violet-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"/>
          </svg>
          <input
            autoFocus
            type="url"
            placeholder="https://example.com"
            value={linkUrl}
            onChange={(e) => setLinkUrl(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter")  { e.preventDefault(); applyLink(); }
              if (e.key === "Escape") { setLinkOpen(false); }
            }}
            className="flex-1 text-sm bg-transparent text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={applyLink}
            className="px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 text-white text-xs font-bold cursor-pointer transition-colors"
          >
            Apply
          </button>
          <button
            type="button"
            onClick={() => setLinkOpen(false)}
            className="px-3 py-1 rounded-lg border border-slate-200 dark:border-gray-600 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-500 dark:text-slate-400 text-xs font-semibold cursor-pointer transition-colors"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};
const RichTextEditor = forwardRef<RichTextEditorHandle, RichTextEditorProps>(
  (
    {
      value = "",
      onChange,
      placeholder = "Start typing…",
      hasError = false,
      className = "",
      minHeight = 280,
      readOnly = false,
      hideCharCount = false,
      hideFooter = false,
    },
    ref
  ) => {
  const editor = useEditor({
  extensions: [
    StarterKit,
    Placeholder.configure({
      placeholder: "Write your email here...",
    }),
    Underline,
    TextAlign.configure({
      types: ["heading", "paragraph"],
    }),
    TextStyle,
    Color,
    Link,
    CharacterCount,
  ],
  editable: !readOnly,
  content: value,
  immediatelyRender: false, 
  onUpdate: ({ editor }) => {
    onChange?.(editor.getHTML());
  },
});

    // Expose imperative API to parent via ref
    useImperativeHandle(ref, () => ({
      insertAtCursor: (content: string) => {
        editor?.chain().focus().insertContent(content).run();
      },
      getHTML: () => editor?.getHTML() ?? "",
      setContent: (html: string) => {
        editor?.commands.setContent(html, { emitUpdate: false });
      },
      focus: () => {
        editor?.commands.focus();
      },
      editor: editor ?? null,
    }));

    // Sync external value changes (e.g. AI-generated content replacing the body)
    const lastExternalValue = useRef(value);
    useEffect(() => {
      if (
        editor &&
        value !== lastExternalValue.current &&
        value !== editor.getHTML()
      ) {
        editor.commands.setContent(value, { emitUpdate: false });
        lastExternalValue.current = value;
      }
    }, [value, editor]);

    return (
      <>
        {/* ── Scoped styles for Tiptap content ───────────────────── */}
        <style>{`
          .rte-content { outline: none; }
          .rte-content p.is-editor-empty:first-child::before {
            content: attr(data-placeholder);
            float: left; color: #94a3b8;
            pointer-events: none; height: 0;
          }
          .rte-content h1 { font-size:1.5rem;  font-weight:700; margin:.5rem 0;  color:#1e293b; }
          .rte-content h2 { font-size:1.25rem; font-weight:700; margin:.4rem 0;  color:#1e293b; }
          .rte-content h3 { font-size:1.1rem;  font-weight:600; margin:.3rem 0;  color:#1e293b; }
          .rte-content p  { margin:.25rem 0; color:#334155; }
          .rte-content ul { list-style:disc;    padding-left:1.4rem; margin:.4rem 0; }
          .rte-content ol { list-style:decimal; padding-left:1.4rem; margin:.4rem 0; }
          .rte-content li { margin:.15rem 0; color:#334155; }
          .rte-content blockquote {
            border-left:3px solid #a78bfa; padding-left:1rem;
            color:#64748b; font-style:italic; margin:.5rem 0;
          }
          .rte-content code {
            background:#f5f3ff; color:#7c3aed;
            border:1px solid #ddd6fe; border-radius:4px;
            padding:0 4px; font-size:.8em; font-family:monospace;
          }
          .rte-content a      { color:#7c3aed; text-decoration:underline; cursor:pointer; }
          .rte-content strong { font-weight:700; }
          .rte-content em     { font-style:italic; }
          .rte-content s      { text-decoration:line-through; }
          .rte-content hr     { border:none; border-top:2px solid #e2e8f0; margin:1rem 0; }
          /* dark-mode overrides */
          .dark .rte-content h1,
          .dark .rte-content h2,
          .dark .rte-content h3 { color:#f1f5f9; }
          .dark .rte-content p,
          .dark .rte-content li { color:#cbd5e1; }
          .dark .rte-content code {
            background:#312e81; border-color:#4c1d95; color:#c4b5fd;
          }
        `}</style>

        <div
          className={[
            "rounded-xl border overflow-hidden bg-white dark:bg-gray-800 shadow-sm transition-all duration-150",
            hasError
              ? "border-red-400 ring-2 ring-red-200 dark:ring-red-900/50"
              : "border-slate-200 dark:border-gray-600 focus-within:ring-2 focus-within:ring-violet-400 focus-within:border-violet-400 hover:border-slate-300 dark:hover:border-gray-500",
            className,
          ].join(" ")}
        >
          {/* Toolbar — hidden in read-only mode */}
          {!readOnly && <RichToolbar editor={editor} />}

          {/* Editable area */}
          <div className="dark:bg-gray-800">
            <EditorContent editor={editor}  className=" min-h-50"/>
          </div>

          {/* Footer */}
          {!hideFooter && (
            <div className="flex items-center justify-between px-4 py-2 border-t border-slate-100 dark:border-gray-700 bg-slate-50 dark:bg-gray-750">
              <p className="text-[11px] text-slate-400 dark:text-slate-500 flex items-center gap-1.5 flex-wrap">
                {readOnly ? (
                  <span className="flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
                    Read-only
                  </span>
                ) : (
                  <>
                    Rich HTML output ·
                    <code
                      className="font-mono text-[10px] px-1.5 py-0.5 rounded-md border"
                      style={{ background: "#F5F3FF", borderColor: "#DDD6FE", color: "#7C3AED" }}
                    >
                      {"{{variable}}"}
                    </code>
                    placeholders supported
                  </>
                )}
              </p>
              {!hideCharCount && (
                <span className="text-[10px] text-slate-300 dark:text-slate-600 font-mono whitespace-nowrap ml-2">
                  {editor?.storage.characterCount.characters() ?? 0} chars
                </span>
              )}
            </div>
          )}
        </div>
      </>
    );
  }
);

RichTextEditor.displayName = "RichTextEditor";

export default RichTextEditor;