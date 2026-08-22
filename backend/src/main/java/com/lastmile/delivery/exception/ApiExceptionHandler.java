package com.lastmile.delivery.exception;

import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

    @ExceptionHandler(IllegalArgumentException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> badRequest(
            IllegalArgumentException exception) {

        return Map.of(
                "error",
                exception.getMessage());
    }

    @ExceptionHandler(MethodArgumentNotValidException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public Map<String, String> validation(
            MethodArgumentNotValidException exception) {

        String message = exception
                .getBindingResult()
                .getFieldError() != null
                        ? exception.getBindingResult()
                                .getFieldError()
                                .getDefaultMessage()
                        : "Validation failed";

        return Map.of(
                "error",
                message);
    }

    @ExceptionHandler(java.util.NoSuchElementException.class)
    @ResponseStatus(HttpStatus.NOT_FOUND)
    public Map<String, String> missing(
            java.util.NoSuchElementException exception) {

        return Map.of(
                "error",
                "Resource not found");
    }

    @ExceptionHandler(AccessDeniedException.class)
    @ResponseStatus(HttpStatus.FORBIDDEN)
    public Map<String, String> denied(
            AccessDeniedException exception) {

        return Map.of(
                "error",
                "Access denied");
    }
}