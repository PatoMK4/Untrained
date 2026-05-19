package com.untrained.app.ui.today

import androidx.compose.animation.*
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
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
import com.untrained.app.ui.auth.MonoText
import com.untrained.app.ui.components.UntrainedButton
import com.untrained.app.ui.theme.*
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch

@Composable
fun ActiveSessionScreen(state: TodayUiState, viewModel: TodayViewModel) {
    val exercise = state.exercises.getOrNull(state.currentExerciseIndex)

    if (exercise == null) {
        Box(Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
            Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(24.dp)) {
                Text("ALL DONE.", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 48.sp, color = TextPrimary))
                UntrainedButton("END SESSION", sub = "", modifier = Modifier.fillMaxWidth(), onClick = { viewModel.endSession() })
            }
        }
        return
    }

    val currentLogs = state.logs.filter { it.exerciseId == exercise.id }
    val sectionLabel = when {
        exercise.isWarmup  -> "WARM-UP"
        exercise.isCooldown -> "COOL-DOWN"
        else -> "MAIN"
    }

    LazyColumn(
        modifier = Modifier.fillMaxSize().background(Background),
        contentPadding = PaddingValues(top = 16.dp, bottom = 120.dp),
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {

        // Top bar
        item {
            Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
                Row(
                    modifier = Modifier.clickable { if (state.isPaused) viewModel.resumeSession() else viewModel.pauseSession() }.padding(4.dp),
                    horizontalArrangement = Arrangement.spacedBy(6.dp),
                    verticalAlignment = Alignment.CenterVertically,
                ) {
                    Row(horizontalArrangement = Arrangement.spacedBy(3.dp)) {
                        Box(Modifier.width(3.dp).height(14.dp).background(Muted))
                        Box(Modifier.width(3.dp).height(14.dp).background(Muted))
                    }
                    MonoText(if (state.isPaused) "RESUME" else "PAUSE", color = Text2)
                }
                Row(horizontalArrangement = Arrangement.spacedBy(8.dp), verticalAlignment = Alignment.CenterVertically) {
                    BlinkingDot(color = Danger)
                    MonoText("REC · $sectionLabel", color = Danger)
                }
            }
        }

        // Progress bars
        item {
            Column(verticalArrangement = Arrangement.spacedBy(6.dp)) {
                Row(horizontalArrangement = Arrangement.spacedBy(4.dp)) {
                    state.exercises.forEachIndexed { i, _ ->
                        Box(
                            Modifier.weight(1f).height(3.dp)
                                .background(if (i <= state.currentExerciseIndex) Accent else Line2)
                        )
                    }
                }
                Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) {
                    MonoText("LIFT ${String.format("%02d", state.currentExerciseIndex + 1)} / ${String.format("%02d", state.exercises.size)}", color = Accent)
                    MonoText("${state.elapsedSeconds / 60}:${String.format("%02d", state.elapsedSeconds % 60)} ELAPSED", color = Muted)
                }
            }
        }

        // Exercise name
        item {
            Column {
                MonoText("NEXT UP", color = Muted)
                Spacer(Modifier.height(6.dp))
                Text(
                    "${exercise.name.uppercase()}.",
                    style = TextStyle(fontWeight = FontWeight.Black, fontSize = 48.sp, lineHeight = 44.sp, color = TextPrimary),
                )
            }
        }

        // Paused state
        if (state.isPaused) {
            item {
                Box(Modifier.fillMaxWidth().padding(vertical = 48.dp), contentAlignment = Alignment.Center) {
                    Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(12.dp)) {
                        Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                            Box(Modifier.width(6.dp).height(20.dp).background(Text2))
                            Box(Modifier.width(6.dp).height(20.dp).background(Text2))
                        }
                        MonoText("PAUSED", color = Text2)
                    }
                }
            }
        } else if (state.showRestTimer) {
            item {
                RestTimerSection(
                    seconds = state.restSeconds,
                    total = state.restTotal,
                    onSkip = { viewModel.dismissRestTimer() },
                    onComplete = { viewModel.onRestComplete() },
                )
            }
            val nextEx = state.exercises.getOrNull(state.currentExerciseIndex + 1)
            if (nextEx != null) {
                item {
                    Row(
                        Modifier.fillMaxWidth().border(1.dp, Line).background(Surface).padding(16.dp),
                        horizontalArrangement = Arrangement.SpaceBetween,
                        verticalAlignment = Alignment.CenterVertically,
                    ) {
                        Column {
                            MonoText("UP NEXT", color = Accent)
                            Spacer(Modifier.height(4.dp))
                            Text(nextEx.name.uppercase(), style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 22.sp, color = TextPrimary))
                        }
                        MonoText("›", color = Muted, size = 16)
                    }
                }
            }
        } else {
            // Set plan grid
            item {
                SetPlanGrid(state, currentLogs)
            }

            // Set logger
            item {
                SetLoggerSection(
                    setNumber = state.currentSetNumber,
                    totalSets = state.totalSets,
                    exercise = exercise,
                    onLog = { reps, duration, effort, weight -> viewModel.logSet(reps, duration, effort, weight) },
                )
            }
        }

        // Stats row
        item {
            Row(Modifier.fillMaxWidth().border(1.dp, Line)) {
                listOf("KCAL" to "~${state.elapsedSeconds / 8}", "TIME" to "${state.elapsedSeconds / 60}:${String.format("%02d", state.elapsedSeconds % 60)}", "SETS" to "${currentLogs.size}/${state.totalSets}").forEachIndexed { i, (k, v) ->
                    Column(
                        Modifier.weight(1f)
                            .then(if (i > 0) Modifier.drawStartBorderStat() else Modifier)
                            .padding(12.dp)
                    ) {
                        MonoText(k, color = Muted, size = 9)
                        Spacer(Modifier.height(4.dp))
                        Text(v, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp, color = TextPrimary))
                    }
                }
            }
        }

        // Controls
        item {
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                listOf("UNDO" to { viewModel.undoLastSet() }, "SKIP" to { viewModel.skipExercise() }).forEach { (label, action) ->
                    Box(
                        modifier = Modifier.weight(1f).height(48.dp)
                            .border(1.dp, Line).background(Surface)
                            .clickable(onClick = action),
                        contentAlignment = Alignment.Center,
                    ) {
                        MonoText(label, color = Text2)
                    }
                }
            }
        }
    }
}

