package com.untrained.app.ui.today

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawWithContent
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.untrained.app.domain.WorkoutEngine
import com.untrained.app.ui.auth.MonoText
import com.untrained.app.ui.components.UntrainedButton
import com.untrained.app.ui.theme.*
import java.time.LocalDate
import java.time.format.TextStyle as JTextStyle
import java.util.Locale

@Composable
fun TodayScreen(viewModel: TodayViewModel) {
    val state by viewModel.state.collectAsState()

    val now = LocalDate.now()
    val dayLabel = now.dayOfWeek.getDisplayName(JTextStyle.SHORT, Locale.ENGLISH).uppercase()
    val dateStr = "${now.month.getDisplayName(JTextStyle.SHORT, Locale.ENGLISH).uppercase()} ${now.dayOfMonth}"

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.statusBars)
    ) {
        if (state.isLoading) {
            LoadingShimmer()
            return@Box
        }

        AnimatedContent(
            targetState = state.view,
            transitionSpec = { fadeIn() togetherWith fadeOut() },
            label = "today_view"
        ) { view ->
            when (view) {
                TodayView.PREVIEW -> PreviewView(state, viewModel, dayLabel, dateStr)
                TodayView.ACTIVE  -> ActiveSessionScreen(state, viewModel)
                TodayView.POST_WORKOUT -> PostWorkoutView(state, viewModel)
                TodayView.RECOVERY -> RecoveryDayView(state, viewModel)
                TodayView.DONE -> DoneView(state, dayLabel, dateStr)
            }
        }
    }
}

@Composable
private fun LoadingShimmer() {
    Column(modifier = Modifier.padding(top = 64.dp), verticalArrangement = Arrangement.spacedBy(16.dp)) {
        Box(Modifier.size(6.dp).background(Accent))
        Box(Modifier.size(200.dp, 48.dp).background(Surface))
        Box(Modifier.size(140.dp, 12.dp).background(Surface))
        Box(Modifier.fillMaxWidth().height(160.dp).background(Surface))
    }
}

@Composable
private fun PreviewView(
    state: TodayUiState,
    viewModel: TodayViewModel,
    dayLabel: String,
    dateStr: String,
) {
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 64.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        item { TopMeta(dayLabel, dateStr) }

        // Session heading
        item {
            Column {
                MonoText(state.sessionType.replace("_", " ").uppercase(), color = Muted)
                Spacer(Modifier.height(6.dp))
                Text(
                    state.sessionType.split("_")[0].uppercase(),
                    style = TextStyle(fontWeight = FontWeight.Black, fontSize = 72.sp, lineHeight = 66.sp, color = TextPrimary)
                )
                Spacer(Modifier.height(8.dp))
                val w = state.workout
                if (w != null) {
                    MonoText(
                        "${WorkoutEngine.estimateMinutes(w.warmup.size, w.main.size, w.cooldown.size, w.config.setsPerExercise, w.config.baseRestSeconds)} MIN · ${w.warmup.size + w.main.size + w.cooldown.size} LIFTS · ${w.config.setsPerExercise} SETS",
                        color = Muted
                    )
                }
            }
        }

        // Time picker
        item {
            Column {
                MonoText("TIME AVAILABLE", color = Muted)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(30, 45, 60).forEach { t ->
                        val selected = state.timeSlot == t
                        Box(
                            modifier = Modifier
                                .height(36.dp)
                                .border(1.dp, if (selected) Accent else Line2)
                                .background(if (selected) Accent else Color.Transparent)
                                .clickable { viewModel.setTimeSlot(t) }
                                .padding(horizontal = 12.dp),
                            contentAlignment = Alignment.Center,
                        ) {
                            MonoText("${t} MIN", color = if (selected) Background else Text2)
                        }
                    }
                }
            }
        }

        // Exercise accordion
        val workout = state.workout
        if (workout != null) {
            item {
                ExerciseAccordion("WARM-UP", workout.warmup)
            }
            item {
                ExerciseAccordion("MAIN", workout.main, defaultOpen = true)
            }
            item {
                ExerciseAccordion("COOL-DOWN", workout.cooldown)
            }
        }

        // Readiness picker
        item {
            Column {
                MonoText("READINESS", color = Muted)
                Spacer(Modifier.height(12.dp))
                Column(verticalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        Triple("great", "READY TO PUSH", "All good"),
                        Triple("good", "FEELING GOOD", "Normal session"),
                        Triple("tired", "A BIT TIRED", "Keep it manageable"),
                    ).forEach { (value, label, sub) ->
                        val selected = state.readiness == value
                        Row(
                            modifier = Modifier
                                .fillMaxWidth()
                                .height(56.dp)
                                .border(1.dp, if (selected) Accent else Line)
                                .background(if (selected) Accent else Surface)
                                .clickable { viewModel.setReadiness(value) }
                                .padding(horizontal = 16.dp),
                            horizontalArrangement = Arrangement.SpaceBetween,
                            verticalAlignment = Alignment.CenterVertically,
                        ) {
                            Text(
                                label,
                                style = TextStyle(
                                    fontWeight = FontWeight.Bold, fontSize = 20.sp,
                                    color = if (selected) Background else TextPrimary,
                                )
                            )
                            MonoText(sub, color = if (selected) Background.copy(alpha = 0.6f) else Muted)
                        }
                    }
                }
            }
        }

        // Begin button
        item {
            if (state.readiness != null) {
                UntrainedButton(
                    label = "BEGIN",
                    sub = "SESSION",
                    loading = state.isStarting,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { viewModel.startSession(state.readiness) },
                )
            } else {
                MonoText("Select readiness to unlock", color = Muted2)
            }
        }
    }
}

