package com.untrained.app.ui.onboarding

import androidx.compose.animation.AnimatedContent
import androidx.compose.animation.slideInHorizontally
import androidx.compose.animation.slideOutHorizontally
import androidx.compose.animation.togetherWith
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.untrained.app.ui.auth.MonoText
import com.untrained.app.ui.components.UntrainedButton
import com.untrained.app.ui.theme.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

data class OnboardingData(
    val goal: String = "",
    val trainingDays: Int = 3,
    val environment: String = "",
    val equipment: List<String> = emptyList(),
    val splitPreference: String = "full_body",
    val limitations: String = "",
    val pushupReps: Int = 0,
    val pushupEffort: String = "medium",
    val pullupReps: Int = 0,
    val pullupEffort: String = "medium",
    val squatReps: Int = 0,
    val squatEffort: String = "medium",
    val levelPush: Int = 1,
    val levelPull: Int = 1,
    val levelSquat: Int = 1,
    val levelHinge: Int = 1,
    val levelCore: Int = 1,
)

sealed class OnboardingState {
    object Idle : OnboardingState()
    object Loading : OnboardingState()
    object Complete : OnboardingState()
    data class Error(val message: String) : OnboardingState()
}

@HiltViewModel
class OnboardingViewModel @Inject constructor(
    private val supabase: SupabaseClient,
) : ViewModel() {

    private val _state = MutableStateFlow<OnboardingState>(OnboardingState.Idle)
    val state: StateFlow<OnboardingState> = _state.asStateFlow()

    var data by mutableStateOf(OnboardingData())
        private set

    fun updateData(update: OnboardingData.() -> OnboardingData) {
        data = data.update()
    }

    fun complete() {
        viewModelScope.launch {
            _state.value = OnboardingState.Loading
            try {
                val userId = supabase.auth.currentUserOrNull()?.id ?: throw Exception("Not authenticated")
                supabase.postgrest["user_profile"].upsert(mapOf(
                    "user_id" to userId,
                    "goal" to data.goal,
                    "training_days" to data.trainingDays,
                    "environment" to data.environment,
                    "equipment" to data.equipment,
                    "split_preference" to data.splitPreference,
                    "limitations" to data.limitations,
                    "level_push" to data.levelPush,
                    "level_pull" to data.levelPull,
                    "level_squat" to data.levelSquat,
                    "level_hinge" to data.levelHinge,
                    "level_core" to data.levelCore,
                    "onboarding_complete" to true,
                ))
                supabase.postgrest["user_score"].upsert(mapOf(
                    "user_id" to userId,
                    "total_exp" to 0, "weekly_exp" to 0,
                    "current_streak" to 0, "longest_streak" to 0,
                    "total_sessions" to 0, "total_reps" to 0,
                ))
                _state.value = OnboardingState.Complete
            } catch (e: Exception) {
                _state.value = OnboardingState.Error(e.message ?: "Failed to save")
            }
        }
    }
}

