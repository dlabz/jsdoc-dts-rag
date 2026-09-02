---
module: "userService"
source: "userService.js"
symbolCount: 3
symbols: ["UserProfile", "AuthSession", "UserService"]
---

# Module `userService`
**Source File**: `userService.js`

## Index of Symbols
- [UserProfile](#userprofile) (`TypeDef`) - User account profile information.
- [AuthSession](#authsession) (`TypeDef`) - Authentication token metadata.
- [UserService](#userservice) (`Class`) - Service for handling user registration, authentication, and permission checks.

---

## API Documentation

### `UserProfile`
*Kind*: **TypeDef**

```typescript
type UserProfile = Object
```

User account profile information.

---

### `AuthSession`
*Kind*: **TypeDef**

```typescript
type AuthSession = Object
```

Authentication token metadata.

---

### `UserService`
*Kind*: **Class**

```typescript
class UserService
```

Service for handling user registration, authentication, and permission checks.

#### Methods
- **`authenticate`**: `async authenticate(username, password)`
  Authenticates a user with username and password.
- **`createUser`**: `async createUser(data)`
  Creates and registers a new user in the system.
- **`getUserById`**: `getUserById(id)`
  Retrieves user profile by unique ID.

---
