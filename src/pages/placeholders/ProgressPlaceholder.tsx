import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Card } from '@/components/ui/Card'

export function ProgressPlaceholder() {
  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="PROGRESS" subtitle="Your stats will appear here." />

      <Card accent>
        <p className="text-text-secondary text-sm">Score &amp; streak</p>
        <div className="mt-3 flex gap-6">
          <div>
            <p className="text-3xl font-black text-text-primary">—</p>
            <p className="text-xs text-text-disabled tracking-widest mt-1">TOTAL SCORE</p>
          </div>
          <div>
            <p className="text-3xl font-black text-text-primary">—</p>
            <p className="text-xs text-text-disabled tracking-widest mt-1">STREAK</p>
          </div>
        </div>
      </Card>

      <Card>
        <p className="text-text-secondary text-sm mb-1">Progression</p>
        <p className="text-text-disabled text-xs">Levels unlock as you train.</p>
      </Card>

      <Card>
        <p className="text-text-secondary text-sm mb-1">Session history</p>
        <p className="text-text-disabled text-xs">Completed sessions will appear here.</p>
      </Card>
    </div>
  )
}