@Composable
private fun ExerciseAccordion(
    label: String,
    exercises: List<com.untrained.app.data.local.CachedExerciseEntity>,
    defaultOpen: Boolean = false,
) {
    var open by remember { mutableStateOf(defaultOpen) }
    Column {
        Row(
            modifier = Modifier
                .fillMaxWidth()
                .clickable { open = !open }
                .padding(vertical = 14.dp)
                .drawTopBorder(),
            horizontalArrangement = Arrangement.SpaceBetween,
            verticalAlignment = Alignment.CenterVertically,
        ) {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                MonoText(label, color = Muted)
                MonoText("(${exercises.size})", color = Muted2)
            }
            MonoText(if (open) "▲" else "▼", color = Muted2)
        }
        if (open) {
            exercises.forEachIndexed { i, ex ->
                Row(
                    modifier = Modifier.fillMaxWidth().padding(vertical = 14.dp),
                    horizontalArrangement = Arrangement.spacedBy(14.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    MonoText(String.format("%02d", i + 1), color = Muted)
                    Column(Modifier.weight(1f)) {
                        Text(ex.name, style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp, color = TextPrimary))
                        val reps = if (ex.targetDurationSeconds != null) "${ex.targetDurationSeconds}s"
                        else if (ex.targetRepsMin != null && ex.targetRepsMax != null) "${ex.targetRepsMin}–${ex.targetRepsMax} reps"
                        else ""
                        if (reps.isNotEmpty()) MonoText(reps, color = Muted)
                    }
                }
                Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            }
        }
    }
}

@Composable
private fun DoneView(state: TodayUiState, dayLabel: String, dateStr: String) {
    Column(
        modifier = Modifier.fillMaxSize().padding(top = 64.dp),
        verticalArrangement = Arrangement.spacedBy(0.dp),
    ) {
        TopMeta(dayLabel, dateStr)
        MonoText("● COMPLETE", color = Accent)
        Spacer(Modifier.height(8.dp))
        Text("DONE.", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 96.sp, lineHeight = 86.sp, color = TextPrimary))
        Spacer(Modifier.height(32.dp))
        // Stats grid
        Row(
            modifier = Modifier.fillMaxWidth().border(width = 0.dp, color = Color.Transparent)
        ) {
            listOf(
                Triple("TIME", "${(state.logs.size * 2.5).toInt()}:00", "MIN"),
                Triple("VOL", "${state.logs.size}", "SETS"),
                Triple("SCORE", "+${state.scoreAwarded}", "PTS"),
            ).forEachIndexed { i, (k, v, u) ->
                Column(
                    modifier = Modifier
                        .weight(1f)
                        .drawStartBorder(show = i > 0)
                        .padding(vertical = 20.dp, horizontal = 16.dp)
                ) {
                    MonoText(k, color = Muted)
                    Spacer(Modifier.height(8.dp))
                    Row(verticalAlignment = Alignment.Bottom, horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                        Text(v, style = TextStyle(
                            fontWeight = FontWeight.Bold, fontSize = 28.sp,
                            color = if (k == "SCORE") Accent else TextPrimary,
                        ))
                        if (u.isNotEmpty()) MonoText(u, color = Muted)
                    }
                }
            }
        }
        Spacer(Modifier.height(40.dp))
        MonoText("See you next session.", color = Muted2)
    }
}

