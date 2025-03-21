
import { useEditor, EditorContent, BubbleMenu } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Color from '@tiptap/extension-color';
import Highlight from '@tiptap/extension-highlight';
import { 
  Bold, 
  Italic, 
  Underline as UnderlineIcon, 
  List, 
  ListOrdered,
  Highlighter,
  Palette
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useState } from 'react';

interface RichTextEditorProps {
  content: string;
  onChange: (html: string) => void;
  className?: string;
  placeholder?: string;
}

const COLORS = [
  { name: 'Default', value: 'inherit' },
  { name: 'Purple', value: '#8B5CF6' },
  { name: 'Blue', value: '#0EA5E9' },
  { name: 'Green', value: '#10B981' },
  { name: 'Yellow', value: '#F59E0B' },
  { name: 'Red', value: '#EF4444' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
];

const HIGHLIGHTS = [
  { name: 'None', value: 'transparent' },
  { name: 'Yellow', value: '#FEF9C3' },
  { name: 'Green', value: '#DCFCE7' },
  { name: 'Blue', value: '#DBEAFE' },
  { name: 'Pink', value: '#FCE7F3' },
  { name: 'Purple', value: '#F3E8FF' },
];

export const RichTextEditor = ({ content, onChange, className, placeholder }: RichTextEditorProps) => {
  const [showColorMenu, setShowColorMenu] = useState(false);
  const [showHighlightMenu, setShowHighlightMenu] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      Color,
      Highlight.configure({
        multicolor: true,
      }),
    ],
    content: content || '',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose max-w-none focus:outline-none min-h-[200px] px-3 py-2'
      },
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg relative overflow-hidden', className)}>
      <div className="flex flex-wrap bg-muted/40 border-b p-1 gap-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2', { 'bg-muted': editor.isActive('bold') })}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2', { 'bg-muted': editor.isActive('italic') })}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2', { 'bg-muted': editor.isActive('underline') })}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2', { 'bg-muted': editor.isActive('bulletList') })}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={cn('h-8 px-2', { 'bg-muted': editor.isActive('orderedList') })}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-8 px-2"
            onClick={() => {
              setShowColorMenu(!showColorMenu);
              setShowHighlightMenu(false);
            }}
          >
            <Palette className="h-4 w-4" />
          </Button>
          
          {showColorMenu && (
            <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-popover border rounded-md shadow-md flex flex-wrap gap-1 w-[180px]">
              {COLORS.map((color) => (
                <button
                  key={color.value}
                  type="button"
                  className="w-7 h-7 rounded-full border flex items-center justify-center"
                  style={{ 
                    backgroundColor: color.value === 'inherit' ? 'white' : color.value,
                    borderColor: color.value === 'inherit' ? '#e2e8f0' : color.value
                  }}
                  title={color.name}
                  onClick={() => {
                    editor.chain().focus().setColor(color.value).run();
                    setShowColorMenu(false);
                  }}
                >
                  {color.value === 'inherit' && 
                    <span className="text-xs text-gray-400">Aa</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="relative">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className={cn('h-8 px-2', { 'bg-muted': editor.isActive('highlight') })}
            onClick={() => {
              setShowHighlightMenu(!showHighlightMenu);
              setShowColorMenu(false);
            }}
          >
            <Highlighter className="h-4 w-4" />
          </Button>
          
          {showHighlightMenu && (
            <div className="absolute z-10 top-full left-0 mt-1 p-2 bg-popover border rounded-md shadow-md flex flex-wrap gap-1 w-[180px]">
              {HIGHLIGHTS.map((highlight) => (
                <button
                  key={highlight.value}
                  type="button"
                  className="w-7 h-7 rounded-full border flex items-center justify-center"
                  style={{ 
                    backgroundColor: highlight.value,
                    borderColor: highlight.value === 'transparent' ? '#e2e8f0' : highlight.value
                  }}
                  title={highlight.name}
                  onClick={() => {
                    if (highlight.value === 'transparent') {
                      editor.chain().focus().unsetHighlight().run();
                    } else {
                      editor.chain().focus().setHighlight({ color: highlight.value }).run();
                    }
                    setShowHighlightMenu(false);
                  }}
                >
                  {highlight.value === 'transparent' && 
                    <span className="text-xs text-gray-400">Aa</span>
                  }
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {editor.getHTML() === '' && placeholder && (
        <div className="absolute top-[3.5rem] left-3 text-muted-foreground pointer-events-none">
          {placeholder}
        </div>
      )}

      <EditorContent editor={editor} className="bg-background" />

      {editor && (
        <BubbleMenu editor={editor} tippyOptions={{ duration: 100 }}>
          <div className="flex rounded-md overflow-hidden shadow-lg border bg-popover">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2 rounded-none', { 'bg-accent': editor.isActive('bold') })}
              onClick={() => editor.chain().focus().toggleBold().run()}
            >
              <Bold className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2 rounded-none', { 'bg-accent': editor.isActive('italic') })}
              onClick={() => editor.chain().focus().toggleItalic().run()}
            >
              <Italic className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className={cn('h-8 px-2 rounded-none', { 'bg-accent': editor.isActive('underline') })}
              onClick={() => editor.chain().focus().toggleUnderline().run()}
            >
              <UnderlineIcon className="h-3.5 w-3.5" />
            </Button>
          </div>
        </BubbleMenu>
      )}
    </div>
  );
};
