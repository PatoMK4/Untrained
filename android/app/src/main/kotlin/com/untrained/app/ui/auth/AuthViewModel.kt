package com.untrained.app.ui.auth

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import dagger.hilt.android.lifecycle.HiltViewModel
import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.Google
import io.github.jan.supabase.auth.providers.builtin.Email
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

enum class AuthMode { SIGN_IN, SIGN_UP }

sealed class AuthState {
    object Idle : AuthState()
    object Loading : AuthState()
    object Success : AuthState()
    object NeedsOnboarding : AuthState()
    object CheckEmail : AuthState()
    object ResetSent : AuthState()
    data class Error(val message: String) : AuthState()
}

@HiltViewModel
class AuthViewModel @Inject constructor(
    private val supabase: SupabaseClient,
) : ViewModel() {

    private val _state = MutableStateFlow<AuthState>(AuthState.Idle)
    val state: StateFlow<AuthState> = _state.asStateFlow()

    fun signIn(email: String, password: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.signInWith(Email) {
                    this.email = email.trim()
                    this.password = password
                }
                _state.value = AuthState.Success
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Sign in failed")
            }
        }
    }

    fun signUp(email: String, password: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.signUpWith(Email) {
                    this.email = email.trim()
                    this.password = password
                }
                // Supabase sends a confirmation email; show pending state
                _state.value = AuthState.CheckEmail
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Sign up failed")
            }
        }
    }

    fun authenticate(email: String, password: String, mode: AuthMode) {
        if (mode == AuthMode.SIGN_IN) signIn(email, password) else signUp(email, password)
    }

    fun signInWithGoogle() {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.signInWith(Google)
                _state.value = AuthState.Success
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Google sign-in failed")
            }
        }
    }

    fun resetPassword(email: String) {
        viewModelScope.launch {
            _state.value = AuthState.Loading
            try {
                supabase.auth.resetPasswordForEmail(email.trim())
                _state.value = AuthState.ResetSent
            } catch (e: Exception) {
                _state.value = AuthState.Error(e.message ?: "Password reset failed")
            }
        }
    }

    fun clearError() {
        if (_state.value is AuthState.Error) {
            _state.value = AuthState.Idle
        }
    }

    fun resetToIdle() {
        _state.value = AuthState.Idle
    }
}