@Composable
fun OnboardingScreen(
    viewModel: OnboardingViewModel,
    onComplete: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var step by remember { mutableStateOf(0) }
    val data = viewModel.data
    val totalSteps = 11

    LaunchedEffect(state) {
        if (state is OnboardingState.Complete) onComplete()
    }

    Box(
        Modifier.fillMaxSize().background(Background).padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.statusBars).windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        Column(Modifier.fillMaxSize()) {
            Spacer(Modifier.height(32.dp))

            // Progress dots
            Row(horizontalArrangement = Arrangement.spacedBy(6.dp)) {
                repeat(totalSteps) { i ->
                    Box(
                        Modifier.size(if (i == step) 8.dp else 6.dp)
                            .background(if (i <= step) Accent else Line2)
                    )
                }
            }
            Spacer(Modifier.height(40.dp))

            AnimatedContent(
                targetState = step,
                transitionSpec = {
                    if (targetState > initialState)
                        slideInHorizontally { it } togetherWith slideOutHorizontally { -it }
                    else
                        slideInHorizontally { -it } togetherWith slideOutHorizontally { it }
                },
                label = "onboarding_step"
            ) { currentStep ->
                LazyColumn(
                    modifier = Modifier.fillMaxSize(),
                    contentPadding = PaddingValues(bottom = 120.dp),
                    verticalArrangement = Arrangement.spacedBy(24.dp),
                ) {
                    item {
                        when (currentStep) {
                            0 -> GoalStep(data.goal) { viewModel.updateData { copy(goal = it) } }
                            1 -> FrequencyStep(data.trainingDays) { viewModel.updateData { copy(trainingDays = it) } }
                            2 -> EnvironmentStep(data.environment) { viewModel.updateData { copy(environment = it) } }
                            3 -> EquipmentStep(data.equipment) { viewModel.updateData { copy(equipment = it) } }
                            4 -> SplitStep(data.splitPreference) { viewModel.updateData { copy(splitPreference = it) } }
                            5 -> LimitationsStep(data.limitations) { viewModel.updateData { copy(limitations = it) } }
                            6 -> BenchmarkIntroStep()
                            7 -> BenchmarkStep("PUSH-UP BENCHMARK", "How many push-ups can you do?", data.pushupReps, data.pushupEffort,
                                onReps = { viewModel.updateData { copy(pushupReps = it) } },
                                onEffort = { viewModel.updateData { copy(pushupEffort = it) } })
                            8 -> BenchmarkStep("PULL-UP BENCHMARK", "How many pull-ups can you do?", data.pullupReps, data.pullupEffort,
                                onReps = { viewModel.updateData { copy(pullupReps = it) } },
                                onEffort = { viewModel.updateData { copy(pullupEffort = it) } })
                            9 -> BenchmarkStep("SQUAT BENCHMARK", "How many squats can you do?", data.squatReps, data.squatEffort,
                                onReps = { viewModel.updateData { copy(squatReps = it) } },
                                onEffort = { viewModel.updateData { copy(squatEffort = it) } })
                            10 -> FitnessLevelsStep(data,
                                onUpdate = { push, pull, squat, hinge, core ->
                                    viewModel.updateData { copy(levelPush = push, levelPull = pull, levelSquat = squat, levelHinge = hinge, levelCore = core) }
                                })
                        }
                    }

                    item {
                        val isLast = currentStep == totalSteps - 1
                        UntrainedButton(
                            label = if (isLast) "FINISH" else "CONTINUE",
                            sub = "${currentStep + 1} / $totalSteps",
                            loading = state is OnboardingState.Loading,
                            modifier = Modifier.fillMaxWidth(),
                            onClick = {
                                if (isLast) viewModel.complete()
                                else step++
                            }
                        )
                    }

                    if (currentStep > 0) {
                        item {
                            Box(
                                Modifier.fillMaxWidth().clickable { step-- }.padding(vertical = 12.dp),
                                contentAlignment = Alignment.Center,
                            ) {
                                MonoText("← BACK", color = Muted)
                            }
                        }
                    }
                }
            }
        }
    }
}

@Composable
private fun GoalStep(selected: String, onSelect: (String) -> Unit) {
    StepHeader("STEP 01 / 11", "What's your\nprimary goal?")
    val goals = listOf(
        "strength" to "Build Strength",
        "muscle" to "Build Muscle",
        "endurance" to "Improve Endurance",
        "weight_loss" to "Lose Weight",
        "overall" to "Overall Fitness",
    )
    goals.forEach { (key, label) ->
        OptionCard(label, selected == key) { onSelect(key) }
    }
}

@Composable
private fun FrequencyStep(days: Int, onDays: (Int) -> Unit) {
    StepHeader("STEP 02 / 11", "How many days\nper week?")
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        (2..7).forEach { d ->
            Box(
                Modifier.size(48.dp).border(1.dp, if (days == d) Accent else Line2)
                    .background(if (days == d) Accent else Color.Transparent)
                    .clickable { onDays(d) },
                contentAlignment = Alignment.Center,
            ) {
                Text("$d", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 20.sp, color = if (days == d) Background else TextPrimary))
            }
        }
    }
}

