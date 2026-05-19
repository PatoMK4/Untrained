package com.untrained.app.ui.components

import androidx.compose.animation.core.LinearEasing
import androidx.compose.animation.core.animateFloat
import androidx.compose.animation.core.infiniteRepeatable
import androidx.compose.animation.core.rememberInfiniteTransition
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.ArrowForward
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.rotate
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.untrained.app.ui.theme.Accent
import com.untrained.app.ui.theme.Background
import com.untrained.app.ui.theme.Border
import com.untrained.app.ui.theme.Danger
import com.untrained.app.ui.theme.TextMuted
import com.untrained.app.ui.theme.TextPrimary

enum class ButtonVariant { PRIMARY, GHOST, DANGER }

@Composable
fun UntrainedButton(
    text: String,
    onClick: () -> Unit,
    modifier: Modifier = Modifier,
    variant: ButtonVariant = ButtonVariant.PRIMARY,
    isLoading: Boolean = false,
    enabled: Boolean = true,
    showArrow: Boolean = true,
    fullWidth: Boolean = true,
) {
    val infiniteTransition = rememberInfiniteTransition(label = "spinner")
    val rotation by infiniteTransition.animateFloat(
        initialValue = 0f,
        targetValue = 360f,
        animationSpec = infiniteRepeatable(tween(800, easing = LinearEasing)),
        label = "rotation"
    )

    val bgColor = when (variant) {
        ButtonVariant.PRIMARY -> if (enabled && !isLoading) Accent else Color(0xFF4A5500)
        ButtonVariant.GHOST -> Color.Transparent
        ButtonVariant.DANGER -> if (enabled && !isLoading) Danger else Color(0xFF661A0E)
    }

    val contentColor = when (variant) {
        ButtonVariant.PRIMARY -> Background
        ButtonVariant.GHOST -> TextPrimary
        ButtonVariant.DANGER -> Color.White
    }

    val borderColor = when (variant) {
        ButtonVariant.GHOST -> Border
        else -> Color.Transparent
    }

    val widthModifier = if (fullWidth) modifier.fillMaxWidth() else modifier

    when (variant) {
        ButtonVariant.GHOST -> OutlinedButton(
            onClick = { if (!isLoading) onClick() },
            modifier = widthModifier.height(52.dp),
            enabled = enabled && !isLoading,
            shape = RoundedCornerShape(2.dp),
            border = BorderStroke(1.dp, borderColor),
            colors = ButtonDefaults.outlinedButtonColors(
                contentColor = contentColor,
                disabledContentColor = TextMuted,
            )
        ) {
            ButtonContent(
                text = text,
                isLoading = isLoading,
                showArrow = false,
                contentColor = contentColor,
                rotation = rotation,
            )
        }

        else -> Button(
            onClick = { if (!isLoading) onClick() },
            modifier = widthModifier.height(52.dp),
            enabled = enabled && !isLoading,
            shape = RoundedCornerShape(2.dp),
            colors = ButtonDefaults.buttonColors(
                containerColor = bgColor,
                contentColor = contentColor,
                disabledContainerColor = bgColor.copy(alpha = 0.5f),
                disabledContentColor = contentColor.copy(alpha = 0.5f),
            )
        ) {
            ButtonContent(
                text = text,
                isLoading = isLoading,
                showArrow = showArrow && variant == ButtonVariant.PRIMARY,
                contentColor = contentColor,
                rotation = rotation,
            )
        }
    }
}

@Composable
private fun ButtonContent(
    text: String,
    isLoading: Boolean,
    showArrow: Boolean,
    contentColor: Color,
    rotation: Float,
) {
    if (isLoading) {
        Box(contentAlignment = Alignment.Center) {
            CircularProgressIndicator(
                modifier = Modifier.size(20.dp).rotate(rotation),
                color = contentColor,
                strokeWidth = 2.dp,
            )
        }
    } else {
        Row(verticalAlignment = Alignment.CenterVertically) {
            Text(
                text = text.uppercase(),
                fontWeight = FontWeight.Black,
                fontSize = 13.sp,
                letterSpacing = 1.6.sp,
                textAlign = TextAlign.Center,
                modifier = Modifier.weight(1f),
            )
            if (showArrow) {
                Spacer(modifier = Modifier.width(8.dp))
                Icon(
                    imageVector = Icons.Default.ArrowForward,
                    contentDescription = null,
                    modifier = Modifier.size(16.dp),
                )
            }
        }
    }
}
