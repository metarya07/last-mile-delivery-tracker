package com.lastmile.delivery.config;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

import com.lastmile.delivery.security.JwtAuthenticationFilter;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

        private final JwtAuthenticationFilter jwtAuthenticationFilter;
        private final String allowedOrigin;

        public SecurityConfig(
                        JwtAuthenticationFilter jwtAuthenticationFilter,
                        @Value("${app.cors.allowed-origin}") String allowedOrigin) {

                this.jwtAuthenticationFilter = jwtAuthenticationFilter;
                this.allowedOrigin = allowedOrigin;
        }

        @Bean
        public PasswordEncoder passwordEncoder() {
                return new BCryptPasswordEncoder();
        }

        @Bean
        public SecurityFilterChain securityFilterChain(
                        HttpSecurity http) throws Exception {

                http
                                .csrf(csrf -> csrf.disable())

                                .cors(cors -> cors.configurationSource(
                                                corsConfigurationSource()))

                                .sessionManagement(session -> session.sessionCreationPolicy(
                                                SessionCreationPolicy.STATELESS))

                                .authorizeHttpRequests(auth -> auth

                                                // Public authentication endpoints
                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/api/auth/login",
                                                                "/api/auth/register",
                                                                "/api/auth/forgot-password",
                                                                "/api/auth/verify-otp",
                                                                "/api/auth/reset-password")
                                                .permitAll()

                                                // Temporary SMS testing endpoint
                                                .requestMatchers(
                                                                HttpMethod.POST,
                                                                "/api/test/sms")
                                                .permitAll()

                                                // CORS preflight
                                                .requestMatchers(
                                                                HttpMethod.OPTIONS,
                                                                "/**")
                                                .permitAll()

                                                // Error endpoint
                                                .requestMatchers("/error")
                                                .permitAll()

                                                // Everything else requires authentication
                                                .anyRequest()
                                                .authenticated())

                                .exceptionHandling(exception -> exception.authenticationEntryPoint(
                                                (request, response, authException) -> response.sendError(
                                                                HttpStatus.UNAUTHORIZED.value())))

                                .addFilterBefore(
                                                jwtAuthenticationFilter,
                                                UsernamePasswordAuthenticationFilter.class);

                return http.build();
        }

        @Bean
        public CorsConfigurationSource corsConfigurationSource() {

                CorsConfiguration configuration = new CorsConfiguration();

                configuration.setAllowedOrigins(
                                List.of(allowedOrigin));

                configuration.setAllowedMethods(
                                List.of(
                                                "GET",
                                                "POST",
                                                "PUT",
                                                "PATCH",
                                                "DELETE",
                                                "OPTIONS"));

                configuration.setAllowedHeaders(
                                List.of(
                                                "Authorization",
                                                "Content-Type"));

                UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();

                source.registerCorsConfiguration(
                                "/**",
                                configuration);

                return source;
        }
}