@Composable
private fun EnvironmentStep(selected: String, onSelect: (String) -> Unit) {
    StepHeader("STEP 03 / 11", "Where do you\ntrain?")
    listOf("home" to "Home", "gym" to "Gym", "both" to "Both", "outdoors" to "Outdoors").forEach { (key, label) ->
        OptionCard(label, selected == key) { onSelect(key) }
    }
}

@Composable
private fun EquipmentStep(selected: List<String>, onToggle: (List<String>) -> Unit) {
    StepHeader("STEP 04 / 11", "What equipment\ndo you have?")
    listOf("none" to "No Equipment", "pullup_bar" to "Pull-up Bar", "rings" to "Gymnastic Rings", "gym" to "Full Gym").forEach { (key, label) ->
        val sel = key in selected
        OptionCard(label, sel) {
            onToggle(if (sel) selected - key else selected + key)
        }
    }
}

@Composable
private fun SplitStep(selected: String, onSelect: (String) -> Unit) {
    StepHeader("STEP 05 / 11", "Training\nstructure?")
    listOf(
        "full_body" to "Full Body",
        "ppl" to "Push / Pull / Legs",
        "upper_lower" to "Upper / Lower",
        "bro_split" to "Bro Split",
    ).forEach { (key, label) ->
        OptionCard(label, selected == key) { onSelect(key) }
    }
}

@Composable
private fun LimitationsStep(value: String, onChange: (String) -> Unit) {
    StepHeader("STEP 06 / 11", "Any limitations\nor injuries?")
    MonoText("Optional — skip if none.", color = Muted)
    Spacer(Modifier.height(16.dp))
    Column(Modifier.fillMaxWidth().border(1.dp, Line2).padding(16.dp)) {
        BasicTextField(
            value = value,
            onValueChange = onChange,
            modifier = Modifier.fillMaxWidth().heightIn(min = 80.dp),
            textStyle = TextStyle(color = TextPrimary, fontSize = 16.sp),
            cursorBrush = SolidColor(Accent),
            decorationBox = { inner ->
                if (value.isEmpty()) MonoText("e.g. bad knee, shoulder issue", color = Muted)
                inner()
            }
        )
    }
}

@Composable
private fun BenchmarkIntroStep() {
    StepHeader("STEP 07 / 11", "Benchmark\ntests.")
    MonoText("We'll test 3 movements to set your starting levels.", color = Muted)
    Spacer(Modifier.height(16.dp))
    Column(Modifier.fillMaxWidth().border(1.dp, Accent.copy(0.3f)).background(Accent.copy(0.04f)).padding(16.dp), verticalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("Push-up", "Pull-up", "Squat").forEach { ex ->
            Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                Box(Modifier.size(6.dp).background(Accent))
                MonoText(ex, color = TextPrimary, size = 12)
            }
        }
    }
    Spacer(Modifier.height(8.dp))
    MonoText("Do as many as you can with good form. Rate how hard it felt.", color = Muted)
}