@Composable
private fun PostWorkoutView(state: TodayUiState, viewModel: TodayViewModel) {
    val showPainCheck = state.painFlagged
    LazyColumn(
        modifier = Modifier.fillMaxSize(),
        contentPadding = PaddingValues(top = 48.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(32.dp),
    ) {
        item {
            MonoText("● COMPLETE", color = Accent)
            Spacer(Modifier.height(8.dp))
            Text("DONE.", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 96.sp, lineHeight = 86.sp, color = TextPrimary))
            Spacer(Modifier.height(8.dp))
            Text("Good work.", style = TextStyle(fontWeight = FontWeight.Medium, fontSize = 28.sp, color = Text2))
        }

        // Stats
        item {
            Row(modifier = Modifier.fillMaxWidth().border(1.dp, Line)) {
                listOf("TIME" to "${(state.logs.size * 2.5).toInt()}:00 MIN", "SETS" to "${state.logs.size}", "REPS" to "${state.logs.sumOf { it.reps ?: 0 }}").forEachIndexed { i, (k, v) ->
                    Column(
                        modifier = Modifier.weight(1f)
                            .then(if (i > 0) Modifier.border(start = 1.dp, color = Line, end = 0.dp) else Modifier)
                            .padding(vertical = 20.dp, horizontal = 16.dp)
                    ) {
                        MonoText(k, color = Muted)
                        Spacer(Modifier.height(8.dp))
                        Text(v, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 26.sp, color = TextPrimary))
                    }
                }
            }
        }

        // Score
        item {
            Column {
                MonoText("SCORE EARNED", color = Muted)
                Spacer(Modifier.height(6.dp))
                Text(
                    if (state.isSaving) "—" else "+${state.scoreAwarded}",
                    style = TextStyle(fontWeight = FontWeight.Black, fontSize = 48.sp, color = Accent)
                )
            }
        }

        // How did that feel
        item {
            Column {
                MonoText("HOW DID THAT FEEL?", color = Muted)
                Spacer(Modifier.height(12.dp))
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                    listOf(
                        "5" to "loved_it",
                        "4" to "good",
                        "3" to "fine",
                        "2" to "tough",
                        "1" to "really_hard",
                    ).forEach { (num, value) ->
                        val selected = state.reflection == value
                        Column(
                            modifier = Modifier
                                .weight(1f)
                                .border(1.dp, if (selected) Accent else Line2)
                                .background(if (selected) Accent.copy(0.07f) else Color.Transparent)
                                .clickable { viewModel.setReflection(value) }
                                .padding(vertical = 12.dp),
                            horizontalAlignment = Alignment.CenterHorizontally,
                        ) {
                            Text(num, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 16.sp, color = if (selected) Accent else Text2))
                            MonoText(value.replace("_", "").take(6).uppercase(), color = if (selected) Accent else Muted, size = 8)
                        }
                    }
                }
            }
        }

        // Pain check
        if (showPainCheck && state.painResponse == null) {
            item {
                Column(
                    modifier = Modifier.fillMaxWidth()
                        .border(1.dp, Warning.copy(0.3f))
                        .background(Warning.copy(0.05f))
                        .padding(16.dp)
                ) {
                    MonoText("Quick check — anything feel off?", color = Warning)
                    Spacer(Modifier.height(12.dp))
                    listOf("All good" to "none", "Minor discomfort" to "minor", "Something hurt" to "hurt").forEach { (label, value) ->
                        Box(
                            modifier = Modifier.fillMaxWidth().height(48.dp)
                                .border(1.dp, Line2).background(Surface)
                                .clickable { viewModel.setPainResponse(value) }
                                .padding(horizontal = 16.dp),
                            contentAlignment = Alignment.CenterStart,
                        ) {
                            MonoText(label, color = when (value) { "hurt" -> Danger; "minor" -> Warning; else -> TextPrimary })
                        }
                        Spacer(Modifier.height(8.dp))
                    }
                }
            }
        }

        // Finish button
        if (state.reflection != null && (state.painResponse != null || !showPainCheck)) {
            item {
                UntrainedButton(
                    label = "FINISH",
                    sub = "SAVE · CONTINUE",
                    loading = state.isSaving,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = { viewModel.finishPostWorkout() },
                )
            }
        }
    }
}

