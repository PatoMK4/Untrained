import { ScreenHeader } from '@/components/layout/ScreenHeader'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useAuthStore } from '@/stores/authStore'

export function ProfilePlaceholder() {
  const { user, signOut } = useAuthStore()

  return (
    <div className="flex flex-col gap-4">
      <ScreenHeader title="PROFILE" subtitle="Settings &amp; preferences." />

      <Card accent>
        <p className="text-text-secondary text-xs tracking-widest mb-1">SIGNED IN AS</p>
        <p className="text-text-primary font-bold truncate">{user?.email ?? '—'}</p>
      </Card>

      <Card>
        <p className="text-text-secondary text-sm mb-1">Goal</p>
        <p className="text-text-disabled text-xs">Set during onboarding.</p>
      </Card>

      <Card>
        <p className="text-text-secondary text-sm mb-1">Equipment &amp; environment</p>
        <p className="text-text-disabled text-xs">Set during onboarding.</p>
      </Card>

      <Card>
        <p className="text-text-secondary text-sm mb-1">Achievements</p>
        <p className="text-text-disabled text-xs">Unlock as you train.</p>
      </Card>

      <div className="mt-4">
        <Button variant="ghost" fullWidth onClick={() => void signOut()}>
          SIGN OUT
        </Button>
      </div>
    </div>
  )
}