@Composable
private fun BenchmarkStep(
    stepLabel: String,
    question: String,
    reps: Int,
    effort: String,
    onReps: (Int) -> Unit,
    onEffort: (String) -> Unit,
) {
    StepHeader(stepLabel, question)
    // Reps stepper
    Row(verticalAlignment = Alignment.CenterVertically, horizontalArrangement = Arrangement.spacedBy(24.dp)) {
        Box(Modifier.size(44.dp).border(1.dp, Line2).clickable { if (reps > 0) onReps(reps - 1) }, contentAlignment = Alignment.Center) {
            Text("−", style = TextStyle(fontSize = 24.sp, color = TextPrimary, fontWeight = FontWeight.Bold))
        }
        Text("$reps", style = TextStyle(fontWeight = FontWeight.Black, fontSize = 64.sp, color = TextPrimary))
        Box(Modifier.size(44.dp).border(1.dp, Line2).clickable { onReps(reps + 1) }, contentAlignment = Alignment.Center) {
            Text("+", style = TextStyle(fontSize = 24.sp, color = TextPrimary, fontWeight = FontWeight.Bold))
        }
    }
    Spacer(Modifier.height(16.dp))
    MonoText("HOW DID IT FEEL?", color = Muted)
    Spacer(Modifier.height(8.dp))
    Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
        listOf("easy", "medium", "hard").forEach { e ->
            Box(
                Modifier.weight(1f).height(44.dp)
                    .border(1.dp, if (effort == e) Accent else Line2)
                    .background(if (effort == e) Accent.copy(0.1f) else Color.Transparent)
                    .clickable { onEffort(e) },
                contentAlignment = Alignment.Center,
            ) {
                MonoText(e.uppercase(), color = if (effort == e) Accent else Muted)
            }
        }
    }
}

@Composable
private fun FitnessLevelsStep(
    data: OnboardingData,
    onUpdate: (Int, Int, Int, Int, Int) -> Unit,
) {
    var push by remember { mutableStateOf(data.levelPush) }
    var pull by remember { mutableStateOf(data.levelPull) }
    var squat by remember { mutableStateOf(data.levelSquat) }
    var hinge by remember { mutableStateOf(data.levelHinge) }
    var core by remember { mutableStateOf(data.levelCore) }

    LaunchedEffect(push, pull, squat, hinge, core) {
        onUpdate(push, pull, squat, hinge, core)
    }

    StepHeader("STEP 11 / 11", "Your starting\nlevels.")
    MonoText("1 = beginner, 4 = advanced", color = Muted)
    Spacer(Modifier.height(16.dp))
    listOf(
        "PUSH" to push to { v: Int -> push = v },
        "PULL" to pull to { v: Int -> pull = v },
        "SQUAT" to squat to { v: Int -> squat = v },
        "HINGE" to hinge to { v: Int -> hinge = v },
        "CORE" to core to { v: Int -> core = v },
    ).forEach { (pair, setter) ->
        val (label, value) = pair
        Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween, verticalAlignment = Alignment.CenterVertically) {
            MonoText(label, color = TextPrimary, size = 12)
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                (1..4).forEach { level ->
                    Box(
                        Modifier.size(36.dp).border(1.dp, if (value == level) Accent else Line2)
                            .background(if (value == level) Accent else Color.Transparent)
                            .clickable { setter(level) },
                        contentAlignment = Alignment.Center,
                    ) {
                        Text("$level", style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 14.sp, color = if (value == level) Background else TextPrimary))
                    }
                }
            }
        }
    }
}

@Composable
private fun StepHeader(stepLabel: String, title: String) {
    Column {
        MonoText(stepLabel, color = Muted)
        Spacer(Modifier.height(8.dp))
        Text(title, style = TextStyle(fontWeight = FontWeight.Bold, fontSize = 48.sp, lineHeight = 44.sp, color = TextPrimary))
    }
}

@Composable
private fun OptionCard(label: String, selected: Boolean, onClick: () -> Unit) {
    Row(
        Modifier.fillMaxWidth().height(56.dp)
            .border(1.dp, if (selected) Accent else Line)
            .background(if (selected) Accent.copy(0.05f) else Surface)
            .clickable(onClick = onClick)
            .padding(horizontal = 18.dp),
        verticalAlignment = Alignment.CenterVertically,
        horizontalArrangement = Arrangement.SpaceBetween,
    ) {
        Text(label, style = TextStyle(fontWeight = FontWeight.SemiBold, fontSize = 20.sp, color = TextPrimary))
        if (selected) Box(Modifier.size(8.dp).background(Accent))
    }
}
