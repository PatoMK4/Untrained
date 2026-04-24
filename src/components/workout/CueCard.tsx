interface Props {
  exercise: {
    name: string
    cue_card: string[]
  }
}

export function CueCard({ exercise }: Props) {
  return (
    <div className="bg-surface-raised rounded-card p-4 border-l-4 border-accent">
      <p className="text-accent text-xs font-bold tracking-widest mb-3">
        TECHNIQUE — {exercise.name.toUpperCase()}
      </p>
      <div className="flex flex-col gap-2">
        {exercise.cue_card.map((cue, i) => (
          <div key={i} className="flex gap-3">
            <span className="text-accent font-black text-sm w-5 shrink-0">
              {i + 1}
            </span>
            <p className="text-text-secondary text-sm leading-snug">{cue}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
