package com.untrained.app.ui.progress

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.untrained.app.data.local.AppDatabase
import com.untrained.app.domain.ScoreEngine
import com.untrained.app.ui.auth.MonoText
import com.untrained.app.ui.theme.*
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import javax.inject.Inject

data class ProgressUiState(
    val isLoading: Boolean = true,
    val totalExp: Int = 0,
    val weeklyExp: Int = 0,
    val level: Int = 1,
    val levelTitle: String = "Untrained",
    val streak: Int = 0,
    val longestStreak: Int = 0,
    val totalSessions: Int = 0,
    val totalSets: Int = 0,
    val totalReps: Int = 0,
    val expProgress: Float = 0f,
    val challengeProgress: List<ChallengeItem> = emptyList(),
    val recentSessions: List<SessionSummary> = emptyList(),
)

data class ChallengeItem(
    val id: String,
    val title: String,
    val description: String,
    val progress: Float,
    val completed: Boolean,
    val xp: Int,
    val icon: String,
)

data class SessionSummary(
    val date: String,
    val sessionType: String,
    val totalSets: Int,
    val scoreAwarded: Int,
)

@HiltViewModel
class ProgressViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val db: AppDatabase,
) : ViewModel() {

    private val _state = MutableStateFlow(ProgressUiState())
    val state: StateFlow<ProgressUiState> = _state.asStateFlow()

    init { loadData() }

    private fun loadData() {
        viewModelScope.launch {
            val userId = supabase.auth.currentUserOrNull()?.id ?: return@launch
            try {
                // Load score
                val scoreData = try {
                    supabase.postgrest["user_score"].select { filter { eq("user_id", userId) } }
                        .decodeSingleOrNull<Map<String, Any>>() ?: emptyMap()
                } catch (_: Exception) { emptyMap() }

                val totalExp = (scoreData["total_exp"] as? Number)?.toInt() ?: 0
                val weeklyExp = (scoreData["weekly_exp"] as? Number)?.toInt() ?: 0
                val streak = (scoreData["current_streak"] as? Number)?.toInt() ?: 0
                val longestStreak = (scoreData["longest_streak"] as? Number)?.toInt() ?: 0
                val level = ScoreEngine.calculateLevel(totalExp)

                // Load sessions from Room
                val sessions = db.workoutSessionDao().getRecentCompleted(userId, 10)
                val totalSessions = db.workoutSessionDao().countCompleted(userId)
                val totalSetsLocal = sessions.sumOf { it.totalSets }
                val totalRepsLocal = sessions.sumOf { it.totalReps }

                // Challenges
                val challenges = buildChallenges(totalSessions, streak, totalRepsLocal, totalSetsLocal)

                _state.update { it.copy(
                    isLoading = false,
                    totalExp = totalExp,
                    weeklyExp = weeklyExp,
                    level = level,
                    levelTitle = ScoreEngine.getLevelTitle(level),
                    streak = streak,
                    longestStreak = longestStreak,
                    totalSessions = totalSessions,
                    totalSets = totalSetsLocal,
                    totalReps = totalRepsLocal,
                    expProgress = ScoreEngine.expProgressInLevel(totalExp),
                    challengeProgress = challenges,
                    recentSessions = sessions.map { s ->
                        SessionSummary(s.date, s.sessionType.replace("_", " ").uppercase(), s.totalSets, s.scoreAwarded)
                    }
                ) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false) }
            }
        }
    }

    private fun buildChallenges(sessions: Int, streak: Int, reps: Int, sets: Int): List<ChallengeItem> = listOf(
        ChallengeItem("first_blood",   "First Blood",       "Complete 1 session",       (sessions.coerceAtMost(1) / 1f), sessions >= 1,  25,  "🏁"),
        ChallengeItem("week_warrior",  "Week Warrior",      "7-day streak",              (streak.coerceAtMost(7) / 7f),   streak >= 7,    75,  "🔥"),
        ChallengeItem("14_days",       "14 Days on Track",  "14-day streak",             (streak.coerceAtMost(14) / 14f), streak >= 14,   150, "⚡"),
        ChallengeItem("the_grind",     "The Grind",         "30 sessions",               (sessions.coerceAtMost(30) / 30f), sessions >= 30, 200, "💀"),
        ChallengeItem("rep_machine",   "Rep Machine",       "1,000 total reps",          (reps.coerceAtMost(1000) / 1000f), reps >= 1000,  100, "🦾"),
        ChallengeItem("iron_will",     "Iron Will",         "10,000 total reps",         (reps.coerceAtMost(10000) / 10000f), reps >= 10000, 500, "🏋️"),
        ChallengeItem("half_century",  "Half Century",      "50 sessions",               (sessions.coerceAtMost(50) / 50f), sessions >= 50, 300, "🎯"),
        ChallengeItem("set_machine",   "Set Machine",       "500 total sets",            (sets.coerceAtMost(500) / 500f), sets >= 500,    200, "🔩"),
    )
}

