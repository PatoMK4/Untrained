package com.untrained.app.ui.today

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.untrained.app.data.local.AppDatabase
import com.untrained.app.data.local.CachedExerciseEntity
import com.untrained.app.data.local.ExerciseLogEntity
import com.untrained.app.data.local.WorkoutSessionEntity
import com.untrained.app.domain.ChatParser
import com.untrained.app.domain.PainDetector
import com.untrained.app.domain.ScoreEngine
import com.untrained.app.domain.WorkoutEngine
import com.untrained.app.domain.WorkoutPlan
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import java.time.LocalDate
import java.time.format.DateTimeFormatter
import java.util.UUID
import javax.inject.Inject

enum class TodayView { PREVIEW, ACTIVE, POST_WORKOUT, RECOVERY, DONE }

data class SetLog(
    val exerciseId: String,
    val setNumber: Int,
    val reps: Int?,
    val durationSeconds: Int?,
    val effort: String,
    val extraWeightKg: Float?,
)

data class TodayUiState(
    val view: TodayView = TodayView.PREVIEW,
    val isLoading: Boolean = true,
    val sessionType: String = "full_body",
    val timeSlot: Int = 45,
    val readiness: String? = null,
    val workout: WorkoutPlan? = null,
    val sessionId: String? = null,
    val exercises: List<CachedExerciseEntity> = emptyList(),
    val currentExerciseIndex: Int = 0,
    val currentSetNumber: Int = 1,
    val totalSets: Int = 3,
    val logs: List<SetLog> = emptyList(),
    val painFlagged: Boolean = false,
    val isPaused: Boolean = false,
    val startedAt: Long? = null,
    val elapsedSeconds: Int = 0,
    val showRestTimer: Boolean = false,
    val restSeconds: Int = 75,
    val restTotal: Int = 75,
    val scoreAwarded: Int = 0,
    val reflection: String? = null,
    val painResponse: String? = null,
    val isStarting: Boolean = false,
    val isSaving: Boolean = false,
    val errorMessage: String? = null,
    val isRestDay: Boolean = false,
)

