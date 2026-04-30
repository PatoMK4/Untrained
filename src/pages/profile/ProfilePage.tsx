import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wordmark } from '@/components/ui/Wordmark'
import { Button } from '@/components/ui/Button'
import { useUserProfile } from '@/hooks/useWorkout'
import { useUserSettings } from '@/hooks/useScore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useQueryClient } from '@tanstack/react-query'

const GOAL_LABELS: Record<string, string> = {
  strength: 'Strength', muscle: 'Muscle', endurance: 'Endurance',
  weight_loss: 'Weight Loss', overall: 'Overall Fitness',
}
const ENV_LABELS: Record<string, string> = {
  home: 'Home', gym: 'Gym', both: 'Home + Gym', outdoors: 'Outdoors',
}
const SPLIT_LABELS: Record<string, string> = {
  full_body: 'Full Body', ppl: 'Push / Pull / Legs',
  upper_lower: 'Upper / Lower', bro_split: 'Muscle Group Split',
}
const EQUIP_LABELS: Record<string, string> = {
  none: 'No equipment', pullup_bar: 'Pull-up bar',
  rings: 'Rings', gym: 'Full gym',
}

type EditField = 'goal' | 'training_days' | 'environment' | 'equipment' | 'split_preference' | 'limitations' | null

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { data: profile, isLoading } = useUserProfile()
  const { data: settings } = useUserSettings()
  const queryClient = useQueryClient()
  const [editField, setEditField] = useState<EditField>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const saveField = async (updates: Record<string, unknown>) => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profile')
        .update(updates)
        .eq('user_id', user.id)
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['user_profile', user.id] })
      setEditField(null)
      showToast('Program updated. Next session reflects your changes.')
    } catch (err) {
      console.error(err)
      showToast('Something went wrong. Try again.')
    } finally {
      setSaving(false)
    }
  }

  const saveSetting = async (updates: Record<string, unknown>) => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_settings')
        .upsert({ user_id: user.id, ...updates })
      if (error) throw error
      queryClient.invalidateQueries({ queryKey: ['user_settings', user.id] })
      showToast('Setting saved.')
    } catch (err) {
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })
    : ''

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <Wordmark />
        {[1,2,3].map(i => (
          <div key={i} className="h-16 bg-surface rounded-card animate-pulse" />
        ))}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6 pt-6 pb-8">
      <Wordmark />

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="fixed top-4 left-0 right-0 mx-4 z-50 bg-surface border border-accent rounded-card p-3 text-center"
          >
            <p className="text-accent text-sm font-bold">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity */}
      <div className="bg-surface rounded-card p-5 flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest mb-1">ACCOUNT</p>
        <p className="text-text-primary font-bold">{user?.email}</p>
        <p className="text-text-disabled text-sm">Member since {memberSince}</p>
      </div>

      {/* Program section */}
      <div className="flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest px-1">YOUR PROGRAM</p>

        {/* Goal */}
        <EditRow
          label="Goal"
          value={GOAL_LABELS[profile?.goal ?? ''] ?? profile?.goal ?? '—'}
          onTap={() => setEditField('goal')}
        />

        {/* Training days */}
        <EditRow
          label="Training days"
          value={`${profile?.training_days ?? '—'} days / week`}
          onTap={() => setEditField('training_days')}
        />

        {/* Environment */}
        <EditRow
          label="Environment"
          value={ENV_LABELS[profile?.environment ?? ''] ?? profile?.environment ?? '—'}
          onTap={() => setEditField('environment')}
        />

        {/* Equipment */}
        <EditRow
          label="Equipment"
          value={(profile?.equipment ?? []).map((e: string) => EQUIP_LABELS[e] ?? e).join(', ') || 'None'}
          onTap={() => setEditField('equipment')}
        />

        {/* Split */}
        <EditRow
          label="Training split"
          value={SPLIT_LABELS[profile?.split_preference ?? ''] ?? profile?.split_preference ?? '—'}
          onTap={() => setEditField('split_preference')}
        />

        {/* Limitations */}
        <EditRow
          label="Limitations"
          value={profile?.limitations || 'None'}
          onTap={() => setEditField('limitations')}
        />
      </div>

      {/* App settings */}
      <div className="flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest px-1">APP SETTINGS</p>

        {/* AI mode */}
        <div className="bg-surface rounded-card p-4 flex items-center justify-between">
          <div>
            <p className="text-text-primary font-bold text-sm">AI Mode</p>
            <p className="text-text-disabled text-xs">Smart uses more context, Lite is faster</p>
          </div>
          <div className="flex gap-1 bg-surface-raised rounded-pill p-1">
            {(['smart', 'lite'] as const).map(mode => (
              <button
                key={mode}
                onClick={() => saveSetting({ ai_mode: mode })}
                className={`h-8 px-4 rounded-pill text-xs font-bold transition-all ${
                  (settings?.ai_mode ?? 'smart') === mode
                    ? 'bg-accent text-navbar'
                    : 'text-text-secondary'
                }`}
              >
                {mode === 'smart' ? 'Smart' : 'Lite'}
              </button>
            ))}
          </div>
        </div>

        {/* Weight unit */}
        <div className="bg-surface rounded-card p-4 flex items-center justify-between">
          <p className="text-text-primary font-bold text-sm">Weight unit</p>
          <div className="flex gap-1 bg-surface-raised rounded-pill p-1">
            {(['kg', 'lbs'] as const).map(unit => (
              <button
                key={unit}
                onClick={() => saveSetting({ weight_unit: unit })}
                className={`h-8 px-4 rounded-pill text-xs font-bold transition-all ${
                  (settings?.weight_unit ?? 'kg') === unit
                    ? 'bg-accent text-navbar'
                    : 'text-text-secondary'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <div className="flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest px-1">ACCOUNT</p>
        <Button
          fullWidth
          loading={signingOut}
          onClick={handleSignOut}
          className="!bg-surface !text-text-secondary border border-surface-raised"
        >
          SIGN OUT
        </Button>
      </div>

      {/* Edit sheet */}
      <AnimatePresence>
        {editField && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setEditField(null)}
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl p-6 z-50 max-h-[80vh] overflow-y-auto"
            >
              <EditSheet
                field={editField}
                profile={profile}
                saving={saving}
                onSave={saveField}
                onClose={() => setEditField(null)}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function EditRow({ label, value, onTap }: { label: string; value: string; onTap: () => void }) {
  return (
    <button
      onClick={onTap}
      className="bg-surface rounded-card p-4 flex items-center justify-between w-full active:brightness-110 transition-all min-h-[56px]"
    >
      <p className="text-text-disabled text-sm">{label}</p>
      <div className="flex items-center gap-2">
        <p className="text-text-primary text-sm font-bold text-right max-w-[180px] truncate">{value}</p>
        <span className="text-text-disabled text-xs">›</span>
      </div>
    </button>
  )
}

function EditSheet({
  field, profile, saving, onSave, onClose
}: {
  field: EditField
  profile: Record<string, unknown> | null | undefined
  saving: boolean
  onSave: (updates: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState<unknown>(
    field ? (profile?.[field] ?? '') : ''
  )

  if (!field) return null

  const handleSave = () => onSave({ [field]: value })

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-black text-xl">
          {field === 'goal' ? 'Goal'
            : field === 'training_days' ? 'Training Days'
            : field === 'environment' ? 'Environment'
            : field === 'equipment' ? 'Equipment'
            : field === 'split_preference' ? 'Training Split'
            : 'Limitations'}
        </h3>
        <button onClick={onClose} className="text-text-disabled text-2xl leading-none">×</button>
      </div>

      {field === 'goal' && (
        <div className="flex flex-col gap-2">
          {(['strength','muscle','endurance','weight_loss','overall'] as const).map(g => (
            <button
              key={g}
              onClick={() => setValue(g)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${
                value === g ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'
              }`}
            >
              {GOAL_LABELS[g]}
            </button>
          ))}
        </div>
      )}

      {field === 'training_days' && (
        <div className="grid grid-cols-4 gap-2">
          {[2,3,4,5,6,7].map(d => (
            <button
              key={d}
              onClick={() => setValue(d)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${
                value === d ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'
              }`}
            >
              {d}
            </button>
          ))}
        </div>
      )}

      {field === 'environment' && (
        <div className="flex flex-col gap-2">
          {(['home','gym','both','outdoors'] as const).map(e => (
            <button
              key={e}
              onClick={() => setValue(e)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${
                value === e ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'
              }`}
            >
              {ENV_LABELS[e]}
            </button>
          ))}
        </div>
      )}

      {field === 'equipment' && (
        <div className="flex flex-col gap-2">
          {(['none','pullup_bar','rings','gym'] as const).map(eq => {
            const selected = Array.isArray(value) ? (value as string[]).includes(eq) : false
            const toggle = () => {
              const arr = Array.isArray(value) ? [...value as string[]] : []
              setValue(selected ? arr.filter(x => x !== eq) : [...arr, eq])
            }
            return (
              <button
                key={eq}
                onClick={toggle}
                className={`h-12 rounded-card text-sm font-bold transition-all ${
                  selected ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'
                }`}
              >
                {EQUIP_LABELS[eq]}
              </button>
            )
          })}
        </div>
      )}

      {field === 'split_preference' && (
        <div className="flex flex-col gap-2">
          {(['full_body','ppl','upper_lower','bro_split'] as const).map(s => (
            <button
              key={s}
              onClick={() => setValue(s)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${
                value === s ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'
              }`}
            >
              {SPLIT_LABELS[s]}
            </button>
          ))}
        </div>
      )}

      {field === 'limitations' && (
        <textarea
          value={String(value ?? '')}
          onChange={e => setValue(e.target.value)}
          placeholder="Describe any injuries or limitations (optional)"
          className="w-full h-28 bg-surface-raised rounded-card p-4 text-text-primary text-sm border border-surface-raised focus:border-accent outline-none resize-none"
        />
      )}

      <Button fullWidth loading={saving} onClick={handleSave}>
        SAVE
      </Button>
    </div>
  )
}
