package com.untrained.app.ui.auth

import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.BasicTextField
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.focus.FocusDirection
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.SolidColor
import androidx.compose.ui.platform.LocalFocusManager
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.input.VisualTransformation
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.untrained.app.ui.components.UntrainedButton
import com.untrained.app.ui.theme.*

@Composable
fun AuthScreen(
    viewModel: AuthViewModel,
    onAuthSuccess: () -> Unit,
    onNeedsOnboarding: () -> Unit,
) {
    val state by viewModel.state.collectAsState()
    var mode by remember { mutableStateOf(AuthMode.SIGN_IN) }
    var email by remember { mutableStateOf("") }
    var password by remember { mutableStateOf("") }
    var showReset by remember { mutableStateOf(false) }
    var resetEmail by remember { mutableStateOf("") }
    val focusManager = LocalFocusManager.current

    LaunchedEffect(state) {
        when (state) {
            is AuthState.Success -> onAuthSuccess()
            is AuthState.NeedsOnboarding -> onNeedsOnboarding()
            else -> {}
        }
    }

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Background)
            .padding(horizontal = 24.dp)
            .windowInsetsPadding(WindowInsets.statusBars)
            .windowInsetsPadding(WindowInsets.navigationBars)
    ) {
        if (showReset) {
            ResetPasswordScreen(
                email = resetEmail,
                onEmailChange = { resetEmail = it },
                onBack = { showReset = false },
                onSend = { viewModel.resetPassword(resetEmail) },
                state = state,
            )
            return@Box
        }

        Column(
            modifier = Modifier.fillMaxSize(),
            verticalArrangement = Arrangement.spacedBy(0.dp),
        ) {
            Spacer(Modifier.height(64.dp))

            // Meta row
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.SpaceBetween,
            ) {
                MonoText("● SYSTEM READY", color = Accent)
                MonoText(if (mode == AuthMode.SIGN_UP) "UT—003 · NEW" else "UT—002", color = Muted2)
            }

            Spacer(Modifier.height(16.dp))

            // Divider with serial
            Row(verticalAlignment = Alignment.CenterVertically) {
                Box(Modifier.weight(1f).height(1.dp).background(Line))
                MonoText("EST · 2026 · BUILD 1.0.0", color = Muted2, size = 9)
                Box(Modifier.weight(1f).height(1.dp).background(Line))
            }

            Spacer(Modifier.height(40.dp))

            // Hero heading
            MonoText(
                if (mode == AuthMode.SIGN_IN) "RETURNING" else "STEP 00 / 06",
                color = Muted
            )
            Spacer(Modifier.height(8.dp))
            Text(
                text = if (mode == AuthMode.SIGN_IN) "Welcome\nback." else "Make your\naccount.",
                style = TextStyle(
                    fontWeight = FontWeight.Bold,
                    fontSize = 56.sp,
                    lineHeight = 52.sp,
                    letterSpacing = (-0.5).sp,
                    color = TextPrimary,
                )
            )

            Spacer(Modifier.height(40.dp))

            // Error box
            val errorMsg = (state as? AuthState.Error)?.message
            AnimatedVisibility(errorMsg != null, enter = fadeIn(), exit = fadeOut()) {
                errorMsg?.let {
                    Box(
                        modifier = Modifier
                            .fillMaxWidth()
                            .background(Color(0x14FF4423))
                            .border(1.dp, Color(0x66FF4423))
                            .padding(12.dp)
                    ) {
                        MonoText(it, color = Danger, size = 11)
                    }
                    Spacer(Modifier.height(16.dp))
                }
            }

            // Fields
            UnderlineField(
                label = "EMAIL",
                value = email,
                onValueChange = { email = it },
                keyboardType = KeyboardType.Email,
                imeAction = ImeAction.Next,
                onImeAction = { focusManager.moveFocus(FocusDirection.Down) },
            )
            Spacer(Modifier.height(28.dp))
            UnderlineField(
                label = if (mode == AuthMode.SIGN_UP) "CREATE PASSWORD" else "PASSWORD",
                value = password,
                onValueChange = { password = it },
                keyboardType = KeyboardType.Password,
                isPassword = true,
                imeAction = ImeAction.Done,
                onImeAction = { viewModel.authenticate(email, password, mode) },
                showCaret = true,
            )

            if (mode == AuthMode.SIGN_IN) {
                Spacer(Modifier.height(8.dp))
                Box(
                    modifier = Modifier.fillMaxWidth().clickable {
                        showReset = true; resetEmail = email
                    }.padding(vertical = 12.dp),
                    contentAlignment = Alignment.CenterEnd
                ) {
                    MonoText("FORGOT?", color = Muted2)
                }
            }

            Spacer(Modifier.weight(1f))

            // Social buttons
            Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) {
                SocialButton("APPLE", Modifier.weight(1f)) { /* Apple auth */ }
                SocialButton(
                    label = if (state is AuthState.Loading) "..." else "GOOGLE",
                    modifier = Modifier.weight(1f),
                    onClick = { viewModel.signInWithGoogle() }
                )
            }
            Spacer(Modifier.height(10.dp))

            UntrainedButton(
                label = if (mode == AuthMode.SIGN_UP) "CREATE" else "CONTINUE",
                sub = "EMAIL",
                loading = state is AuthState.Loading,
                modifier = Modifier.fillMaxWidth(),
                onClick = { viewModel.authenticate(email, password, mode) },
            )
            Spacer(Modifier.height(10.dp))

            Box(
                modifier = Modifier
                    .fillMaxWidth()
                    .clickable { mode = if (mode == AuthMode.SIGN_IN) AuthMode.SIGN_UP else AuthMode.SIGN_IN }
                    .padding(vertical = 12.dp)
            ) {
                MonoText(
                    if (mode == AuthMode.SIGN_IN) "Don't have an account →" else "I already have an account →",
                    color = Muted,
                )
            }

            Spacer(Modifier.height(8.dp))
        }
    }
}

