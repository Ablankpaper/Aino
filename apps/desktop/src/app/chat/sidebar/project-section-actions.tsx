import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import { Tip } from '@/components/ui/tooltip'
import { useI18n } from '@/i18n'
import { notifyError } from '@/store/notifications'
import { $newProjectDropPlacement, openFolderAsProject, openProjectCreate } from '@/store/projects'

import { SidebarSectionAddButton } from './chrome'

export function ProjectSectionActions() {
  const { t } = useI18n()
  const [opening, setOpening] = useState(false)

  const openFolder = async () => {
    if (opening) {
      return
    }

    setOpening(true)

    try {
      await openFolderAsProject()
    } catch (error) {
      notifyError(error, t.sidebar.projects.createFailed)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className="flex shrink-0 items-center gap-0.5" data-project-section-actions="">
      <Tip label={t.commandCenter.openFolder}>
        <Button
          aria-label={t.commandCenter.openFolder}
          disabled={opening}
          onClick={() => void openFolder()}
          size="icon-xs"
          variant="ghost"
        >
          <Codicon name="folder-opened" size="0.875rem" />
        </Button>
      </Tip>
      <SidebarSectionAddButton
        ariaLabel={t.sidebar.projects.newButton}
        className="opacity-100"
        onNewProjectDrag={{ onArm: placement => $newProjectDropPlacement.set(placement) }}
        onPlainClick={openProjectCreate}
      />
    </div>
  )
}
