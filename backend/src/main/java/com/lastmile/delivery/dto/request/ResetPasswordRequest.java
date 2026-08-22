package com.lastmile.delivery.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank @Email String email,

        @NotBlank @Pattern(regexp = "\\d{6}", message = "OTP must be 6 digits") String otp,

        @NotBlank @Size(min = 8, max = 72) String newPassword) {
}