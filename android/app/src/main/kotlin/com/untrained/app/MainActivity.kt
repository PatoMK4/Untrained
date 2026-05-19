package com.untrained.app

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.AnimatedContentTransitionScope
import androidx.compose.animation.core.tween
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Scaffold
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.collectAsState
import androidx.compose.runtime.getValue
import androidx.compose.ui.Modifier
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.navigation.NavGraph.Companion.findStartDestination
import androidx.navigation.NavHostController
import androidx.navigation.compose.NavHost
import androidx.navigation.compose.composable
import androidx.navigation.compose.currentBackStackEntryAsState
import androidx.navigation.compose.rememberNavController
import com.untrained.app.ui.auth.AuthScreen
import com.untrained.app.ui.auth.AuthViewModel
import com.untrained.app.ui.components.BottomNavBar
import com.untrained.app.ui.onboarding.OnboardingScreen
import com.untrained.app.ui.profile.ProfileScreen
import com.untrained.app.ui.progress.ProgressScreen
import com.untrained.app.ui.theme.UntrainedTheme
import com.untrained.app.ui.today.TodayScreen
import dagger.hilt.android.AndroidEntryPoint
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.status.SessionStatus
import javax.inject.Inject

@AndroidEntryPoint
class MainActivity : ComponentActivity() {

    @Inject
    lateinit var supabase: SupabaseClient

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            UntrainedTheme {
                UntrainedApp(supabase)
            }
        }
    }
}

@Composable
fun UntrainedApp(supabase: SupabaseClient) {
    val navController = rememberNavController()
    val sessionStatus by supabase.auth.sessionStatus.collectAsState()

    // Route based on auth state
    LaunchedEffect(sessionStatus) {
        when (sessionStatus) {
            is SessionStatus.Authenticated -> {
                val dest = navController.currentBackStackEntry?.destination?.route
                if (dest == "auth" || dest == null) {
                    navController.navigate("today") {
                        popUpTo("auth") { inclusive = true }
                    }
                }
            }
            is SessionStatus.NotAuthenticated -> {
                val dest = navController.currentBackStackEntry?.destination?.route
                if (dest != "auth") {
                    navController.navigate("auth") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            }
            else -> {}
        }
    }

    val currentRoute = navController.currentBackStackEntryAsState().value?.destination?.route
    val showBottomBar = currentRoute in listOf("today", "progress", "profile")

    Scaffold(
        modifier = Modifier.fillMaxSize(),
        bottomBar = {
            if (showBottomBar) {
                BottomNavBar(
                    currentRoute = currentRoute ?: "today",
                    onNavigate = { route ->
                        navController.navigate(route) {
                            popUpTo(navController.graph.findStartDestination().id) { saveState = true }
                            launchSingleTop = true
                            restoreState = true
                        }
                    }
                )
            }
        }
    ) { innerPadding ->
        AppNavHost(
            navController = navController,
            modifier = Modifier.padding(innerPadding)
        )
    }
}

@Composable
fun AppNavHost(
    navController: NavHostController,
    modifier: Modifier = Modifier,
) {
    NavHost(
        navController = navController,
        startDestination = "auth",
        modifier = modifier,
        enterTransition = { slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(200)) },
        exitTransition  = { slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Left, tween(200)) },
        popEnterTransition = { slideIntoContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(200)) },
        popExitTransition  = { slideOutOfContainer(AnimatedContentTransitionScope.SlideDirection.Right, tween(200)) },
    ) {
        composable("auth") {
            AuthScreen(
                viewModel = hiltViewModel(),
                onAuthSuccess = {
                    navController.navigate("today") {
                        popUpTo("auth") { inclusive = true }
                    }
                },
                onNeedsOnboarding = {
                    navController.navigate("onboarding") {
                        popUpTo("auth") { inclusive = true }
                    }
                }
            )
        }

        composable("onboarding") {
            OnboardingScreen(
                viewModel = hiltViewModel(),
                onComplete = {
                    navController.navigate("today") {
                        popUpTo("onboarding") { inclusive = true }
                    }
                }
            )
        }

        composable("today") {
            TodayScreen(viewModel = hiltViewModel())
        }

        composable("progress") {
            ProgressScreen(viewModel = hiltViewModel())
        }

        composable("profile") {
            ProfileScreen(
                viewModel = hiltViewModel(),
                onSignedOut = {
                    navController.navigate("auth") {
                        popUpTo(0) { inclusive = true }
                    }
                }
            )
        }
    }
}
