import { normalizeNodeId } from 'platejs';
import { Plate, usePlateEditor } from 'platejs/react';

import { AlignKit } from '@ui/components/editor/plugins/align-kit';
import { FontKit } from '@ui/components/editor/plugins/font-kit';
import { AlignToolbarButton } from '@ui/components/ui/align-toolbar-button';
import { BasicNodesKit } from '@ui/components/editor/plugins/basic-nodes-kit';
import { SuggestionKit } from '@ui/components/editor/plugins/suggestion-kit';
import { CommentToolbarButton } from '@ui/components/ui/comment-toolbar-button';
import { Editor, EditorContainer } from '@ui/components/ui/editor';
import { FloatingToolbar } from '@ui/components/ui/floating-toolbar';
import { MarkToolbarButton } from '@ui/components/ui/mark-toolbar-button';
import { SuggestionToolbarButton } from '@ui/components/ui/suggestion-toolbar-button';
import { ToolbarButton, ToolbarGroup } from '@ui/components/ui/toolbar';
import {
  BoldIcon,
  ItalicIcon,
  Quote,
  StrikethroughIcon,
  PilcrowIcon,
  UnderlineIcon,
  CodeIcon,
  HighlighterIcon,
  BaselineIcon,
  Settings2Icon,
} from 'lucide-react';
import { FixedToolbar } from '../ui/fixed-toolbar';
import { TurnIntoToolbarButton } from '@ui/components/ui/turn-into-toolbar-button';
import { FontSizeToolbarButton } from '@ui/components/ui/font-size-toolbar-button';
import { FontColorToolbarButton } from '@ui/components/ui/font-color-toolbar-button';
import { EditorToolbarCustomButton } from '../editor-toolbar-custom-button/editor-toolbar-custom-button';

export function PlateEditor() {
  const editor = usePlateEditor({
    plugins: [...BasicNodesKit, ...SuggestionKit, ...AlignKit, ...FontKit],
    value: async () => {
      // fetching data from an API
      // const response = await fetch('/api/document');
      // const data = await response.json();
      // return data.content;
      return value;
    },
  });

  return (
    <div className="border rounded-sm border-gray-300">
      <Plate
        editor={editor}
        onChange={(value) => {
          console.log('value:', value);
        }}
      >
        {/* <FloatingToolbar> \
          <Tools editor={editor} />
        </FloatingToolbar> */}
        <FixedToolbar className="border-b border-gray-300 bg-gray-100 px-2">
          <ToolbarGroup>
            <FontSizeToolbarButton />
            <MarkToolbarButton nodeType="pilcrow" tooltip="Text (Ctrl+Alt+0)">
              <PilcrowIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="bold" tooltip="Bold (⌘+B)">
              <BoldIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="italic" tooltip="Italic (⌘+I)">
              <ItalicIcon />
            </MarkToolbarButton>
            <MarkToolbarButton nodeType="underline" tooltip="Underline (⌘+U)">
              <UnderlineIcon />
            </MarkToolbarButton>
            <MarkToolbarButton
              nodeType="strikethrough"
              tooltip="Strikethrough (⌘+Shift+X)"
            >
              <StrikethroughIcon />
            </MarkToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.blockquote.toggle()}
              tooltip="Blockquote (⌘+Shift+>)"
            >
              <Quote />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.code.toggle()}
              tooltip="Code Block (Ctrl+E)"
            >
              <CodeIcon />
            </ToolbarButton>
            <ToolbarButton
              onClick={() => editor.tf.highlight.toggle()}
              tooltip="Highlight (Ctrl+Shift+H)"
            >
              <HighlighterIcon />
            </ToolbarButton>
            <TurnIntoToolbarButton /> {/* Headings h1-h6 */}
            <AlignToolbarButton />
            <FontColorToolbarButton nodeType="color" tooltip="Font Color">
              <BaselineIcon />
            </FontColorToolbarButton>
            <CommentToolbarButton />
            <SuggestionToolbarButton />
          </ToolbarGroup>
          <ToolbarGroup>
            <EditorToolbarCustomButton
              icon={Settings2Icon}
              tooltip="Edit toolbar settings"
            />
          </ToolbarGroup>
        </FixedToolbar>

        <EditorContainer variant="default">
          <Editor variant="fullWidth" placeholder="Type..." />
        </EditorContainer>
      </Plate>
    </div>
  );
}

const value = normalizeNodeId([
  {
    children: [{ text: 'Basic Editor' }],
    type: 'h1',
  },
  {
    children: [{ text: 'Heading 2' }],
    type: 'h2',
  },
  {
    children: [{ text: 'Heading 3' }],
    type: 'h3',
  },
  {
    children: [{ text: 'This is a blockquote element' }],
    type: 'blockquote',
  },
  {
    children: [
      { text: 'Basic marks: ' },
      { bold: true, text: 'bold' },
      { text: ', ' },
      { italic: true, text: 'italic' },
      { text: ', ' },
      { text: 'underline', underline: true },
      { text: ', ' },
      { strikethrough: true, text: 'strikethrough' },
      {
        text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc,',
      },
      {
        text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc,',
      },
      {
        text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc,',
      },
      {
        text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc,',
      },
      {
        text: 'Lorem ipsum dolor sit amet, consectetuer adipiscing elit. Aenean commodo ligula eget dolor. Aenean massa. Cum sociis natoque penatibus et magnis dis parturient montes, nascetur ridiculus mus. Donec quam felis, ultricies nec, pellentesque eu, pretium quis, sem. Nulla consequat massa quis enim. Donec pede justo, fringilla vel, aliquet nec, vulputate eget, arcu. In enim justo, rhoncus ut, imperdiet a, venenatis vitae, justo. Nullam dictum felis eu pede mollis pretium. Integer tincidunt. Cras dapibus. Vivamus elementum semper nisi. Aenean vulputate eleifend tellus. Aenean leo ligula, porttitor eu, consequat vitae, eleifend ac, enim. Aliquam lorem ante, dapibus in, viverra quis, feugiat a, tellus. Phasellus viverra nulla ut metus varius laoreet. Quisque rutrum. Aenean imperdiet. Etiam ultricies nisi vel augue. Curabitur ullamcorper ultricies nisi. Nam eget dui. Etiam rhoncus. Maecenas tempus, tellus eget condimentum rhoncus, sem quam semper libero, sit amet adipiscing sem neque sed ipsum. Nam quam nunc, blandit vel, luctus pulvinar, hendrerit id, lorem. Maecenas nec odio et ante tincidunt tempus. Donec vitae sapien ut libero venenatis faucibus. Nullam quis ante. Etiam sit amet orci eget eros faucibus tincidunt. Duis leo. Sed fringilla mauris sit amet nibh. Donec sodales sagittis magna. Sed consequat, leo eget bibendum sodales, augue velit cursus nunc,',
      },
    ],
    type: 'p',
  },
]);
