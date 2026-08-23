package com.lastmile.delivery.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(BadCredentialsException.class)
    @ResponseStatus(HttpStatus.UNAUTHORIZED)
    public Map<String, String> badCredentials(BadCredentialsException exception) {
        return Map.of("error", "Incorrect password or email. Please try again.");
    }

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> badRequest(IllegalArgumentException exception) {
        return Map.of("error", exception.getMessage() != null ? exception.getMessage() : "Invalid request parameters");
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> validation(MethodArgumentNotValidException exception) {
        String message = exception.getBindingResult().getFieldError() != null
                ? exception.getBindingResult().getFieldError().getDefaultMessage()
                : "Validation failed";
        return Map.of("error", message);
    }

    @ExceptionHandler(java.util.NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> missing(java.util.NoSuchElementException exception) {
        return Map.of("error", "Resource not found");
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> denied(AccessDeniedException exception) {
        String message = (exception.getMessage() != null && !exception.getMessage().isBlank())
                ? exception.getMessage()
                : "Access denied";
        return Map.of("error", message);
    }

    @ExceptionHandler(Exception.class)
    @ResponseStatus(HttpStatus.INTERNAL_SERVER_ERROR)
    public Map<String, String> general(Exception exception) {
        return Map.of("error", exception.getMessage() != null ? exception.getMessage() : "An unexpected internal server error occurred.");
    }
}