"use client";

import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { DocTexto } from "@/modules/escritorio/bloques";

/**
 * Editor de texto de un bloque. Se usa un subconjunto mínimo de Tiptap: párrafos, saltos de línea, negrita,
 * cursiva, subrayado y tachado. Todo lo demás está desactivado, así el editor no puede producir nada que
 * el servidor rechace; y lo que se guarda es JSON (nunca HTML).
 */
export function TextoEnriquecido({
  doc,
  alCambiar,
  etiqueta,
  autoFocus,
}: {
  doc: DocTexto;
  alCambiar: (doc: DocTexto) => void;
  etiqueta: string;
  autoFocus?: boolean;
}) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false, blockquote: false, bulletList: false, orderedList: false, listItem: false, listKeymap: false,
        code: false, codeBlock: false, horizontalRule: false, link: false, dropcursor: false, gapcursor: false,
      }),
    ],
    content: doc,
    immediatelyRender: false,
    autofocus: autoFocus ? "end" : false,
    onUpdate: ({ editor: e }) => alCambiar(e.getJSON() as DocTexto),
    editorProps: {
      attributes: { class: "prosa", role: "textbox", "aria-multiline": "true", "aria-label": etiqueta },
    },
  });

  const activo = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      bold: e?.isActive("bold") ?? false,
      italic: e?.isActive("italic") ?? false,
      underline: e?.isActive("underline") ?? false,
      strike: e?.isActive("strike") ?? false,
    }),
  });

  const botones = [
    { clave: "bold", rotulo: "N", nombre: "Negrita", accion: () => editor?.chain().focus().toggleBold().run(), estilo: "font-bold" },
    { clave: "italic", rotulo: "C", nombre: "Cursiva", accion: () => editor?.chain().focus().toggleItalic().run(), estilo: "italic" },
    { clave: "underline", rotulo: "S", nombre: "Subrayado", accion: () => editor?.chain().focus().toggleUnderline().run(), estilo: "underline" },
    { clave: "strike", rotulo: "T", nombre: "Tachado", accion: () => editor?.chain().focus().toggleStrike().run(), estilo: "line-through" },
  ] as const;

  return (
    <div>
      <div role="toolbar" aria-label={`Formato de ${etiqueta}`} className="mb-1 flex gap-1.5">
        {botones.map((b) => (
          <button
            key={b.clave}
            type="button"
            className={`boton-hoja ${b.estilo}`}
            aria-pressed={activo?.[b.clave] ?? false}
            aria-label={b.nombre}
            title={b.nombre}
            disabled={!editor}
            onMouseDown={(e) => e.preventDefault()}
            onClick={b.accion}
          >
            {b.rotulo}
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
    </div>
  );
}
