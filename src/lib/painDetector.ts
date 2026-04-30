const PAIN_KEYWORDS = ['hurt','hurts','pain','painful','sore','tight','tightness',
  'uncomfortable','sharp','ache','burning','pulling','strain','strained','injured','injury','weird','off']
export const detectPain = (msg: string): string[] =>
  PAIN_KEYWORDS.filter(kw => msg.toLowerCase().includes(kw))
export const hasPainSignal = (msg: string): boolean => detectPain(msg).length > 0