@Composable
fun ProgressScreen(viewModel: ProgressViewModel) {
    val state by viewModel.state.collectAsState()

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Background).padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.statusBars),
        contentPadding = PaddingValues(top = 64.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        item {
            // Header
            MonoText("● PROGRESS", color = Accent)
            Spacer(Modifier.height(8.dp))
            Text("YOUR\nSTATS.", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 72.sp, lineHeight = 66.sp, color = TextPrimary))
        }

        if (state.isLoading) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    repeat(4) { Box(Modifier.fillMaxWidth().height(48.dp).background(Surface)) }
                }
            }
            return@LazyColumn
        }

        // Level card
        item {
            Column(Modifier.fillMaxWidth().border(1.dp, Line).background(Surface).padding(20.dp)) {
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    Column {
                        MonoText("LEVEL ${state.level}", color = Accent)
                        Spacer(Modifier.height(4.dp))
                        Text(state.levelTitle.uppercase(), style = TextStyle(fontWeight = FontWeight.Black, fontSize = 32.sp, color = TextPrimary))
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        MonoText("TOTAL XP", color = Muted)
                        Text("${state.totalExp}", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 28.sp, color = Accent))
                    }
                }
                Spacer(Modifier.height(16.dp))
                Box(Modifier.fillMaxWidth().height(3.dp).background(Line2)) {
                    Box(Modifier.fillMaxWidth(state.expProgress).fillMaxHeight().background(Accent))
                }
                Spacer(Modifier.height(6.dp))
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    MonoText("LVL ${state.level}", color = Muted)
                    MonoText("LVL ${(state.level + 1).coerceAtMost(8)}", color = Muted)
                }
            }
        }

        // Stats grid
        item {
            Row(Modifier.fillMaxWidth().border(1.dp, Line)) {
                listOf(
                    "SESSIONS" to "${state.totalSessions}",
                    "STREAK" to "${state.streak}d",
                    "WEEKLY" to "+${state.weeklyExp}",
                ).forEachIndexed { i, (k, v) ->
                    Column(
                        Modifier.weight(1f)
                            .then(if (i > 0) Modifier else Modifier)
                            .padding(16.dp)
                    ) {
                        MonoText(k, color = Muted)
                        Spacer(Modifier.height(6.dp))
                        Text(v, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 24.sp, color = TextPrimary))
                    }
                }
            }
        }

        // Challenges
        item {
            Column {
                MonoText("CHALLENGES", color = Muted)
                Spacer(Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    state.challengeProgress.forEach { c ->
                        ChallengeRow(c)
                    }
                }
            }
        }

        // Recent sessions
        if (state.recentSessions.isNotEmpty()) {
            item {
                Column {
                    MonoText("RECENT SESSIONS", color = Muted)
                    Spacer(Modifier.height(12.dp))
                    Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                        state.recentSessions.forEach { s ->
                            Row(
                                Modifier.fillMaxWidth().background(Surface).padding(horizontal = 16.dp, vertical = 12.dp),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically,
                            ) {
                                Column {
                                    Text(s.sessionType, style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = TextPrimary))
                                    MonoText(s.date, color = Muted)
                                }
                                Row(horizontalArrangement = Arrangement.spacedBy(16.dp)) {
                                    Column(horizontalAlignment = Alignment.End) {
                                        MonoText("SETS", color = Muted)
                                        Text("${s.totalSets}", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Text2))
                                    }
                                    Column(horizontalAlignment = Alignment.End) {
                                        MonoText("SCORE", color = Muted)
                                        Text("+${s.scoreAwarded}", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = Accent))
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun ChallengeRow(challenge: ChallengeItem) {
    Row(
        Modifier.fillMaxWidth().border(1.dp, if (challenge.completed) Accent.copy(0.3f) else Line)
            .background(if (challenge.completed) Accent.copy(0.04f) else Surface)
            .padding(16.dp),
        horizontalArrangement = Arrangement.spacedBy(12.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text(challenge.icon, style = TextStyle(fontSize = 18.sp))
        Column(Modifier.weight(1f)) {
            Row(horizontalArrangement = Arrangement.SpaceBetween, modifier = Modifier.fillMaxWidth()) {
                Text(challenge.title, style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = if (challenge.completed) Accent else TextPrimary))
                MonoText("+${challenge.xp} XP", color = if (challenge.completed) Accent else Muted)
            }
            Spacer(Modifier.height(6.dp))
            Box(Modifier.fillMaxWidth().height(2.dp).background(Line2)) {
                Box(Modifier.fillMaxWidth(challenge.progress).fillMaxHeight().background(if (challenge.completed) Accent else Muted))
            }
        }
    }
}
