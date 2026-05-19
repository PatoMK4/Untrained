package com.untrained.app.data.local

import androidx.room.ColumnInfo
import androidx.room.Dao
import androidx.room.Database
import androidx.room.Delete
import androidx.room.Entity
import androidx.room.ForeignKey
import androidx.room.Index
import androidx.room.Insert
import androidx.room.OnConflictStrategy
import androidx.room.PrimaryKey
import androidx.room.Query
import androidx.room.Room
import androidx.room.RoomDatabase
import androidx.room.Update
import android.content.Context
import kotlinx.coroutines.flow.Flow

// ─────────────────────────────────────────────────────────────────
// ENTITIES
// ─────────────────────────────────────────────────────────────────

@Entity(tableName = "workout_sessions")
data class WorkoutSessionEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "user_id") val userId: String,
    @ColumnInfo(name = "date") val date: String,                       // ISO-8601 date string e.g. "2024-05-19"
    @ColumnInfo(name = "session_type") val sessionType: String,        // e.g. "full_body", "push", "pull", "legs"
    @ColumnInfo(name = "status") val status: String,                   // "pending", "active", "completed", "skipped"
    @ColumnInfo(name = "total_sets") val totalSets: Int = 0,
    @ColumnInfo(name = "total_reps") val totalReps: Int = 0,
    @ColumnInfo(name = "score_awarded") val scoreAwarded: Int = 0,
    @ColumnInfo(name = "pain_flagged") val painFlagged: Boolean = false,
    @ColumnInfo(name = "pain_note") val painNote: String? = null,
    @ColumnInfo(name = "readiness_score") val readinessScore: Int? = null,  // 1–5
    @ColumnInfo(name = "post_reflection") val postReflection: String? = null,
    @ColumnInfo(name = "completed_at") val completedAt: String? = null,     // ISO-8601 datetime
    @ColumnInfo(name = "time_available") val timeAvailable: Int = 45         // minutes: 30, 45, or 60
)

@Entity(
    tableName = "exercise_logs",
    foreignKeys = [
        ForeignKey(
            entity = WorkoutSessionEntity::class,
            parentColumns = ["id"],
            childColumns = ["session_id"],
            onDelete = ForeignKey.CASCADE
        )
    ],
    indices = [Index("session_id"), Index("user_id")]
)
data class ExerciseLogEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "session_id") val sessionId: String,
    @ColumnInfo(name = "exercise_id") val exerciseId: String,
    @ColumnInfo(name = "user_id") val userId: String,
    @ColumnInfo(name = "set_number") val setNumber: Int,
    @ColumnInfo(name = "reps") val reps: Int? = null,
    @ColumnInfo(name = "duration_seconds") val durationSeconds: Int? = null,
    @ColumnInfo(name = "effort") val effort: String? = null,           // "easy", "medium", "hard", "brutal"
    @ColumnInfo(name = "extra_weight_kg") val extraWeightKg: Float? = null,
    @ColumnInfo(name = "logged_via") val loggedVia: String = "chat",   // "chat", "manual", "auto"
    @ColumnInfo(name = "skipped") val skipped: Boolean = false,
    @ColumnInfo(name = "skip_reason") val skipReason: String? = null
)

@Entity(tableName = "cached_exercises")
data class CachedExerciseEntity(
    @PrimaryKey val id: String,
    @ColumnInfo(name = "name") val name: String,
    @ColumnInfo(name = "muscle_group") val muscleGroup: String,        // "lower", "upper", "core", "full"
    @ColumnInfo(name = "progression_level") val progressionLevel: Int, // 1–5
    @ColumnInfo(name = "equipment_required") val equipmentRequired: String, // JSON array stored as string
    @ColumnInfo(name = "cue_cards") val cueCards: String,              // JSON array stored as string
    @ColumnInfo(name = "target_reps_min") val targetRepsMin: Int? = null,
    @ColumnInfo(name = "target_reps_max") val targetRepsMax: Int? = null,
    @ColumnInfo(name = "target_duration_seconds") val targetDurationSeconds: Int? = null,
    @ColumnInfo(name = "is_warmup") val isWarmup: Boolean = false,
    @ColumnInfo(name = "is_cooldown") val isCooldown: Boolean = false
)

// ─────────────────────────────────────────────────────────────────
// DAOs
// ─────────────────────────────────────────────────────────────────

@Dao
interface WorkoutSessionDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(session: WorkoutSessionEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(sessions: List<WorkoutSessionEntity>)

    @Update
    suspend fun update(session: WorkoutSessionEntity)

    @Delete
    suspend fun delete(session: WorkoutSessionEntity)

    @Query("SELECT * FROM workout_sessions WHERE id = :id")
    suspend fun getById(id: String): WorkoutSessionEntity?

    @Query("SELECT * FROM workout_sessions WHERE user_id = :userId ORDER BY date DESC")
    fun getByUserId(userId: String): Flow<List<WorkoutSessionEntity>>

    @Query("SELECT * FROM workout_sessions WHERE user_id = :userId AND date = :date LIMIT 1")
    suspend fun getByDate(userId: String, date: String): WorkoutSessionEntity?

    @Query("SELECT * FROM workout_sessions WHERE user_id = :userId AND status = :status ORDER BY date DESC")
    fun getByStatus(userId: String, status: String): Flow<List<WorkoutSessionEntity>>

    @Query("SELECT * FROM workout_sessions WHERE user_id = :userId AND status = 'completed' ORDER BY date DESC LIMIT :limit")
    suspend fun getRecentCompleted(userId: String, limit: Int = 30): List<WorkoutSessionEntity>

    @Query("SELECT COUNT(*) FROM workout_sessions WHERE user_id = :userId AND status = 'completed'")
    suspend fun countCompleted(userId: String): Int

    @Query("SELECT SUM(score_awarded) FROM workout_sessions WHERE user_id = :userId AND status = 'completed'")
    suspend fun getTotalScore(userId: String): Int?

    @Query("DELETE FROM workout_sessions WHERE user_id = :userId")
    suspend fun deleteAllForUser(userId: String)

    @Query("SELECT * FROM workout_sessions WHERE user_id = :userId ORDER BY date DESC LIMIT 1")
    suspend fun getLatest(userId: String): WorkoutSessionEntity?
}

