package com.lastmile.delivery.controller;
import com.lastmile.delivery.dto.request.*;
import com.lastmile.delivery.dto.response.OrderResponse;
import com.lastmile.delivery.service.OrderService;
import jakarta.validation.Valid;
import org.springframework.http.*;
import org.springframework.security.core.Authentication;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import java.util.List;
@RestController @RequestMapping("/api/orders") public class OrderController { private final OrderService service; public OrderController(OrderService service){this.service=service;}
 @PostMapping @PreAuthorize("hasRole('CUSTOMER')") @ResponseStatus(HttpStatus.CREATED) public OrderResponse create(Authentication a,@Valid @RequestBody CreateOrderRequest r){return service.create(a.getName(),r);}
 @GetMapping public List<OrderResponse> mine(Authentication a){return service.mine(a.getName());}
 @GetMapping("/{id}") public OrderResponse get(Authentication a,@PathVariable Long id){return service.get(a.getName(),id);}
 @PatchMapping("/{id}/status") @PreAuthorize("hasAnyRole('ADMIN','DELIVERY_AGENT')") public OrderResponse status(Authentication a,@PathVariable Long id,@Valid @RequestBody StatusUpdateRequest r){return service.transition(a.getName(),id,r);}
 @PostMapping("/{id}/assign/{agentId}") @PreAuthorize("hasRole('ADMIN')") public OrderResponse assign(Authentication a,@PathVariable Long id,@PathVariable Long agentId){return service.assign(id,agentId,a.getName());}
}
