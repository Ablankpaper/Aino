import { useNavigate } from 'react-router'

import { useStatusbarContributions } from '@/app/contrib/panes'
import { type StatusbarItem, StatusbarItemView } from '@/app/shell/statusbar-controls'
import { useI18n } from '@/i18n'
import { Package } from '@/lib/icons'

import { SectionHeading } from './primitives'

/** Keep existing plugin diagnostics reachable without recreating bottom chrome. */
export function ContributedStatusSettings() {
  const left = useStatusbarContributions('left')
  const right = useStatusbarContributions('right')
  const items = [...left, ...right].filter(item => !item.hidden)

  return items.length ? <ExtensionRows items={items} /> : null
}

function ExtensionRows({ items }: { items: StatusbarItem[] }) {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <section className="mt-8">
      <SectionHeading icon={Package} title={t.settings.nav.plugins} />
      <div className="flex flex-wrap items-center gap-3">
        {items.map(item => (
          <div className="h-8 min-w-0 max-w-full" key={item.id}>
            <StatusbarItemView item={item} navigate={navigate} />
          </div>
        ))}
      </div>
    </section>
  )
}
