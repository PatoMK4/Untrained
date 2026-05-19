package com.untrained.app.domain

import kotlin.math.floor
import kotlin.math.sqrt

object ScoreEngine {

    private val LEVEL_TITLES = listOf(
        "Untrained", "Beginner", "Novice", "Intermediate",
        "Trained", "Advanced", "Elite", "Champion"
    )

    fun calculateLevel(totalExp: Int): Int =
        (floor(sqrt(totalExp / 10.0)) + 1).toInt().coerceIn(1, 8)

    fun getLevelTitle(level: Int): String = LEVEL_TITLES.getOrElse(level - 1) { "Champion" }

    fun expForNextLevel(currentLevel: Int): Int {
        val next = (currentLevel + 1).coerceAtMost(8)
        return ((next - 1) * (next - 1) * 10)
    }

    fun expProgressInLevel(totalExp: Int): Float {
        val level = calculateLevel(totalExp)
        if (level >= 8) return 1f
        val current = ((level - 1) * (level - 1) * 10)
        val next = (level * level * 10)
        return ((totalExp - current).toFloat() / (next - current).toFloat()).coerceIn(0f, 1f)
    }

    fun calculateSessionScore(
        progressionUnlocked: Boolean,
        fullBookends: Boolean,
    ): Int {
        var score = 10
        if (progressionUnlocked) score += 25
        if (fullBookends) score += 5
        return score
    }

    fun checkStreakBonus(streak: Int): Int =
        if (streak > 0 && streak % 7 == 0) 15 else 0

    fun missedSessionPenalty(): Int = -5

    fun regressionPenalty(): Int = -10
}