@Composable
private fun SetPlanGrid(state: TodayUiState, currentLogs: List<SetLog>) {
    val exercise = state.exercises.getOrNull(state.currentExerciseIndex) ?: return
    Column {
        MonoText("SET PLAN", color = Muted)
        Spacer(Modifier.height(8.dp))
        Column(Modifier.border(1.dp, Line)) {
            // Header
            Row {
                listOf("SET", "TARGET", "LOAD", "PREV").forEach { h ->
                    Box(Modifier.weight(if (h == "SET") 0.5f else 1f).padding(10.dp)) {
                        MonoText(h, color = Muted, size = 9)
                    }
                }
            }
            Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            // Rows
            (1..state.totalSets).forEach { setNum ->
                val done = setNum < state.currentSetNumber
                val active = setNum == state.currentSetNumber
                val log = currentLogs.find { it.setNumber == setNum }
                Row(Modifier.fillMaxWidth()) {
                    Box(Modifier.weight(0.5f).padding(12.dp)) {
                        MonoText(String.format("%02d", setNum), color = if (active) Accent else Muted)
                    }
                    Box(Modifier.weight(1f).padding(12.dp)) {
                        Text(
                            "${exercise.targetRepsMin ?: "—"}–${exercise.targetRepsMax ?: "—"}",
                            style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = if (done) Accent else if (active) TextPrimary else Muted2)
                        )
                    }
                    Box(Modifier.weight(1f).padding(12.dp)) {
                        Text(
                            if (log?.extraWeightKg != null && log.extraWeightKg > 0) "${log.extraWeightKg} KG" else "BW",
                            style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 16.sp, color = Accent)
                        )
                    }
                    Box(Modifier.weight(1f).padding(12.dp)) {
                        MonoText(log?.reps?.toString() ?: "—", color = Muted)
                    }
                }
                if (setNum < state.totalSets) Box(Modifier.fillMaxWidth().height(1.dp).background(Line))
            }
        }
    }
}