@Composable
private fun RecoveryDayView(state: TodayUiState, viewModel: TodayViewModel) {
    var selected by remember { mutableStateOf<String?>(null) }
    Column(
        modifier = Modifier.fillMaxSize().padding(top = 64.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        Column {
            MonoText("TODAY", color = Muted)
            Spacer(Modifier.height(6.dp))
            Text("RECOVERY\nDAY.", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 56.sp, lineHeight = 50.sp, color = TextPrimary))
            Spacer(Modifier.height(12.dp))
            MonoText("Rest is training too.", color = Muted)
        }

        listOf(
            Triple("active_recovery", "ACTIVE RECOVERY", "Light movement, mobility, and core."),
            Triple("skill_practice", "SKILL PRACTICE", "Technique work on your weakest movement."),
            Triple("full_rest", "FULL REST", "Nothing today. Your body is rebuilding."),
        ).forEach { (key, title, desc) ->
            val sel = selected == key
            Row(
                modifier = Modifier.fillMaxWidth()
                    .border(1.dp, if (sel) Accent else Line)
                    .background(if (sel) Accent.copy(0.05f) else Surface)
                    .clickable { selected = key }
                    .padding(18.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.Top,
            ) {
                Column(Modifier.weight(1f)) {
                    MonoText(title, color = if (sel) Accent else Muted)
                    Spacer(Modifier.height(4.dp))
                    Text(desc, style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 18.sp, color = TextPrimary))
                }
                Box(
                    modifier = Modifier.size(16.dp)
                        .border(1.dp, if (sel) Accent else Line2)
                        .background(if (sel) Accent else Color.Transparent),
                    contentAlignment = Alignment.Center,
                ) {
                    if (sel) MonoText("✓", color = Background, size = 9)
                }
            }
        }

        Spacer(Modifier.weight(1f))
        UntrainedButton(
            label = if (selected == "full_rest") "REST" else if (selected != null) "BEGIN" else "SELECT AN OPTION",
            sub = if (selected == "full_rest") "TODAY" else "SESSION",
            modifier = Modifier.fillMaxWidth(),
            enabled = selected != null,
            onClick = {
                when (selected) {
                    "full_rest" -> viewModel.markFullRest()
                    else -> selected?.let { viewModel.startRecoverySession(it) }
                }
            },
        )
        Spacer(Modifier.height(16.dp))
    }
}

@Composable
private fun TopMeta(dayLabel: String, dateStr: String) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(bottom = 20.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.spacedBy(8.dp),
    ) {
        Box(Modifier.size(6.dp).background(Accent))
        MonoText("$dayLabel · $dateStr", color = Text2, size = 10)
    }
}

// Extension helpers for borders
private fun Modifier.drawTopBorder(): Modifier = this.then(
    Modifier.drawWithContent {
        drawContent()
        drawLine(color = androidx.compose.ui.graphics.Color(0xFF242424), start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(size.width, 0f), strokeWidth = 1f)
    }
)

private fun Modifier.drawStartBorder(show: Boolean): Modifier = if (!show) this else this.then(
    Modifier.drawWithContent {
        drawContent()
        drawLine(color = androidx.compose.ui.graphics.Color(0xFF242424), start = androidx.compose.ui.geometry.Offset(0f, 0f), end = androidx.compose.ui.geometry.Offset(0f, size.height), strokeWidth = 1f)
    }
)

private fun Modifier.border(start: Int, color: Color, end: Int): Modifier = this


