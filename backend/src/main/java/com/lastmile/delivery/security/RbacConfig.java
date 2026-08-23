package com.lastmile.delivery.security;

import java.util.Collections;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

import com.lastmile.delivery.entity.Role;

public final class RbacConfig {

    private static final Map<Role, Set<Permission>> ROLE_PERMISSIONS = new EnumMap<>(Role.class);

    static {
        // ADMIN has all permissions
        ROLE_PERMISSIONS.put(Role.ADMIN, Collections.unmodifiableSet(EnumSet.allOf(Permission.class)));

        // DISPATCHER: Fleet operations & assignments, order creation on behalf, application reviews, operational reports
        ROLE_PERMISSIONS.put(Role.DISPATCHER, Collections.unmodifiableSet(EnumSet.of(
                Permission.USER_VIEW_AGENTS,
                Permission.USER_VIEW_OWN_PROFILE,
                Permission.USER_UPDATE_OWN_PROFILE,
                Permission.ORDER_VIEW_ALL,
                Permission.ORDER_CREATE,
                Permission.ORDER_CREATE_ON_BEHALF,
                Permission.ORDER_RESCHEDULE,
                Permission.DELIVERY_VIEW_ALL,
                Permission.DELIVERY_ASSIGN,
                Permission.DELIVERY_REASSIGN,
                Permission.DELIVERY_AUTO_ASSIGN,
                Permission.DELIVERY_STATUS_UPDATE,
                Permission.WAREHOUSE_VIEW,
                Permission.PACKAGE_PROCESS,
                Permission.PACKAGE_HANDOVER,
                Permission.ZONE_VIEW,
                Permission.RATE_VIEW,
                Permission.PARTNER_APP_VIEW_ALL,
                Permission.PARTNER_APP_REVIEW,
                Permission.REPORT_VIEW_OPERATIONAL,
                Permission.AUDIT_LOG_VIEW
        )));

        // DELIVERY_AGENT: Assigned runs, status updates, GPS broadcast, POD upload, availability toggle
        ROLE_PERMISSIONS.put(Role.DELIVERY_AGENT, Collections.unmodifiableSet(EnumSet.of(
                Permission.USER_VIEW_OWN_PROFILE,
                Permission.USER_UPDATE_OWN_PROFILE,
                Permission.USER_UPDATE_OWN_AVAILABILITY,
                Permission.ORDER_VIEW_ASSIGNED,
                Permission.DELIVERY_VIEW_ASSIGNED,
                Permission.DELIVERY_STATUS_UPDATE,
                Permission.DELIVERY_LOCATION_UPDATE,
                Permission.PROOF_OF_DELIVERY_UPLOAD,
                Permission.ZONE_VIEW
        )));

        // WAREHOUSE_STAFF: Hub package intake, processing, staging, and driver handovers for assigned warehouse
        ROLE_PERMISSIONS.put(Role.WAREHOUSE_STAFF, Collections.unmodifiableSet(EnumSet.of(
                Permission.USER_VIEW_OWN_PROFILE,
                Permission.USER_UPDATE_OWN_PROFILE,
                Permission.USER_VIEW_AGENTS,
                Permission.ORDER_VIEW_WAREHOUSE,
                Permission.DELIVERY_STATUS_UPDATE,
                Permission.WAREHOUSE_VIEW,
                Permission.PACKAGE_PROCESS,
                Permission.PACKAGE_HANDOVER,
                Permission.ZONE_VIEW
        )));

        // CUSTOMER: Personal orders booking, tracking, rescheduling, and driver partner application
        ROLE_PERMISSIONS.put(Role.CUSTOMER, Collections.unmodifiableSet(EnumSet.of(
                Permission.USER_VIEW_OWN_PROFILE,
                Permission.USER_UPDATE_OWN_PROFILE,
                Permission.ORDER_VIEW_OWN,
                Permission.ORDER_CREATE,
                Permission.ORDER_RESCHEDULE,
                Permission.PARTNER_APP_SUBMIT,
                Permission.PARTNER_APP_VIEW_OWN,
                Permission.ZONE_VIEW
        )));
    }

    private RbacConfig() {
    }

    public static Set<Permission> getPermissions(Role role) {
        if (role == null) {
            return Collections.emptySet();
        }
        return ROLE_PERMISSIONS.getOrDefault(role, Collections.emptySet());
    }

    public static boolean hasPermission(Role role, Permission permission) {
        if (role == null || permission == null) {
            return false;
        }
        Set<Permission> permissions = ROLE_PERMISSIONS.get(role);
        return permissions != null && permissions.contains(permission);
    }
}
