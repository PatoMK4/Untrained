import { useState } from 'react'
import { Wordmark } from '@/components/ui/Wordmark'
import { Card } from '@/components/ui/Card'
import { PillButton } from '@/components/ui/PillButton'

export function TodayPlaceholder() {
  const [time, setTime] = useState<30 | 45 | 60>(45)

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'GOOD MORNING.' : hour < 17 ? 'GOOD AFTERNOON.' : 'GOOD EVENING.'

  return (
    <div className="flex flex-col gap-4 pt-6">
      <Wordmark />
      <h1 className="text-4xl font-black mt-2">{greeting}</h1>

      <Card accent>
        <p className="text-text-secondary text-sm">Your session is being prepared.</p>
      </Card>

      <Card>
        <p className="text-text-secondary text-sm mb-3">Time available today?</p>
        <div className="flex gap-2">
          {([30, 45, 60] as const).map((t) => (
            <PillButton
              key={t}
              label={t === 60 ? '60 MIN+' : `${t} MIN`}
              selected={time === t}
              onClick={() => setTime(t)}
            />
          ))}
        </div>
      </Card>

      <Card className="border-t-2 border-accent mt-auto">
        <p className="text-text-secondary text-sm">Chat with your PT →</p>
      </Card>
    </div>
  )
}