@Dao
interface ExerciseLogDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(log: ExerciseLogEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(logs: List<ExerciseLogEntity>)

    @Update
    suspend fun update(log: ExerciseLogEntity)

    @Delete
    suspend fun delete(log: ExerciseLogEntity)

    @Query("SELECT * FROM exercise_logs WHERE id = :id")
    suspend fun getById(id: String): ExerciseLogEntity?

    @Query("SELECT * FROM exercise_logs WHERE session_id = :sessionId ORDER BY set_number ASC")
    fun getBySessionId(sessionId: String): Flow<List<ExerciseLogEntity>>

    @Query("SELECT * FROM exercise_logs WHERE session_id = :sessionId ORDER BY set_number ASC")
    suspend fun getBySessionIdOnce(sessionId: String): List<ExerciseLogEntity>

    @Query("SELECT * FROM exercise_logs WHERE user_id = :userId AND exercise_id = :exerciseId ORDER BY rowid DESC LIMIT :limit")
    suspend fun getHistoryForExercise(userId: String, exerciseId: String, limit: Int = 20): List<ExerciseLogEntity>

    @Query("SELECT * FROM exercise_logs WHERE user_id = :userId ORDER BY rowid DESC LIMIT :limit")
    suspend fun getRecentByUser(userId: String, limit: Int = 100): List<ExerciseLogEntity>

    @Query("SELECT MAX(reps) FROM exercise_logs WHERE user_id = :userId AND exercise_id = :exerciseId AND skipped = 0")
    suspend fun getPersonalBestReps(userId: String, exerciseId: String): Int?

    @Query("DELETE FROM exercise_logs WHERE session_id = :sessionId")
    suspend fun deleteBySessionId(sessionId: String)

    @Query("DELETE FROM exercise_logs WHERE user_id = :userId")
    suspend fun deleteAllForUser(userId: String)
}

@Dao
interface CachedExerciseDao {

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insert(exercise: CachedExerciseEntity)

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertAll(exercises: List<CachedExerciseEntity>)

    @Update
    suspend fun update(exercise: CachedExerciseEntity)

    @Delete
    suspend fun delete(exercise: CachedExerciseEntity)

    @Query("SELECT * FROM cached_exercises WHERE id = :id")
    suspend fun getById(id: String): CachedExerciseEntity?

    @Query("SELECT * FROM cached_exercises ORDER BY name ASC")
    fun getAll(): Flow<List<CachedExerciseEntity>>

    @Query("SELECT * FROM cached_exercises ORDER BY name ASC")
    suspend fun getAllOnce(): List<CachedExerciseEntity>

    @Query("SELECT * FROM cached_exercises WHERE muscle_group = :muscleGroup ORDER BY progression_level ASC")
    suspend fun getByMuscleGroup(muscleGroup: String): List<CachedExerciseEntity>

    @Query("SELECT * FROM cached_exercises WHERE is_warmup = 1 ORDER BY name ASC")
    suspend fun getWarmupExercises(): List<CachedExerciseEntity>

    @Query("SELECT * FROM cached_exercises WHERE is_cooldown = 1 ORDER BY name ASC")
    suspend fun getCooldownExercises(): List<CachedExerciseEntity>

    @Query("SELECT * FROM cached_exercises WHERE progression_level <= :maxLevel AND muscle_group = :muscleGroup ORDER BY progression_level ASC")
    suspend fun getByMuscleGroupAndLevel(muscleGroup: String, maxLevel: Int): List<CachedExerciseEntity>

    @Query("DELETE FROM cached_exercises")
    suspend fun deleteAll()

    @Query("SELECT COUNT(*) FROM cached_exercises")
    suspend fun count(): Int
}

// ─────────────────────────────────────────────────────────────────
// DATABASE
// ─────────────────────────────────────────────────────────────────

@Database(
    entities = [
        WorkoutSessionEntity::class,
        ExerciseLogEntity::class,
        CachedExerciseEntity::class
    ],
    version = 1,
    exportSchema = true
)
abstract class AppDatabase : RoomDatabase() {

    abstract fun workoutSessionDao(): WorkoutSessionDao
    abstract fun exerciseLogDao(): ExerciseLogDao
    abstract fun cachedExerciseDao(): CachedExerciseDao

    companion object {
        const val DATABASE_NAME = "untrained_db"

        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getInstance(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                INSTANCE ?: Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    DATABASE_NAME
                )
                    .fallbackToDestructiveMigration()
                    .build()
                    .also { INSTANCE = it }
            }
        }
    }
}
