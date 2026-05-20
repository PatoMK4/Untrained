package com.untrained.app.domain

object PainDetector {
    private val KEYWORDS = listOf(
        "hurt", "hurts", "pain", "painful", "sore", "tight", "tightness",
        "uncomfortable", "sharp", "ache", "burning", "pulling",
        "strain", "strained", "injured", "injury", "weird", "off"
    )

    fun detect(text: String): Boolean = KEYWORDS.any { text.lowercase().contains(it) }
}
