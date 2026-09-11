import { useStore } from '@nanostores/react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Codicon } from '@/components/ui/codicon'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { useI18n } from '@/i18n'
import { displayPath } from '@/lib/display-path'
import { copyFilePath, revealFile } from '@/store/file-actions'
import { revealFileInTree } from '@/store/layout'
import { notifyError } from '@/store/notifications'
import { $projectTree, goToProject, openFolderAsProject, openProjectCreate, projectRootCwd } from '@/store/projects'

interface ComposerProjectSelectorProps {
  cwd?: string
  label?: string | null
}

export function ComposerProjectSelector({ cwd, label }: ComposerProjectSelectorProps) {
  const { t } = useI18n()
  const fileMenu = t.fileMenu

  const projects = useStore($projectTree).filter(project => !project.isNoProject && projectRootCwd(project))

  const [opening, setOpening] = useState(false)

  const openFolder = async () => {
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          aria-label={label || t.statusStack.coding.selectProject}
          className="min-w-0 max-w-full"
          disabled={opening}
          size="inline"
          variant="ghost"
        >
          <span className="max-w-56 truncate text-xs font-normal">{label || t.statusStack.coding.selectProject}</span>
          <Codicon name="chevron-down" size="0.75rem" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="max-w-72" side="top">
        {cwd && (
          <>
            <DropdownMenuLabel className="whitespace-normal break-all font-mono font-normal">
              {displayPath(cwd)}
            </DropdownMenuLabel>
            <DropdownMenuItem onSelect={() => void copyFilePath(cwd)}>
              <Codicon name="copy" size="0.875rem" />
              {fileMenu.copyPath}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => void revealFile(cwd)}>
              <Codicon name="folder-opened" size="0.875rem" />
              {fileMenu.revealFileManager}
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => revealFileInTree(cwd)}>
              <Codicon name="files" size="0.875rem" />
              {fileMenu.revealInSidebar}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuLabel>{t.statusStack.coding.startProjectChat}</DropdownMenuLabel>
        <div className="max-h-48 overflow-y-auto">
          {projects.map(project => (
            <DropdownMenuItem
              aria-label={project.label}
              key={project.id}
              onSelect={() => goToProject(project.id, { newSession: true })}
            >
              <Codicon name="folder" size="0.875rem" />
              <span className="truncate">{project.label}</span>
            </DropdownMenuItem>
          ))}
        </div>
        {projects.length > 0 && <DropdownMenuSeparator />}
        <DropdownMenuItem onSelect={openProjectCreate}>
          <Codicon name="add" size="0.875rem" />
          {t.sidebar.projects.newButton}
        </DropdownMenuItem>
        <DropdownMenuItem disabled={opening} onSelect={() => void openFolder()}>
          <Codicon name="folder-opened" size="0.875rem" />
          {t.commandCenter.openFolder}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