@HiltViewModel
class TodayViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val db: AppDatabase,
) : ViewModel() {

    private val _state = MutableStateFlow(TodayUiState())
    val state: StateFlow<TodayUiState> = _state.asStateFlow()

    private var timerJob: Job? = null
    private var restTimerJob: Job? = null

    init {
        loadTodayData()
    }

    private fun loadTodayData() {
        viewModelScope.launch {
            _state.update { it.copy(isLoading = true) }
            try {
                val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
                val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)

                // Check for existing session today
                val todaySession = db.workoutSessionDao().getByDate(userId, today)
                if (todaySession?.status == "completed" || todaySession?.status == "skipped") {
                    _state.update { it.copy(isLoading = false, view = TodayView.DONE) }
                    return@launch
                }

                // Load exercises from cache or Supabase
                var exercises = db.cachedExerciseDao().getAllOnce()
                if (exercises.isEmpty()) {
                    exercises = fetchExercisesFromSupabase(userId)
                }

                // Load user profile to determine session type
                val profile = fetchProfile(userId)
                val completedCount = db.workoutSessionDao().countCompleted(userId)
                val sessionType = WorkoutEngine.getSessionType(
                    trainingDays = profile["training_days"] as? Int ?: 3,
                    splitPreference = profile["split_preference"] as? String ?: "full_body",
                    createdAt = profile["created_at"] as? String ?: today,
                    completedCount = completedCount,
                )

                val isRestDay = sessionType == "rest" || sessionType == "active_recovery"

                val progressionMap = mapOf(
                    "push" to (profile["level_push"] as? Int ?: 1),
                    "pull" to (profile["level_pull"] as? Int ?: 1),
                    "squat" to (profile["level_squat"] as? Int ?: 1),
                    "hinge" to (profile["level_hinge"] as? Int ?: 1),
                    "core" to (profile["level_core"] as? Int ?: 1),
                )
                val equipment = (profile["equipment"] as? List<*>)?.map { it.toString() } ?: emptyList()
                val workout = if (isRestDay) null else WorkoutEngine.buildWorkout(
                    sessionType, 45, progressionMap, equipment, exercises, null
                )

                _state.update { it.copy(
                    isLoading = false,
                    sessionType = sessionType,
                    workout = workout,
                    exercises = workout?.let { w -> w.warmup + w.main + w.cooldown } ?: emptyList(),
                    isRestDay = isRestDay,
                    view = if (isRestDay) TodayView.RECOVERY else TodayView.PREVIEW,
                ) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, errorMessage = e.message) }
            }
        }
    }

    fun setTimeSlot(slot: Int) {
        _state.update { s ->
            val workout = s.workout
            if (workout != null) {
                val userId = supabase.auth.currentUserOrNull()?.id
                val profile = emptyMap<String, Any>()
                val updated = WorkoutEngine.buildWorkout(
                    s.sessionType, slot, emptyMap(), emptyList(), s.exercises, s.readiness
                )
                s.copy(timeSlot = slot, workout = updated, exercises = updated.warmup + updated.main + updated.cooldown)
            } else s.copy(timeSlot = slot)
        }
    }

    fun setReadiness(readiness: String) {
        _state.update { it.copy(readiness = readiness) }
    }

    fun startSession(readiness: String) {
        viewModelScope.launch {
            val s = _state.value
            if (s.exercises.isEmpty()) return@launch
            _state.update { it.copy(isStarting = true) }
            try {
                val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
                val sessionId = UUID.randomUUID().toString()
                val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                val config = s.workout?.config ?: WorkoutEngine.getSessionConfig(s.timeSlot, readiness)
                val entity = WorkoutSessionEntity(
                    id = sessionId, userId = userId, date = today,
                    sessionType = s.sessionType, status = "in_progress",
                    timeAvailable = s.timeSlot, readinessScore = when (readiness) {
                        "great" -> 5; "good" -> 3; "tired" -> 2; else -> 3
                    }
                )
                db.workoutSessionDao().insert(entity)
                // Sync to Supabase
                launch {
                    try {
                        supabase.postgrest["workout_sessions"].insert(mapOf(
                            "id" to sessionId, "user_id" to userId, "date" to today,
                            "session_type" to s.sessionType, "status" to "in_progress",
                            "time_available" to s.timeSlot, "readiness_score" to readiness,
                            "total_sets" to 0, "total_reps" to 0, "score_awarded" to 0,
                            "pain_flagged" to false, "exercises_completed" to emptyList<String>(),
                        ))
                    } catch (_: Exception) {}
                }
                _state.update { it.copy(
                    sessionId = sessionId,
                    readiness = readiness,
                    view = TodayView.ACTIVE,
                    currentExerciseIndex = 0,
                    currentSetNumber = 1,
                    totalSets = config.setsPerExercise,
                    logs = emptyList(),
                    startedAt = System.currentTimeMillis(),
                    isStarting = false,
                ) }
                startElapsedTimer()
            } catch (e: Exception) {
                _state.update { it.copy(isStarting = false, errorMessage = e.message) }
            }
        }
    }

    fun logSet(reps: Int?, durationSeconds: Int?, effort: String, weightKg: Float?) {
        viewModelScope.launch {
            val s = _state.value
            val exercise = s.exercises.getOrNull(s.currentExerciseIndex) ?: return@launch
            val sessionId = s.sessionId ?: return@launch
            val log = SetLog(exercise.id, s.currentSetNumber, reps, durationSeconds, effort, weightKg)
            val newLogs = s.logs + log

            // Save to Room
            val logEntity = ExerciseLogEntity(
                id = UUID.randomUUID().toString(),
                sessionId = sessionId,
                exerciseId = exercise.id,
                userId = supabase.auth.currentUserOrNull()?.id ?: "",
                setNumber = s.currentSetNumber,
                reps = reps, durationSeconds = durationSeconds,
                effort = effort, extraWeightKg = weightKg, loggedVia = "tap",
            )
            db.exerciseLogDao().insert(logEntity)

            val restSeconds = WorkoutEngine.calculateRestSeconds(
                exercise.muscleGroup, effort,
                newLogs.count { it.exerciseId == exercise.id && it.effort == "hard" },
                s.timeSlot
            )
            val isLastSet = s.currentSetNumber >= s.totalSets
            _state.update { it.copy(
                logs = newLogs,
                showRestTimer = true,
                restSeconds = restSeconds,
                restTotal = restSeconds,
            ) }
            if (isLastSet) advanceExercise(newLogs) else advanceSet()
        }
    }

    private fun advanceSet() {
        _state.update { it.copy(currentSetNumber = it.currentSetNumber + 1) }
    }

    private fun advanceExercise(logs: List<SetLog>) {
        val s = _state.value
        if (s.currentExerciseIndex >= s.exercises.size - 1) {
            // All exercises done
            _state.update { it.copy(showRestTimer = false) }
            endSession()
        } else {
            _state.update { it.copy(
                currentExerciseIndex = it.currentExerciseIndex + 1,
                currentSetNumber = 1,
            ) }
        }
    }

    fun dismissRestTimer() {
        _state.update { it.copy(showRestTimer = false) }
    }

    fun onRestComplete() {
        _state.update { it.copy(showRestTimer = false) }
    }

    fun skipExercise() {
        val s = _state.value
        if (s.currentExerciseIndex >= s.exercises.size - 1) endSession()
        else _state.update { it.copy(currentExerciseIndex = it.currentExerciseIndex + 1, currentSetNumber = 1, showRestTimer = false) }
    }

    fun undoLastSet() {
        _state.update { s ->
            val exercise = s.exercises.getOrNull(s.currentExerciseIndex) ?: return@update s
            val logsForEx = s.logs.filter { it.exerciseId == exercise.id }
            if (logsForEx.isEmpty()) return@update s
            val newLogs = s.logs.dropLast(1)
            s.copy(logs = newLogs, currentSetNumber = (s.currentSetNumber - 1).coerceAtLeast(1), showRestTimer = false)
        }
    }

    fun pauseSession() = _state.update { it.copy(isPaused = true) }
    fun resumeSession() = _state.update { it.copy(isPaused = false) }

    fun endSession() {
        stopTimers()
        _state.update { it.copy(view = TodayView.POST_WORKOUT, showRestTimer = false) }
        saveCompletedSession()
    }

    private fun saveCompletedSession() {
        viewModelScope.launch {
            val s = _state.value
            val sessionId = s.sessionId ?: return@launch
            val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
            _state.update { it.copy(isSaving = true) }
            try {
                val totalSets = s.logs.size
                val totalReps = s.logs.sumOf { it.reps ?: 0 }
                val score = ScoreEngine.calculateSessionScore(
                    progressionUnlocked = false,
                    fullBookends = s.exercises.any { it.isWarmup } && s.exercises.any { it.isCooldown }
                        && s.logs.any { l -> s.exercises.find { it.id == l.exerciseId }?.isWarmup == true }
                        && s.logs.any { l -> s.exercises.find { it.id == l.exerciseId }?.isCooldown == true }
                )
                db.workoutSessionDao().update(
                    db.workoutSessionDao().getById(sessionId)!!.copy(
                        status = "completed", totalSets = totalSets, totalReps = totalReps, scoreAwarded = score
                    )
                )
                _state.update { it.copy(scoreAwarded = score, isSaving = false) }
            } catch (e: Exception) {
                _state.update { it.copy(isSaving = false, errorMessage = e.message) }
            }
        }
    }

    fun setReflection(value: String) = _state.update { it.copy(reflection = value) }
    fun setPainResponse(value: String) = _state.update { it.copy(painResponse = value) }

    fun finishPostWorkout() {
        viewModelScope.launch {
            val s = _state.value
            val sessionId = s.sessionId ?: return@launch
            try {
                val session = db.workoutSessionDao().getById(sessionId)
                if (session != null) {
                    db.workoutSessionDao().update(session.copy(
                        postReflection = s.reflection,
                        painFlagged = s.painResponse == "minor" || s.painResponse == "hurt",
                    ))
                }
            } catch (_: Exception) {}
            _state.update { it.copy(view = TodayView.DONE) }
        }
    }

    fun startRecoverySession(type: String) {
        viewModelScope.launch {
            val s = _state.value
            _state.update { it.copy(isStarting = true) }
            try {
                val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
                val allExercises = db.cachedExerciseDao().getAllOnce()
                val recoveryExercises = when (type) {
                    "active_recovery" -> allExercises.filter { it.isWarmup || it.muscleGroup == "core" }.shuffled().take(6)
                    else -> allExercises.filter { it.muscleGroup == "core" && !it.isWarmup && !it.isCooldown }.shuffled().take(4)
                }
                val sessionId = UUID.randomUUID().toString()
                val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
                db.workoutSessionDao().insert(WorkoutSessionEntity(
                    id = sessionId, userId = userId, date = today,
                    sessionType = "active_recovery", status = "in_progress", timeAvailable = 30,
                ))
                _state.update { it.copy(
                    sessionId = sessionId,
                    exercises = recoveryExercises,
                    view = TodayView.ACTIVE,
                    currentExerciseIndex = 0,
                    currentSetNumber = 1,
                    totalSets = 2,
                    logs = emptyList(),
                    startedAt = System.currentTimeMillis(),
                    isStarting = false,
                ) }
                startElapsedTimer()
            } catch (e: Exception) {
                _state.update { it.copy(isStarting = false, errorMessage = e.message) }
            }
        }
    }

    fun markFullRest() {
        viewModelScope.launch {
            val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
            val today = LocalDate.now().format(DateTimeFormatter.ISO_LOCAL_DATE)
            db.workoutSessionDao().insert(WorkoutSessionEntity(
                id = UUID.randomUUID().toString(), userId = userId, date = today,
                sessionType = "rest", status = "skipped", timeAvailable = 30,
            ))
            _state.update { it.copy(view = TodayView.DONE) }
        }
    }

    private fun startElapsedTimer() {
        timerJob?.cancel()
        timerJob = viewModelScope.launch {
            while (true) {
                delay(1000)
                _state.update { s ->
                    if (!s.isPaused) s.copy(elapsedSeconds = s.elapsedSeconds + 1) else s
                }
            }
        }
    }

    private fun stopTimers() {
        timerJob?.cancel()
        restTimerJob?.cancel()
    }

    private suspend fun fetchProfile(userId: String): Map<String, Any> {
        return try {
            supabase.postgrest["user_profile"]
                .select { filter { eq("user_id", userId) } }
                .decodeSingleOrNull<Map<String, Any>>() ?: emptyMap()
        } catch (_: Exception) { emptyMap() }
    }

    private suspend fun fetchExercisesFromSupabase(userId: String): List<CachedExerciseEntity> {
        return try {
            val raw = supabase.postgrest["exercises"].select().decodeList<Map<String, Any>>()
            val entities = raw.map { r ->
                CachedExerciseEntity(
                    id = r["id"].toString(),
                    name = r["name"].toString(),
                    muscleGroup = r["muscle_group"]?.toString() ?: "core",
                    progressionLevel = (r["progression_level"] as? Number)?.toInt() ?: 1,
                    equipmentRequired = r["equipment_required"]?.toString() ?: "none",
                    cueCards = r["cue_card"]?.toString() ?: "[]",
                    targetRepsMin = (r["target_reps_min"] as? Number)?.toInt(),
                    targetRepsMax = (r["target_reps_max"] as? Number)?.toInt(),
                    targetDurationSeconds = (r["target_duration_seconds"] as? Number)?.toInt(),
                    isWarmup = r["is_warmup"] as? Boolean ?: false,
                    isCooldown = r["is_cooldown"] as? Boolean ?: false,
                )
            }
            db.cachedExerciseDao().insertAll(entities)
            entities
        } catch (_: Exception) { emptyList() }
    }

    override fun onCleared() {
        super.onCleared()
        stopTimers()
    }
}
