"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";

export default function RichEditor({ value, onChange }: any) {
  const editor = useEditor({
    extensions: [StarterKit],
    content: value,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) return null;

  const btn =
    "px-3 py-1 rounded-md text-sm font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-600";

  const active =
    "bg-blue-500 text-white border-blue-500 hover:bg-blue-600";

  return (
    <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">

      {/* Toolbar */}
      <div className="flex flex-wrap gap-2 p-2 border-b border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-800">

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`${btn} ${editor.isActive("bold") ? active : ""}`}
        >
          Bold
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`${btn} ${editor.isActive("italic") ? active : ""}`}
        >
          Italic
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`${btn} ${editor.isActive("strike") ? active : ""}`}
        >
          Strike
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`${btn} ${editor.isActive("heading", { level: 1 }) ? active : ""}`}
        >
          H1
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`${btn} ${editor.isActive("heading", { level: 2 }) ? active : ""}`}
        >
          H2
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`${btn} ${editor.isActive("bulletList") ? active : ""}`}
        >
          • List
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className={`${btn} ${editor.isActive("orderedList") ? active : ""}`}
        >
          1. List
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().undo().run()}
          className={btn}
        >
          Undo
        </button>

        <button
          type="button"
          onClick={() => editor.chain().focus().redo().run()}
          className={btn}
        >
          Redo
        </button>

      </div>

      {/* Editor */}
      <div className="p-3 min-h-37.5 dark:bg-gray-700">
        <EditorContent editor={editor} />
      </div>

    </div>
  );
}