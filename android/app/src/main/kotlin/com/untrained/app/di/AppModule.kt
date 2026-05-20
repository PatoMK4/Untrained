package com.untrained.app.di

import android.content.Context
import androidx.room.Room
import com.untrained.app.BuildConfig
import com.untrained.app.data.local.AppDatabase
import com.untrained.app.data.local.CachedExerciseDao
import com.untrained.app.data.local.ExerciseLogDao
import com.untrained.app.data.local.WorkoutSessionDao
import com.untrained.app.data.remote.AnthropicApi
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.realtime.Realtime
import io.github.jan.supabase.SupabaseClient
import okhttp3.Interceptor
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
object AppModule {

    // ─────────────────────────────────────────────────────────────────
    // Supabase
    // ─────────────────────────────────────────────────────────────────

    @Provides
    @Singleton
    fun provideSupabaseClient(): SupabaseClient = createSupabaseClient(
        supabaseUrl = BuildConfig.SUPABASE_URL,
        supabaseKey = BuildConfig.SUPABASE_ANON_KEY
    ) {
        install(Auth)
        install(Postgrest)
        install(Realtime)
    }

    // ─────────────────────────────────────────────────────────────────
    // Anthropic / Retrofit
    // ─────────────────────────────────────────────────────────────────

    @Provides
    @Singleton
    fun provideAnthropicOkHttpClient(): OkHttpClient {
        val apiKeyInterceptor = Interceptor { chain ->
            val request = chain.request().newBuilder()
                .addHeader("x-api-key", BuildConfig.ANTHROPIC_KEY)
                .addHeader("anthropic-version", "2023-06-01")
                .addHeader("content-type", "application/json")
                .build()
            chain.proceed(request)
        }
        val loggingInterceptor = HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
        return OkHttpClient.Builder()
            .addInterceptor(apiKeyInterceptor)
            .addInterceptor(loggingInterceptor)
            .build()
    }

    @Provides
    @Singleton
    fun provideAnthropicRetrofit(okHttpClient: OkHttpClient): Retrofit =
        Retrofit.Builder()
            .baseUrl("https://api.anthropic.com/")
            .client(okHttpClient)
            .addConverterFactory(GsonConverterFactory.create())
            .build()

    @Provides
    @Singleton
    fun provideAnthropicApi(retrofit: Retrofit): AnthropicApi =
        retrofit.create(AnthropicApi::class.java)

    // ─────────────────────────────────────────────────────────────────
    // Room
    // ─────────────────────────────────────────────────────────────────

    @Provides
    @Singleton
    fun provideAppDatabase(@ApplicationContext context: Context): AppDatabase =
        Room.databaseBuilder(
            context,
            AppDatabase::class.java,
            AppDatabase.DATABASE_NAME
        )
            .fallbackToDestructiveMigration()
            .build()

    @Provides
    @Singleton
    fun provideWorkoutSessionDao(db: AppDatabase): WorkoutSessionDao =
        db.workoutSessionDao()

    @Provides
    @Singleton
    fun provideExerciseLogDao(db: AppDatabase): ExerciseLogDao =
        db.exerciseLogDao()

    @Provides
    @Singleton
    fun provideCachedExerciseDao(db: AppDatabase): CachedExerciseDao =
        db.cachedExerciseDao()
}
