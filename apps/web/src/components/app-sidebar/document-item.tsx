import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { FileTextIcon, PenIcon, Trash2Icon } from 'lucide-react';
import {
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuAction,
} from '@ui/components/ui/sidebar';
import { Input } from '@ui/components/ui/input';
import { RENAME_DOCUMENT, DELETE_DOCUMENT } from '@web/graphql/mutations';
import { graphqlClient } from '@web/lib/graphql-client';
import { queryClient } from '@web/lib/query-client';

interface DocumentItemProps {
  doc: { id: string; title: string };
}

export function DocumentItem({ doc }: DocumentItemProps) {
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editingTitle, setEditingTitle] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['documents'] });
    queryClient.invalidateQueries({ queryKey: ['folders'] });
  };

  const { mutate: renameDocument } = useMutation({
    mutationFn: (variables: { id: string; title: string }) =>
      graphqlClient.request(RENAME_DOCUMENT, variables),
    onSuccess: invalidate,
  });

  const { mutate: deleteDocument } = useMutation({
    mutationFn: (variables: { id: string }) =>
      graphqlClient.request(DELETE_DOCUMENT, variables),
    onSuccess: invalidate,
  });

  const startEditing = () => {
    setIsEditing(true);
    setEditingTitle(doc.title);
  };

  const submitRename = () => {
    if (editingTitle.trim()) {
      renameDocument({ id: doc.id, title: editingTitle.trim() });
    }
    setIsEditing(false);
  };

  return (
    <SidebarMenuItem>
      {isEditing ? (
        <Input
          ref={inputRef}
          value={editingTitle}
          onChange={(e) => setEditingTitle(e.target.value)}
          onBlur={submitRename}
          onKeyDown={(e) => {
            if (e.key === 'Enter') submitRename();
            if (e.key === 'Escape') setIsEditing(false);
          }}
          className="h-7 text-sm"
        />
      ) : (
        <>
          <SidebarMenuButton onClick={() => navigate(`/document/${doc.id}`)}>
            <FileTextIcon className="h-4 w-4" />
            <span className="truncate">{doc.title}</span>
          </SidebarMenuButton>
          <SidebarMenuAction
            onClick={startEditing}
            showOnHover
            className="[&>svg]:size-3.5 right-8"
          >
            <PenIcon />
          </SidebarMenuAction>
          <SidebarMenuAction
            onClick={() => deleteDocument({ id: doc.id })}
            showOnHover
            className="[&>svg]:size-3.5"
          >
            <Trash2Icon />
          </SidebarMenuAction>
        </>
      )}
    </SidebarMenuItem>
  );
}
