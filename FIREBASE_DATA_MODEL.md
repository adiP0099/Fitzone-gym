# FitZone Firestore data model

This is a proposed schema only. No collections are created or seeded by the frontend. Business writes that need validation remain for the Node.js/Express backend phase. Firestore rules are present for review, but have not been deployed.

## `users/{uid}`

- **Purpose:** Member profile associated with a Firebase Authentication account.
- **Document ID:** Firebase Auth UID.
- **Fields:** `uid`, `email`, `displayName`, `role`, `createdAt`, and `updatedAt`; optional editable fields are `firstName`, `lastName`, `phoneNumber`, and `fitnessGoals`.
- **Ownership:** A member may read and update only their own profile. Profile email, role, UID, and creation time remain immutable to clients. Trusted admins may read profiles under the custom `admin == true` claim.
- **Validation:** Firestore rules validate editable field types and lengths, bind updates to the authenticated UID, and prevent changes to email and role. The profile form does not update Firebase Authentication email.

## `membershipPlans/{planId}`

- **Purpose:** Public descriptions and prices for membership options.
- **Document ID:** Stable plan key such as `essential`, `performance`, or `unlimited`.
- **Fields:** `name` (string), `description` (string), `priceMinor` (integer), `currency` (string), `billingInterval` (string), `benefits` (array of strings), `isPublished` (boolean), `createdAt` / `updatedAt` (timestamps).
- **Ownership:** Published plans are readable publicly. Administrative changes require a trusted administrator; client UI currently uses local mock data.
- **Validation:** Backend must validate price, currency, plan state, and any allowed plan transitions.

## `memberships/{membershipId}`

- **Purpose:** A member's subscription/membership status and plan association.
- **Document ID:** Server-generated ID; never accept client-selected IDs as authority.
- **Fields:** `uid` (string), `planId` (string), `status` (string enum), `startAt` / `endAt` (timestamps or null), `createdAt` / `updatedAt` (timestamps), optional `providerReference` (string).
- **Ownership:** Owner may read their own membership; trusted administrator may read under custom-claim rules. Client writes are denied.
- **Validation:** Backend must verify plan availability, ownership, status transitions, and provider references. Payment integration is out of scope.

## `trainers/{trainerId}`

- **Purpose:** Public trainer profiles and operational availability metadata.
- **Document ID:** Stable server-generated ID.
- **Fields:** `displayName` (string), `specialties` (array of strings), `bio` (string), `photoPath` (string), `isPublished` (boolean), `createdAt` / `updatedAt` (timestamps).
- **Ownership:** Published profile reads may be public; unpublished profiles require a trusted administrator. Create and update operations require the trusted Firebase `admin == true` claim; deletion is denied.
- **Validation:** Firestore rules validate display name, specialty list, bio, optional photo path, publication flag, and server timestamps.

## `sessions/{sessionId}`

- **Purpose:** Admin-published future sessions available for member booking.
- **Document ID:** Firestore-generated ID.
- **Fields:** `name` (string), `trainerName` (string, may be empty), `startsAt` (timestamp), `active` (boolean), `createdAt` / `updatedAt` (timestamps).
- **Ownership:** Authenticated members may read active sessions. Only users with the trusted Firebase `admin == true` custom claim may create or update sessions. Deletion is denied.
- **Validation:** Rules require a bounded session name and trainer name, timestamps, an active flag, and a future start time when a session is created.

## `bookings/{bookingId}`

- **Purpose:** A member's reservation for one published session.
- **Document ID:** Deterministic `{uid}_{sessionId}` key, allowing only one booking per member and session.
- **Fields:** `uid`, `sessionId`, `sessionName`, `trainerName`, `startsAt`, `status: "confirmed"`, `createdAt`, and `updatedAt`.
- **Ownership:** Members may read only their own bookings. Trusted admins may read all bookings. Members can create bookings only for active future sessions. Updates and deletion are denied in this phase.
- **Validation:** Firestore rules bind the UID to the caller, bind the booking ID to the UID and session ID, and verify the saved session snapshot against an active session document. The deterministic ID prevents duplicate bookings.

## `workouts/{workoutId}`

- **Purpose:** Workout plans or completed-session summaries associated with one member.
- **Document ID:** Server-generated ID.
- **Fields:** `uid` (string), `title` (string), `completedAt` (timestamp or null), `durationMinutes` (integer), `exercises` (array of structured exercise maps), `createdAt` (timestamp).
- **Ownership:** Owner may read their own workout documents; trusted administrator may read. Client writes are denied until validation is implemented.
- **Validation:** Backend must validate ownership, exercise structure, limits, and any trainer-authored changes.

## `enquiries/{enquiryId}`

- **Purpose:** Contact or free-trial enquiry submitted by a visitor.
- **Document ID:** Server-generated ID.
- **Fields:** `name` (string), `email` (string), `phone` (string or null), `topic` (string), `message` (string), `status` (string enum), `createdAt` (timestamp).
- **Ownership:** Private to authorized staff through trusted server operations; public reads and direct client writes are denied by these rules.
- **Validation:** Backend must validate and rate-limit submissions, sanitize fields, and control staff status changes.

## Payments (future only)

No `payments` collection is created or enabled for client access. If needed later, use server-generated records containing only provider references, amount/currency, and status. Never store card numbers, CVVs, or other payment credentials in Firestore. Provider webhooks and status transitions must be verified by the backend.

## Administrator authorization

Rules use the Firebase ID token custom claim `admin == true`; a Firestore `role` field is never accepted as proof of admin. The frontend cannot set this claim. It must be provisioned by a trusted Firebase Admin SDK process in the backend phase. Until then, no user is granted administrator access, and business writes remain denied.
