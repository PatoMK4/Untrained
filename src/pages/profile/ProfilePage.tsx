import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wordmark } from '@/components/ui/Wordmark'
import { Button } from '@/components/ui/Button'
import { useUserProfile } from '@/hooks/useWorkout'
import { useUserSettings, useScore } from '@/hooks/useScore'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'
import { useQueryClient, useQuery } from '@tanstack/react-query'

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

type EditField = 'goal' | 'training_days' | 'environment' | 'equipment' | 'split_preference' | 'limitations' | 'weight' | null

export default function ProfilePage() {
  const { user } = useAuthStore()
  const { data: profile, isLoading } = useUserProfile()
  const { data: settings } = useUserSettings()
  const { data: score } = useScore()
  const queryClient = useQueryClient()
  const [editField, setEditField] = useState<EditField>(null)
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState<string | null>(null)
  const [signingOut, setSigningOut] = useState(false)
  const [weightInput, setWeightInput] = useState('')

  const { data: weightHistory, refetch: refetchWeight } = useQuery({
    queryKey: ['weight_history', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('body_logs')
        .select('weight, unit, logged_at')
        .eq('user_id', user!.id)
        .order('logged_at', { ascending: false })
        .limit(7)
      return (data ?? []) as { weight: number; unit: string; logged_at: string }[]
    },
    enabled: !!user,
    staleTime: 0,
  })

  const showToast = (msg: string) => {
    setToast(msg)
    setTimeout(() => setToast(null), 3000)
  }

  const saveField = async (updates: Record<string, unknown>) => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('user_profile').update(updates).eq('user_id', user.id)
      if (error) throw error
      await queryClient.refetchQueries({ queryKey: ['user_profile', user.id] })
      setEditField(null)
      showToast('Program updated. Next session reflects your changes.')
    } catch { showToast('Something went wrong. Try again.') }
    finally { setSaving(false) }
  }

  const saveSetting = async (updates: Record<string, unknown>) => {
    if (!user) return
    setSaving(true)
    try {
      const { error } = await supabase.from('user_settings').upsert({ user_id: user.id, ...updates })
      if (error) throw error
      // Refetch immediately so toggle highlights update without delay
      await queryClient.refetchQueries({ queryKey: ['user_settings', user.id] })
      showToast('Setting saved.')
    } catch { showToast('Could not save setting.') }
    finally { setSaving(false) }
  }

  const logWeight = async () => {
    if (!user || !weightInput) return
    const weight = parseFloat(weightInput)
    if (isNaN(weight) || weight <= 0) return
    setSaving(true)
    try {
      await supabase.from('body_logs').insert({
        user_id: user.id, weight,
        unit: settings?.weight_unit ?? 'kg',
        logged_at: new Date().toISOString(),
      })
      setWeightInput('')
      setEditField(null)
      showToast('Weight logged.')
      refetchWeight()
    } catch { showToast('Could not log weight.') }
    finally { setSaving(false) }
  }

  const handleSignOut = async () => {
    setSigningOut(true)
    await supabase.auth.signOut()
  }

  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString('en', { month: 'long', year: 'numeric' })
    : ''

  const scoreRow = (score ?? {}) as Record<string, unknown>
  const userLevel = (scoreRow.user_level ?? 1) as number
  const userLevelTitle = (scoreRow.user_level_title ?? 'Untrained') as string
  const totalSessions = (scoreRow.total_sessions ?? 0) as number
  const currentStreak = (scoreRow.current_streak ?? 0) as number

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 pt-6">
        <Wordmark />
        {[1,2,3].map(i => <div key={i} className="h-16 bg-surface rounded-card animate-pulse" />)}
      </div>
    )
  }

  const weightUnit = settings?.weight_unit ?? 'kg'
  const latestWeight = weightHistory?.[0]

  return (
    <div className="flex flex-col gap-6 pt-6 pb-8">
      <Wordmark />

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            className="fixed top-4 left-0 right-0 mx-4 z-50 bg-surface border border-accent rounded-card p-3 text-center"
          >
            <p className="text-accent text-sm font-bold">{toast}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Identity */}
      <div className="bg-surface rounded-card p-5 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-text-primary font-bold">{user?.email}</p>
            <p className="text-text-disabled text-sm">Member since {memberSince}</p>
          </div>
          <div className="text-right">
            <p className="text-accent font-black text-sm">{userLevelTitle.toUpperCase()}</p>
            <p className="text-text-disabled text-xs">Level {userLevel}</p>
          </div>
        </div>
        <div className="flex gap-6 pt-2 border-t border-surface-raised">
          <div>
            <p className="text-text-disabled text-xs">SESSIONS</p>
            <p className="text-text-primary font-black text-lg">{totalSessions}</p>
          </div>
          <div>
            <p className="text-text-disabled text-xs">STREAK</p>
            <p className="text-text-primary font-black text-lg">{currentStreak} days</p>
          </div>
          {latestWeight && (
            <div>
              <p className="text-text-disabled text-xs">WEIGHT</p>
              <p className="text-text-primary font-black text-lg">{latestWeight.weight} {weightUnit}</p>
            </div>
          )}
        </div>
      </div>

      {/* Body weight */}
      <div className="flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest px-1">BODY WEIGHT</p>
        <button onClick={() => setEditField('weight')}
          className="bg-surface rounded-card p-4 flex items-center justify-between w-full active:brightness-110 transition-all min-h-[56px]"
        >
          <p className="text-text-disabled text-sm">Log today's weight</p>
          <p className="text-text-primary text-sm font-bold">{weightUnit} ›</p>
        </button>
        {weightHistory && weightHistory.length > 0 && (
          <div className="bg-surface rounded-card p-4">
            <p className="text-text-disabled text-xs tracking-widest mb-3">RECENT</p>
            <div className="flex flex-col gap-2">
              {weightHistory.map((entry, i) => (
                <div key={i} className="flex items-center justify-between">
                  <p className="text-text-disabled text-xs">
                    {new Date(entry.logged_at).toLocaleDateString('en', { weekday: 'short', month: 'short', day: 'numeric' })}
                  </p>
                  <p className="text-text-primary text-sm font-bold">{entry.weight} {entry.unit}</p>
                </div>
              ))}
            </div>
            {weightHistory.length >= 2 && (() => {
              const diff = weightHistory[0].weight - weightHistory[weightHistory.length - 1].weight
              if (Math.abs(diff) < 0.1) return null
              return (
                <p className={`text-xs mt-3 font-bold ${diff < 0 ? 'text-success' : 'text-warning'}`}>
                  {diff < 0 ? '↓' : '↑'} {Math.abs(diff).toFixed(1)} {weightUnit} over {weightHistory.length} logs
                </p>
              )
            })()}
          </div>
        )}
      </div>

      {/* Program */}
      <div className="flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest px-1">YOUR PROGRAM</p>
        <EditRow label="Goal" value={GOAL_LABELS[profile?.goal ?? ''] ?? profile?.goal ?? '—'} onTap={() => setEditField('goal')} />
        <EditRow label="Training days" value={`${profile?.training_days ?? '—'} days / week`} onTap={() => setEditField('training_days')} />
        <EditRow label="Environment" value={ENV_LABELS[profile?.environment ?? ''] ?? profile?.environment ?? '—'} onTap={() => setEditField('environment')} />
        <EditRow label="Equipment" value={(profile?.equipment ?? []).map((e: string) => EQUIP_LABELS[e] ?? e).join(', ') || 'None'} onTap={() => setEditField('equipment')} />
        <EditRow label="Training split" value={SPLIT_LABELS[profile?.split_preference ?? ''] ?? profile?.split_preference ?? '—'} onTap={() => setEditField('split_preference')} />
        <EditRow label="Limitations" value={profile?.limitations || 'None'} onTap={() => setEditField('limitations')} />
      </div>

      {/* App settings */}
      <div className="flex flex-col gap-2">
        <p className="text-text-disabled text-xs tracking-widest px-1">APP SETTINGS</p>
        <div className="bg-surface rounded-card p-4 flex items-center justify-between">
          <div>
            <p className="text-text-primary font-bold text-sm">AI Mode</p>
            <p className="text-text-disabled text-xs">Smart uses API · Lite is instant</p>
          </div>
          <div className="flex gap-1 bg-surface-raised rounded-pill p-1">
            {(['smart', 'lite'] as const).map(mode => (
              <button key={mode} onClick={() => saveSetting({ ai_mode: mode })}
                className={`h-8 px-4 rounded-pill text-xs font-bold transition-all ${
                  (settings?.ai_mode ?? 'lite') === mode ? 'bg-accent text-navbar' : 'text-text-secondary'
                }`}
              >
                {mode === 'smart' ? 'Smart' : 'Lite'}
              </button>
            ))}
          </div>
        </div>
        <div className="bg-surface rounded-card p-4 flex items-center justify-between">
          <p className="text-text-primary font-bold text-sm">Weight unit</p>
          <div className="flex gap-1 bg-surface-raised rounded-pill p-1">
            {(['kg', 'lbs'] as const).map(unit => (
              <button key={unit} onClick={() => saveSetting({ weight_unit: unit })}
                className={`h-8 px-4 rounded-pill text-xs font-bold transition-all ${
                  weightUnit === unit ? 'bg-accent text-navbar' : 'text-text-secondary'
                }`}
              >
                {unit}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Sign out */}
      <Button fullWidth loading={signingOut} onClick={handleSignOut}
        className="!bg-surface !text-text-secondary border border-surface-raised"
      >
        SIGN OUT
      </Button>

      {/* Edit sheet — pb-24 clears the navbar */}
      <AnimatePresence>
        {editField && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 0.6 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black z-40"
              onClick={() => setEditField(null)}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 bg-surface rounded-t-2xl p-6 z-50 max-h-[80vh] overflow-y-auto pb-24"
            >
              {editField === 'weight' ? (
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-text-primary font-black text-xl">LOG WEIGHT</h3>
                    <button onClick={() => setEditField(null)} className="text-text-disabled text-2xl leading-none">×</button>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      value={weightInput}
                      onChange={e => setWeightInput(e.target.value)}
                      placeholder="e.g. 80"
                      className="flex-1 h-14 bg-surface-raised rounded-card px-4 text-text-primary text-2xl font-bold border border-surface-raised focus:border-accent outline-none"
                    />
                    <span className="text-text-secondary text-lg font-bold">{weightUnit}</span>
                  </div>
                  <Button fullWidth loading={saving} onClick={logWeight}>LOG</Button>
                </div>
              ) : (
                <EditSheet
                  field={editField as Exclude<EditField, 'weight' | null>}
                  profile={profile as Record<string, unknown> | null | undefined}
                  saving={saving}
                  onSave={saveField}
                  onClose={() => setEditField(null)}
                />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

function EditRow({ label, value, onTap }: { label: string; value: string; onTap: () => void }) {
  return (
    <button onClick={onTap}
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
  field, profile, saving, onSave, onClose,
}: {
  field: Exclude<EditField, 'weight' | null>
  profile: Record<string, unknown> | null | undefined
  saving: boolean
  onSave: (updates: Record<string, unknown>) => Promise<void>
  onClose: () => void
}) {
  const [value, setValue] = useState<unknown>(field ? (profile?.[field] ?? '') : '')
  if (!field) return null

  const FIELD_LABELS: Record<string, string> = {
    goal: 'Goal', training_days: 'Training Days', environment: 'Environment',
    equipment: 'Equipment', split_preference: 'Training Split', limitations: 'Limitations',
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="text-text-primary font-black text-xl">{FIELD_LABELS[field]}</h3>
        <button onClick={onClose} className="text-text-disabled text-2xl leading-none">×</button>
      </div>
      {field === 'goal' && (
        <div className="flex flex-col gap-2">
          {(['strength','muscle','endurance','weight_loss','overall'] as const).map(g => (
            <button key={g} onClick={() => setValue(g)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${value === g ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'}`}
            >{GOAL_LABELS[g]}</button>
          ))}
        </div>
      )}
      {field === 'training_days' && (
        <div className="grid grid-cols-4 gap-2">
          {[2,3,4,5,6,7].map(d => (
            <button key={d} onClick={() => setValue(d)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${value === d ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'}`}
            >{d}</button>
          ))}
        </div>
      )}
      {field === 'environment' && (
        <div className="flex flex-col gap-2">
          {(['home','gym','both','outdoors'] as const).map(e => (
            <button key={e} onClick={() => setValue(e)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${value === e ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'}`}
            >{ENV_LABELS[e]}</button>
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
              <button key={eq} onClick={toggle}
                className={`h-12 rounded-card text-sm font-bold transition-all ${selected ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'}`}
              >{EQUIP_LABELS[eq]}</button>
            )
          })}
        </div>
      )}
      {field === 'split_preference' && (
        <div className="flex flex-col gap-2">
          {(['full_body','ppl','upper_lower','bro_split'] as const).map(s => (
            <button key={s} onClick={() => setValue(s)}
              className={`h-12 rounded-card text-sm font-bold transition-all ${value === s ? 'bg-accent text-navbar' : 'bg-surface-raised text-text-primary'}`}
            >{SPLIT_LABELS[s]}</button>
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
      <Button fullWidth loading={saving} onClick={() => onSave({ [field]: value })}>SAVE</Button>
    </div>
  )
}