package com.untrained.app.domain

import com.untrained.app.data.local.CachedExerciseEntity
import java.time.LocalDate
import java.time.temporal.ChronoUnit
import kotlin.math.roundToInt

data class SessionConfig(
    val setsPerExercise: Int,
    val baseRestSeconds: Int,
    val mainCount: Int,
    val warmupCount: Int,
    val cooldownCount: Int,
    val totalMinutes: Int,
)

data class WorkoutPlan(
    val warmup: List<CachedExerciseEntity>,
    val main: List<CachedExerciseEntity>,
    val cooldown: List<CachedExerciseEntity>,
    val config: SessionConfig,
)

object WorkoutEngine {

    // Movement patterns per session type
    private val SESSION_PATTERNS = mapOf(
        "full_body"       to listOf("squat","hinge","push","pull","core","squat","pull"),
        "push"            to listOf("push","push","push","core","push","push"),
        "pull"            to listOf("pull","pull","pull","core","pull","pull"),
        "legs"            to listOf("squat","hinge","squat","hinge","core","squat"),
        "upper_lower_a"   to listOf("push","pull","push","pull","core"),
        "upper_lower_b"   to listOf("squat","hinge","squat","hinge","core"),
        "active_recovery" to listOf("core","core","hinge","core"),
    )

    private val FULL_BODY_CYCLE  = listOf("full_body","rest","full_body","rest")
    private val PPL_CYCLE        = listOf("push","rest","pull","rest","legs","rest")
    private val UPPER_LOWER_CYCLE= listOf("upper_lower_a","legs","rest","upper_lower_b","full_body","rest")
    private val BRO_CYCLE        = listOf("push","pull","legs","full_body","push","rest","rest")

    fun getSessionType(
        trainingDays: Int,
        splitPreference: String,
        createdAt: String,
        completedCount: Int,
    ): String {
        val cycle = when (splitPreference) {
            "ppl"         -> PPL_CYCLE
            "upper_lower" -> UPPER_LOWER_CYCLE
            "bro_split"   -> BRO_CYCLE
            else          -> FULL_BODY_CYCLE
        }
        val idx = completedCount % cycle.size
        return cycle[idx]
    }

    fun getSessionConfig(timeSlot: Int, readiness: String? = null): SessionConfig {
        val base = when (timeSlot) {
            30   -> SessionConfig(2, 60,  4, 2, 2, 30)
            60   -> SessionConfig(4, 90,  7, 4, 4, 60)
            else -> SessionConfig(3, 75,  5, 3, 3, 45) // 45 or no_rush
        }
        return when (readiness) {
            "tired" -> base.copy(setsPerExercise = (base.setsPerExercise - 1).coerceAtLeast(1), baseRestSeconds = base.baseRestSeconds + 15)
            else    -> base
        }
    }

    fun buildWorkout(
        sessionType: String,
        timeSlot: Int,
        progressionMap: Map<String, Int>,
        equipment: List<String>,
        exercises: List<CachedExerciseEntity>,
        readiness: String? = null,
    ): WorkoutPlan {
        val config = getSessionConfig(timeSlot, readiness)
        val patterns = SESSION_PATTERNS[sessionType] ?: SESSION_PATTERNS["full_body"]!!

        val usedIds = mutableSetOf<String>()

        // Main exercises — pick one per pattern slot
        val main = patterns.take(config.mainCount).mapNotNull { pattern ->
            val level = progressionMap[pattern] ?: 1
            pickExercise(exercises, pattern, level, equipment, usedIds, warmup = false, cooldown = false)
        }

        // Warmup
        val warmup = (1..config.warmupCount).mapNotNull {
            val musclesWorked = main.map { it.muscleGroup }.toSet()
            pickWarmup(exercises, musclesWorked, usedIds)
        }

        // Cooldown
        val cooldown = (1..config.cooldownCount).mapNotNull {
            pickCooldown(exercises, usedIds)
        }

        return WorkoutPlan(warmup, main, cooldown, config)
    }

    private fun pickExercise(
        all: List<CachedExerciseEntity>,
        muscleGroup: String,
        level: Int,
        equipment: List<String>,
        used: MutableSet<String>,
        warmup: Boolean,
        cooldown: Boolean,
    ): CachedExerciseEntity? {
        // Try exact level, then adjacent
        for (targetLevel in listOf(level, level - 1, level + 1, 1, 2)) {
            if (targetLevel < 1 || targetLevel > 4) continue
            val candidate = all.filter { ex ->
                ex.muscleGroup == muscleGroup &&
                ex.progressionLevel == targetLevel &&
                ex.isWarmup == warmup &&
                ex.isCooldown == cooldown &&
                ex.id !in used &&
                isEquipmentAvailable(ex.equipmentRequired, equipment)
            }.randomOrNull()
            if (candidate != null) {
                used.add(candidate.id)
                return candidate
            }
        }
        return null
    }

    private fun pickWarmup(
        all: List<CachedExerciseEntity>,
        musclesWorked: Set<String>,
        used: MutableSet<String>,
    ): CachedExerciseEntity? {
        // Prefer warmups targeting muscles in session
        val candidate = all.filter { it.isWarmup && it.id !in used && it.muscleGroup in musclesWorked }.randomOrNull()
            ?: all.filter { it.isWarmup && it.id !in used }.randomOrNull()
        candidate?.let { used.add(it.id) }
        return candidate
    }

    private fun pickCooldown(
        all: List<CachedExerciseEntity>,
        used: MutableSet<String>,
    ): CachedExerciseEntity? {
        val candidate = all.filter { it.isCooldown && it.id !in used }.randomOrNull()
        candidate?.let { used.add(it.id) }
        return candidate
    }

    private fun isEquipmentAvailable(required: String, available: List<String>): Boolean {
        if (required.isBlank() || required == "[]" || required == "none") return true
        if (available.isEmpty()) return required.contains("none") || required.contains("\"none\"")
        return true // simplified: assume equipment filter is handled by DB query
    }

    fun calculateRestSeconds(
        muscleGroup: String,
        lastEffort: String?,
        consecutiveHard: Int,
        timeSlot: Int,
    ): Int {
        val base = when {
            muscleGroup.contains("lower") || muscleGroup == "squat" || muscleGroup == "hinge" -> 90
            muscleGroup == "core" -> 60
            else -> 75
        }
        val adjusted = when (lastEffort) {
            "easy"   -> base - 15
            "hard"   -> base + when {
                consecutiveHard >= 3 -> 60
                consecutiveHard == 2 -> 45
                else -> 30
            }
            else -> base
        }
        return if (timeSlot == 30) adjusted.coerceAtMost(60) else adjusted.coerceAtLeast(30)
    }

    fun estimateCalories(totalSets: Int, avgReps: Double): Int =
        (totalSets * avgReps * 0.35).roundToInt()

    fun estimateMinutes(
        warmupCount: Int,
        mainCount: Int,
        cooldownCount: Int,
        sets: Int,
        restSeconds: Int,
    ): Int = ((warmupCount * 60 + cooldownCount * 60 +
            mainCount * (sets * 45 + (sets - 1) * restSeconds + 30)) / 60.0).roundToInt()
}
