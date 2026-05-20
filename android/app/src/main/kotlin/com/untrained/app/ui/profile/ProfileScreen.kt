package com.untrained.app.ui.profile

import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
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

data class ProfileUiState(
    val isLoading: Boolean = true,
    val displayName: String = "",
    val email: String = "",
    val level: Int = 1,
    val levelTitle: String = "Untrained",
    val totalExp: Int = 0,
    val currentStreak: Int = 0,
    val longestStreak: Int = 0,
    val totalSessions: Int = 0,
    val trainingDays: Int = 3,
    val splitPreference: String = "full_body",
    val equipment: List<String> = emptyList(),
    val isSigningOut: Boolean = false,
    val errorMessage: String? = null,
)

@HiltViewModel
class ProfileViewModel @Inject constructor(
    private val supabase: SupabaseClient,
    private val db: AppDatabase,
) : ViewModel() {

    private val _state = MutableStateFlow(ProfileUiState())
    val state: StateFlow<ProfileUiState> = _state.asStateFlow()

    init { loadProfile() }

    private fun loadProfile() {
        viewModelScope.launch {
            val user = supabase.auth.currentUserOrNull() ?: return@launch
            try {
                val profile = try {
                    supabase.postgrest["user_profile"]
                        .select { filter { eq("user_id", user.id) } }
                        .decodeSingleOrNull<Map<String, Any>>() ?: emptyMap()
                } catch (_: Exception) { emptyMap<String, Any>() }

                val scoreData = try {
                    supabase.postgrest["user_score"]
                        .select { filter { eq("user_id", user.id) } }
                        .decodeSingleOrNull<Map<String, Any>>() ?: emptyMap()
                } catch (_: Exception) { emptyMap<String, Any>() }

                val totalExp = (scoreData["total_exp"] as? Number)?.toInt() ?: 0
                val level = ScoreEngine.calculateLevel(totalExp)
                val totalSessions = db.workoutSessionDao().countCompleted(user.id)

                @Suppress("UNCHECKED_CAST")
                val equipment = (profile["equipment"] as? List<*>)?.map { it.toString() } ?: emptyList()

                _state.update { it.copy(
                    isLoading = false,
                    displayName = profile["display_name"]?.toString() ?: user.email?.substringBefore("@") ?: "Athlete",
                    email = user.email ?: "",
                    level = level,
                    levelTitle = ScoreEngine.getLevelTitle(level),
                    totalExp = totalExp,
                    currentStreak = (scoreData["current_streak"] as? Number)?.toInt() ?: 0,
                    longestStreak = (scoreData["longest_streak"] as? Number)?.toInt() ?: 0,
                    totalSessions = totalSessions,
                    trainingDays = (profile["training_days"] as? Number)?.toInt() ?: 3,
                    splitPreference = profile["split_preference"]?.toString() ?: "full_body",
                    equipment = equipment,
                ) }
            } catch (e: Exception) {
                _state.update { it.copy(isLoading = false, errorMessage = e.message) }
            }
        }
    }

    fun signOut(onComplete: () -> Unit) {
        viewModelScope.launch {
            _state.update { it.copy(isSigningOut = true) }
            try {
                supabase.auth.signOut()
                onComplete()
            } catch (e: Exception) {
                _state.update { it.copy(isSigningOut = false, errorMessage = e.message) }
            }
        }
    }
}

@Composable
fun ProfileScreen(
    viewModel: ProfileViewModel,
    onSignedOut: () -> Unit,
) {
    val state by viewModel.state.collectAsState()

    LazyColumn(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.statusBars),
        contentPadding = PaddingValues(top = 64.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        item {
            MonoText("● PROFILE", color = Accent)
            Spacer(Modifier.height(8.dp))
            Text(
                "YOUR\nACCOUNT.",
                style = TextStyle(fontWeight = FontWeight.Black, fontSize = 72.sp, lineHeight = 66.sp, color = TextPrimary)
            )
        }

        if (state.isLoading) {
            item {
                Column(verticalArrangement = Arrangement.spacedBy(12.dp)) {
                    repeat(3) { Box(Modifier.fillMaxWidth().height(48.dp).background(Surface)) }
                }
            }
            return@LazyColumn
        }

        // Identity card
        item {
            Column(
                Modifier.fillMaxWidth().border(1.dp, Line).background(Surface).padding(20.dp),
                verticalArrangement = Arrangement.spacedBy(4.dp),
            ) {
                Text(
                    state.displayName.uppercase(),
                    style = TextStyle(fontWeight = FontWeight.Black, fontSize = 32.sp, color = TextPrimary)
                )
                MonoText(state.email, color = Muted)
                Spacer(Modifier.height(12.dp))
                Row(
                    Modifier.fillMaxWidth(),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Column {
                        MonoText("LEVEL ${state.level}", color = Accent)
                        Text(
                            state.levelTitle.uppercase(),
                            style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp, color = TextPrimary)
                        )
                    }
                    Column(horizontalAlignment = Alignment.End) {
                        MonoText("TOTAL XP", color = Muted)
                        Text(
                            "${state.totalExp}",
                            style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 24.sp, color = Accent)
                        )
                    }
                }
            }
        }

        // Stats row
        item {
            Row(Modifier.fillMaxWidth().border(1.dp, Line)) {
                listOf(
                    "SESSIONS" to "${state.totalSessions}",
                    "STREAK" to "${state.currentStreak}d",
                    "BEST" to "${state.longestStreak}d",
                ).forEachIndexed { i, (k, v) ->
                    Column(
                        Modifier.weight(1f).padding(16.dp)
                    ) {
                        MonoText(k, color = Muted)
                        Spacer(Modifier.height(6.dp))
                        Text(v, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 24.sp, color = TextPrimary))
                    }
                }
            }
        }

        // Training config
        item {
            Column(verticalArrangement = Arrangement.spacedBy(1.dp)) {
                MonoText("TRAINING CONFIG", color = Muted)
                Spacer(Modifier.height(12.dp))

                ProfileRow("DAYS / WEEK", "${state.trainingDays}")
                ProfileRow("SPLIT", state.splitPreference.replace("_", " ").uppercase())
                ProfileRow("EQUIPMENT", if (state.equipment.isEmpty()) "NONE" else state.equipment.joinToString(", ") { it.uppercase() })
            }
        }

        // Sign out
        item {
            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .height(56.dp)
                    .border(1.dp, Danger.copy(alpha = 0.4f))
                    .background(Surface)
                    .clickable(enabled = !state.isSigningOut) {
                        viewModel.signOut(onSignedOut)
                    },
                contentAlignment = Alignment.Center,
            ) {
                MonoText(
                    if (state.isSigningOut) "SIGNING OUT..." else "SIGN OUT →",
                    color = if (state.isSigningOut) Muted else Danger,
                )
            }
        }

        // Error
        state.errorMessage?.let { msg ->
            item {
                Box(
                    Modifier.fillMaxWidth().border(1.dp, Danger.copy(0.3f)).background(Danger.copy(0.05f)).padding(16.dp)
                ) {
                    MonoText(msg, color = Danger)
                }
            }
        }
    }
}

@Composable
private fun ProfileRow(label: String, value: String) {
    Row(
        Modifier.fillMaxWidth().background(Surface).padding(horizontal = 16.dp, vertical = 14.dp),
        horizontalArrangement = Arrangement.SpaceBetween,
        verticalAlignment = Alignment.CenterVertically,
    ) {
        MonoText(label, color = Muted)
        Text(value, style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 15.sp, color = TextPrimary))
    }
    Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
}
