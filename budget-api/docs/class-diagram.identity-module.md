# Identity Module — Class Diagram

```mermaid
classDiagram

    %% ─────────────────────────────────────────────
    %% Identity Module — Persisted Entities
    %% ─────────────────────────────────────────────

    class User {
        +String id
        +String name
        +String email
        +String picture
        +CurrencyCode currencyCode
        +Date createdAt
        +Date updatedAt
    }

    class AuthenticationProvider {
        +String id
        +String providerUserId
        +AuthenticationProviderType providerType
        +AuthenticationProviderStatus status
        +String activationCode
        +Date activationCodeExpiresAt
        +Date activationCodeResendAt
        +Number activationCodeRetries
        +String password
        +String refreshToken
        +String setPasswordToken
        +Date setPasswordExpiresAt
        +Number setPasswordRetries
        +Date setPasswordLastSentAt
        +User user
    }

    %% ─────────────────────────────────────────────
    %% Workspaces Module — Persisted Entities
    %% ─────────────────────────────────────────────

    class Workspace {
        +String id
        +String name
        +User owner
        +Date createdAt
        +Date updatedAt
    }

    class WorkspaceMember {
        +String id
        +Workspace workspace
        +User user
        +WorkspaceRole role
        +Date createdAt
        +Date updatedAt
    }

    class Invitation {
        +String id
        +String email
        +WorkspaceRole role
        +Workspace workspace
        +User invitedBy
        +String token
        +Date expiresAt
        +InvitationStatus status
        +Date createdAt
        +Date updatedAt
    }

    %% ─────────────────────────────────────────────
    %% Virtual Types (not persisted)
    %% ─────────────────────────────────────────────

    class Session {
        <<interface>>
        +String authId
        +String userId
        +String name
        +String email
        +String picture
        +String currencyCode
        +String refreshToken
        +Boolean isLongLived
        +String workspaceId
        +WorkspaceRole workspaceRole
    }

    class JwtPayload {
        <<interface>>
        +String sub
        +String userId
    }

    class Credentials {
        <<interface>>
        +String access_token
        +String refresh_token
    }

    %% ─────────────────────────────────────────────
    %% Enumerations
    %% ─────────────────────────────────────────────

    class AuthenticationProviderStatus {
        <<enumeration>>
        ACTIVE
        UNVERIFIED
        VERIFIED_NO_PASSWORD
    }

    class AuthenticationProviderType {
        <<enumeration>>
        EMAIL
        GOOGLE
    }

    class CurrencyCode {
        <<enumeration>>
        USD
        COP
    }

    class WorkspaceRole {
        <<enumeration>>
        OWNER
        CONTRIBUTOR
        VIEWER
    }

    class InvitationStatus {
        <<enumeration>>
        PENDING
        ACCEPTED
        EXPIRED
        REVOKED
    }

    %% ─────────────────────────────────────────────
    %% Relationships
    %% ─────────────────────────────────────────────

    AuthenticationProvider "*" --> "1" User : authenticates
    AuthenticationProvider --> AuthenticationProviderType : providerType
    AuthenticationProvider --> AuthenticationProviderStatus : status
    User --> CurrencyCode : currencyCode

    %% Workspaces
    Workspace "*" --> "1" User : owned by
    WorkspaceMember "*" --> "1" Workspace : belongs to
    WorkspaceMember "*" --> "1" User : member
    WorkspaceMember --> WorkspaceRole : role
    Invitation "*" --> "1" Workspace : for
    Invitation "*" --> "1" User : invited by
    Invitation --> WorkspaceRole : role
    Invitation --> InvitationStatus : status
    Session --> "0..1" WorkspaceRole : workspaceRole
```
