# Spec Delta

## Purpose

The signed-in user's account, in the side panel, where there is sign-in (jamovi cloud).

## ADDED Requirements

### Requirement: Only with a user
The Account button SHALL be shown in the rail only while `auth.currentUser()` returns a user, and SHALL be shown or hidden as the user signs in or out.

#### Scenario: Desktop app
- **WHEN** jamovi runs without sign-in
- **THEN** there is no Account button in the rail

### Requirement: Avatar
The Account button SHALL show the user's picture, or without one their initials, in a circle. While the Account panel is showing, the circle SHALL have a blue ring.

#### Scenario: No picture
- **WHEN** the user "Alex Example" has no picture
- **THEN** the Account button shows "AE" in a circle

### Requirement: Account details
The Account panel SHALL show the user's avatar, name, email and plan (when they have one), a "Manage subscriptions" button (when there is a page for it) that opens that page, and a "Sign out" button that signs them out.

#### Scenario: Managing a subscription
- **WHEN** the user clicks "Manage subscriptions"
- **THEN** their subscriptions page opens
