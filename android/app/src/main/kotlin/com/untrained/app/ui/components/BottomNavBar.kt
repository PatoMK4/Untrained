package com.untrained.app.ui.components

import androidx.compose.foundation.background
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.selection.selectable
import androidx.compose.foundation.selection.selectableGroup
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.BarChart
import androidx.compose.material.icons.filled.Person
import androidx.compose.material.icons.outlined.BarChart
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material3.Icon
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.drawBehind
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.untrained.app.ui.theme.Accent
import com.untrained.app.ui.theme.Background
import com.untrained.app.ui.theme.Border
import com.untrained.app.ui.theme.TabInactive

// Custom bolt icon drawn via path — approximated with available icon
import androidx.compose.material.icons.filled.FlashOn
import androidx.compose.material.icons.outlined.FlashOn

enum class MainTab { TODAY, PROGRESS, PROFILE }

data class TabItem(
    val tab: MainTab,
    val label: String,
    val selectedIcon: ImageVector,
    val unselectedIcon: ImageVector,
)

private val tabs = listOf(
    TabItem(MainTab.TODAY, "TODAY", Icons.Filled.FlashOn, Icons.Outlined.FlashOn),
    TabItem(MainTab.PROGRESS, "PROGRESS", Icons.Filled.BarChart, Icons.Outlined.BarChart),
    TabItem(MainTab.PROFILE, "PROFILE", Icons.Filled.Person, Icons.Outlined.Person),
)

@Composable
fun BottomNavBar(
    selectedTab: MainTab,
    onTabSelected: (MainTab) -> Unit,
    modifier: Modifier = Modifier,
) {
    val borderColor = Border

    Row(
        modifier = modifier
            .fillMaxWidth()
            .background(Background)
            .drawBehind {
                drawLine(
                    color = borderColor,
                    start = Offset(0f, 0f),
                    end = Offset(size.width, 0f),
                    strokeWidth = 1.dp.toPx(),
                )
            }
            .selectableGroup()
            .padding(vertical = 8.dp),
        horizontalArrangement = Arrangement.SpaceEvenly,
    ) {
        tabs.forEach { item ->
            val isSelected = item.tab == selectedTab
            val color = if (isSelected) Accent else TabInactive

            Column(
                modifier = Modifier
                    .weight(1f)
                    .selectable(
                        selected = isSelected,
                        onClick = { onTabSelected(item.tab) },
                        role = Role.Tab,
                    )
                    .padding(vertical = 4.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center,
            ) {
                Icon(
                    imageVector = if (isSelected) item.selectedIcon else item.unselectedIcon,
                    contentDescription = item.label,
                    modifier = Modifier.size(22.dp),
                    tint = color,
                )
                Spacer(modifier = Modifier.height(3.dp))
                Text(
                    text = item.label,
                    color = color,
                    fontSize = 8.sp,
                    fontFamily = FontFamily.Monospace,
                    fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Normal,
                    letterSpacing = 1.2.sp,
                )
            }
        }
    }
}
