package com.lastmile.delivery.dto.response;

import java.util.List;

public record ZoneResponse(

        Long id,

        String name,

        List<ZoneAreaResponse> areas

) {
}