@Composable
private fun SetLoggerSection(
    setNumber: Int,
    totalSets: Int,
    exercise: com.untrained.app.data.local.CachedExerciseEntity,
    onLog: (Int?, Int?, String, Float?) -> Unit,
) {
    var reps by remember(setNumber) { mutableStateOf(exercise.targetRepsMin ?: 8) }
    var effort by remember(setNumber) { mutableStateOf("medium") }
    var weight by remember(setNumber) { mutableStateOf(0f) }

    Column(verticalArrangement = Arrangement.spacedBy(16.dp)) {
        MonoText("SET $setNumber / $totalSets", color = Muted)

        // Reps stepper
        if (exercise.targetDurationSeconds == null) {
            Row(
                Modifier.fillMaxWidth().border(1.dp, Line).padding(16.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically,
            ) {
                Box(
                    Modifier.size(44.dp).border(1.dp, Line2).clickable { if (reps > 0) reps-- },
                    contentAlignment = Alignment.Center
                ) {
                    Text("−", style = TextStyle(fontSize = 24.sp, color = TextPrimary, fontWeight = FontWeight.Bold))
                }
                Text("$reps", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 56.sp, color = TextPrimary))
                Box(
                    Modifier.size(44.dp).border(1.dp, Line2).clickable { reps++ },
                    contentAlignment = Alignment.Center
                ) {
                    Text("+", style = TextStyle(fontSize = 24.sp, color = TextPrimary, fontWeight = FontWeight.Bold))
                }
            }
        }

        // Effort buttons
        Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
            listOf("easy" to Success, "medium" to Accent, "hard" to Warning).forEach { (e, color) ->
                Box(
                    modifier = Modifier.weight(1f).height(44.dp)
                        .border(1.dp, if (effort == e) color else Line2)
                        .background(if (effort == e) color.copy(0.1f) else Color.Transparent)
                        .clickable { effort = e },
                    contentAlignment = Alignment.Center,
                ) {
                    MonoText(e.uppercase(), color = if (effort == e) color else Muted)
                }
            }
        }

        // Weight row
        Row(
            Modifier.fillMaxWidth().border(1.dp, Line).padding(12.dp),
            horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically
        ) {
            MonoText("EXTRA WEIGHT", color = Muted)
            Row(horizontalArrangement = Arrangement.spacedBy(12.dp), verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.size(32.dp).border(1.dp, Line2).clickable { if (weight >= 2.5f) weight -= 2.5f }, contentAlignment = Alignment.Center) {
                    Text("−", style = TextStyle(color = TextPrimary, fontSize = 18.sp))
                }
                Text(
                    if (weight > 0) "${weight}KG" else "BW",
                    style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Accent)
                )
                Box(Modifier.size(32.dp).border(1.dp, Line2).clickable { weight += 2.5f }, contentAlignment = Alignment.Center) {
                    Text("+", style = TextStyle(color = TextPrimary, fontSize = 18.sp))
                }
            }
        }

        UntrainedButton(
            label = "LOG SET",
            sub = "→",
            modifier = Modifier.fillMaxWidth(),
            onClick = {
                if (exercise.targetDurationSeconds != null) onLog(null, exercise.targetDurationSeconds, effort, weight.takeIf { it > 0 })
                else onLog(reps, null, effort, weight.takeIf { it > 0 })
            }
        )
    }
}

@Composable
private fun RestTimerSection(seconds: Int, total: Int, onSkip: () -> Unit, onComplete: () -> Unit) {
    var remaining by remember(seconds) { mutableStateOf(seconds) }
    val scope = rememberCoroutineScope()

    LaunchedEffect(seconds) {
        remaining = seconds
        while (remaining > 0) {
            delay(1000)
            remaining--
        }
        onComplete()
    }

    val warming = remaining <= 5
    val mm = remaining / 60
    val ss = String.format("%02d", remaining % 60)
    val barPct = if (total > 0) remaining.toFloat() / total else 0f

    Column(
        modifier = Modifier.fillMaxWidth().padding(vertical = 24.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.spacedBy(20.dp),
    ) {
        MonoText(if (warming) "● REST ENDING" else "● REST", color = if (warming) Accent else Warning)

        Text(
            "$mm:$ss",
            style = TextStyle(
                fontWeight = FontWeight.Black,
                fontSize = 120.sp,
                lineHeight = 108.sp,
                letterSpacing = (-2).sp,
                color = if (warming) Accent else TextPrimary,
            )
        )

        // Progress bar
        Box(Modifier.fillMaxWidth(0.8f).height(2.dp).background(Line2)) {
            Box(
                Modifier.fillMaxWidth(barPct).fillMaxHeight()
                    .background(if (warming) Accent else Warning)
            )
        }

        Box(
            Modifier.border(1.dp, Line2).padding(horizontal = 16.dp, vertical = 10.dp)
                .clickable(onClick = onSkip)
        ) {
            MonoText("SKIP →", color = Text2)
        }
    }
}

@Composable
private fun BlinkingDot(color: Color) {
    var visible by remember { mutableStateOf(true) }
    LaunchedEffect(Unit) {
        while (true) {
            delay(700)
            visible = !visible
        }
    }
    Box(
        Modifier.size(6.dp)
            .background(if (visible) color else Color.Transparent)
    )
}

private fun Modifier.drawStartBorderStat(): Modifier = this.then(
    Modifier.drawWithContent {
        drawContent()
        drawLine(
            color = androidx.compose.ui.graphics.Color(0xFF242424),
            start = androidx.compose.ui.geometry.Offset(0f, 0f),
            end = androidx.compose.ui.geometry.Offset(0f, size.height),
            strokeWidth = 1f,
        )
    }
)
