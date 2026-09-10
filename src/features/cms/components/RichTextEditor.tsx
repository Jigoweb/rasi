"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import { Button } from "@/shared/components/ui/button";

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (html: string) => void;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false, HTMLAttributes: { rel: "noreferrer" } }),
    ],
    content: value || "<p></p>",
    immediatelyRender: false,
    editorProps: {
      attributes: {
        class: "prose max-w-none min-h-[240px] px-3 py-2 focus:outline-none",
      },
    },
    onUpdate: ({ editor: instance }) => onChange(instance.getHTML()),
  });

  if (!editor) return <div className="min-h-[240px] border rounded-md bg-white" />;

  return (
    <div className="border rounded-md bg-white">
      <div className="flex flex-wrap gap-1 border-b p-2">
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleBold().run()}>
          Grassetto
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleItalic().run()}>
          Corsivo
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>
          H2
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}>
          H3
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => editor.chain().focus().toggleBulletList().run()}>
          Elenco
        </Button>
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
