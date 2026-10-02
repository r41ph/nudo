import { memo, useId } from 'react';
import { Icon } from '@ui/components/icon/icon';
import { Button } from '@ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@ui/components/ui/dropdown-menu';
import { Input } from '@ui/components/ui/input';
import { Label } from '@ui/components/ui/label';
import { Textarea } from '@ui/components/ui/textarea';
import {
  INSPECTOR_AUTOFOCUS_ATTR,
  POV_MAX,
} from '@web/features/document/constants/inspector.constants';
import type { DocumentDetails } from '@web/features/document/document.types';
import { DetailsSaveStatus } from '@web/features/document/components/details-save-status';
import { useDocumentDetailsSave } from '@web/features/document/hooks/use-document-details-save';
import { usePovSuggestions } from '@web/features/document/hooks/use-pov-suggestions';
import {
  EmptyStatusDot,
  STATUS_LABELS,
  StatusDot,
  StatusMenuItems,
} from '@web/shared/components/status-menu';

const FIELD = 'flex flex-col gap-2';
const LABEL = 'text-[12px] font-semibold text-prose';
// `md:` repeated because the primitives set their own `md:text-sm`.
const CONTROL = 'text-[13px] md:text-[13px] text-foreground';

export const DocumentInspectorDetails = memo(function DocumentInspectorDetails({
  details,
}: {
  details: DocumentDetails;
}) {
  const save = useDocumentDetailsSave(details);
  const suggestions = usePovSuggestions();
  const id = useId();
  const ids = {
    title: `${id}-title`,
    summary: `${id}-summary`,
    pov: `${id}-pov`,
    povList: `${id}-pov-options`,
  };

  return (
    <div className="flex flex-col gap-5">
      <div className={FIELD}>
        <Label htmlFor={ids.title} className={LABEL}>
          Title
        </Label>
        <Input
          id={ids.title}
          {...{ [INSPECTOR_AUTOFOCUS_ATTR]: '' }}
          value={save.title}
          onChange={(e) => save.setTitle(e.target.value)}
          onBlur={save.commitTitle}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save.commitTitle();
          }}
          className={CONTROL}
        />
      </div>

      <div className={FIELD}>
        {/* A menu trigger can't be the target of <label for>, so the name
            comes from aria-label and this text is only visual. */}
        <span className={LABEL} aria-hidden>
          Status
        </span>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              aria-label={
                save.status
                  ? `Status: ${STATUS_LABELS[save.status]}`
                  : 'Set status'
              }
              className={`h-9 w-full justify-start gap-2.5 px-3 font-normal hover:cursor-pointer ${CONTROL}`}
            >
              {save.status ? (
                <StatusDot status={save.status} />
              ) : (
                <EmptyStatusDot />
              )}
              <span className={save.status ? '' : 'text-muted-foreground'}>
                {save.status ? STATUS_LABELS[save.status] : 'No status'}
              </span>
              <Icon
                name="chevronDown"
                decorative
                className="ml-auto size-3.5 text-faint"
              />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="w-(--radix-dropdown-menu-trigger-width)"
          >
            <StatusMenuItems status={save.status} onChange={save.setStatus} />
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className={FIELD}>
        <Label htmlFor={ids.summary} className={LABEL}>
          Summary
        </Label>
        <Textarea
          id={ids.summary}
          value={save.summary}
          placeholder="What happens in this scene?"
          onChange={(e) => save.setSummary(e.target.value)}
          className={`min-h-24 leading-5 ${CONTROL}`}
        />
      </div>

      {details.kind === 'document' && (
        <div className={FIELD}>
          <Label htmlFor={ids.pov} className={LABEL}>
            POV
          </Label>
          <Input
            id={ids.pov}
            list={ids.povList}
            value={save.pov}
            maxLength={POV_MAX}
            placeholder="Whose eyes?"
            autoComplete="off"
            onChange={(e) => save.setPov(e.target.value)}
            className={CONTROL}
          />
          <datalist id={ids.povList}>
            {suggestions.map((name) => (
              <option key={name} value={name} />
            ))}
          </datalist>
        </div>
      )}

      <DetailsSaveStatus state={save.saveState} onRetry={save.retry} />
    </div>
  );
});