@Composable
private fun ResetPasswordScreen(
    email: String,
    onEmailChange: (String) -> Unit,
    onBack: () -> Unit,
    onSend: () -> Unit,
    state: AuthState,
) {
    Column(
        modifier = Modifier.fillMaxSize().padding(top = 64.dp),
    ) {
        Box(Modifier.clickable(onClick = onBack).padding(vertical = 12.dp)) {
            MonoText("← BACK", color = Text2)
        }
        Spacer(Modifier.height(40.dp))
        when (state) {
            is AuthState.ResetSent -> {
                Text(
                    "CHECK\nEMAIL.",
                    style = TextStyle(fontWeight = FontWeight.Black, fontSize = 48.sp, color = TextPrimary)
                )
                Spacer(Modifier.height(16.dp))
                MonoText("Link sent to ${email}.", color = Muted)
            }
            else -> {
                MonoText("RESET PASSWORD", color = Muted)
                Spacer(Modifier.height(8.dp))
                Text(
                    "FORGOT?\nNO SWEAT.",
                    style = TextStyle(fontWeight = FontWeight.Black, fontSize = 48.sp, color = TextPrimary)
                )
                Spacer(Modifier.height(40.dp))
                UnderlineField("EMAIL", email, onEmailChange, KeyboardType.Email, ImeAction.Done, { onSend() })
                Spacer(Modifier.weight(1f))
                UntrainedButton(
                    label = "SEND LINK",
                    sub = "EMAIL",
                    loading = state is AuthState.Loading,
                    modifier = Modifier.fillMaxWidth(),
                    onClick = onSend,
                )
                Spacer(Modifier.height(16.dp))
            }
        }
    }
}

@Composable
private fun UnderlineField(
    label: String,
    value: String,
    onValueChange: (String) -> Unit,
    keyboardType: KeyboardType = KeyboardType.Text,
    imeAction: ImeAction = ImeAction.Next,
    onImeAction: () -> Unit = {},
    isPassword: Boolean = false,
    showCaret: Boolean = false,
) {
    Column {
        MonoText(label, color = Muted)
        Spacer(Modifier.height(8.dp))
        Row(
            verticalAlignment = Alignment.CenterVertically,
            modifier = Modifier.fillMaxWidth()
        ) {
            BasicTextField(
                value = value,
                onValueChange = onValueChange,
                modifier = Modifier.weight(1f),
                textStyle = TextStyle(
                    color = TextPrimary,
                    fontSize = 22.sp,
                    letterSpacing = (-0.1).sp,
                ),
                cursorBrush = SolidColor(Accent),
                visualTransformation = if (isPassword) PasswordVisualTransformation() else VisualTransformation.None,
                keyboardOptions = KeyboardOptions(keyboardType = keyboardType, imeAction = imeAction),
                keyboardActions = KeyboardActions(onAny = { onImeAction() }),
                singleLine = true,
            )
            if (showCaret && value.isEmpty()) {
                Box(Modifier.width(2.dp).height(22.dp).background(Accent))
            }
        }
        Spacer(Modifier.height(10.dp))
        Box(Modifier.fillMaxWidth().height(1.dp).background(Line2))
    }
}

@Composable
private fun SocialButton(label: String, modifier: Modifier = Modifier, onClick: () -> Unit) {
    Box(
        modifier = modifier
            .height(48.dp)
            .border(1.dp, Line2)
            .clickable(onClick = onClick),
        contentAlignment = Alignment.Center,
    ) {
        Text(
            label,
            style = TextStyle(
                color = TextPrimary,
                fontWeight = FontWeight.SemiBold,
                fontSize = 16.sp,
                letterSpacing = 1.sp,
            )
        )
    }
}

@Composable
fun MonoText(
    text: String,
    color: Color = Muted,
    size: Int = 10,
    modifier: Modifier = Modifier,
) {
    Text(
        text = text,
        style = TextStyle(
            color = color,
            fontSize = size.sp,
            letterSpacing = (size * 0.16).sp,
            fontWeight = FontWeight.Normal,
        ),
        modifier = modifier,
    )
}
