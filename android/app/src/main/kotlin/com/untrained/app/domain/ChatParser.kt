package com.untrained.app.domain

data class ParsedMessage(
    val reps: Int? = null,
    val effort: String? = null,
    val weightKg: Float? = null,
    val action: ChatAction? = null,
    val painDetected: Boolean = false,
)

enum class ChatAction { DONE, SKIP, REST, NEXT }

object ChatParser {

    private val REPS_RE     = Regex("""(?:hit|did|got|logged)?\s*(\d+)\s*reps?""", RegexOption.IGNORE_CASE)
    private val EFFORT_RE   = Regex("""\b(easy|medium|hard|brutal|felt nothing|struggling)\b""", RegexOption.IGNORE_CASE)
    private val WEIGHT_RE   = Regex("""(\d+(?:\.\d+)?)\s*(?:kg|kilo|kilos|lbs?|pounds?)""", RegexOption.IGNORE_CASE)
    private val DONE_RE     = Regex("""\b(done|finished|complete|completed)\b""", RegexOption.IGNORE_CASE)
    private val SKIP_RE     = Regex("""\b(skip|skipping|skipped)\b""", RegexOption.IGNORE_CASE)
    private val REST_RE     = Regex("""\b(rest|break|pause)\b""", RegexOption.IGNORE_CASE)
    private val NEXT_RE     = Regex("""\b(next|continue|move on)\b""", RegexOption.IGNORE_CASE)

    private val PAIN_KEYWORDS = setOf(
        "hurt", "hurts", "pain", "painful", "sore", "tight", "tightness",
        "uncomfortable", "sharp", "ache", "burning", "pulling",
        "strain", "strained", "injured", "injury", "weird", "off"
    )

    fun parse(text: String): ParsedMessage {
        val lower = text.lowercase()

        val reps = REPS_RE.find(text)?.groupValues?.get(1)?.toIntOrNull()

        val effort = when {
            EFFORT_RE.containsMatchIn(text) -> {
                val raw = EFFORT_RE.find(text)!!.groupValues[1].lowercase()
                when (raw) {
                    "brutal", "struggling" -> "hard"
                    "felt nothing"         -> "easy"
                    else                   -> raw
                }
            }
            else -> null
        }

        val weightKg = WEIGHT_RE.find(text)?.let { m ->
            val value = m.groupValues[1].toFloatOrNull() ?: return@let null
            val unit  = m.value.lowercase()
            if (unit.contains("lb") || unit.contains("pound")) value * 0.453592f else value
        }

        val action = when {
            SKIP_RE.containsMatchIn(lower) -> ChatAction.SKIP
            REST_RE.containsMatchIn(lower) -> ChatAction.REST
            NEXT_RE.containsMatchIn(lower) -> ChatAction.NEXT
            DONE_RE.containsMatchIn(lower) -> ChatAction.DONE
            else -> null
        }

        val painDetected = PAIN_KEYWORDS.any { lower.contains(it) }

        return ParsedMessage(reps, effort, weightKg, action, painDetected)
    }
}
