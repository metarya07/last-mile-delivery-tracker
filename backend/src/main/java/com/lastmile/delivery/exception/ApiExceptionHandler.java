package com.lastmile.delivery.exception;

import org.springframework.http.*;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.*;
import java.util.Map;

@RestControllerAdvice
public class ApiExceptionHandler {
    @ExceptionHandler(IllegalArgumentException.class) @ResponseStatus(HttpStatus.BAD_REQUEST) Map<String,String> badRequest(IllegalArgumentException e) { return Map.of("error", e.getMessage()); }
    @ExceptionHandler(MethodArgumentNotValidException.class) @ResponseStatus(HttpStatus.BAD_REQUEST) Map<String,String> validation(MethodArgumentNotValidException e) { return Map.of("error", e.getBindingResult().getFieldError().getDefaultMessage()); }
    @ExceptionHandler(java.util.NoSuchElementException.class) @ResponseStatus(HttpStatus.NOT_FOUND) Map<String,String> missing(java.util.NoSuchElementException e) { return Map.of("error", "Resource not found"); }
    @ExceptionHandler(AccessDeniedException.class) @ResponseStatus(HttpStatus.FORBIDDEN) Map<String,String> denied(AccessDeniedException e) { return Map.of("error", "Access denied"); }
}
