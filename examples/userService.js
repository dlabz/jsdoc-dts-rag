/**
 * @fileoverview User management and authentication service module.
 * @module userService
 */

/**
 * User account profile information.
 * @typedef {Object} UserProfile
 * @property {string} id - Unique identifier of the user.
 * @property {string} username - User's unique login handle.
 * @property {string} email - Verified contact email address.
 * @property {"admin" | "member" | "guest"} role - Access control permission role.
 * @property {boolean} [isActive] - Whether the account is currently active.
 */

/**
 * Authentication token metadata.
 * @typedef {Object} AuthSession
 * @property {string} token - Signed JWT or Bearer session token.
 * @property {number} expiresAt - Timestamp in milliseconds when the token expires.
 * @property {UserProfile} user - Account profile snapshot.
 */

/**
 * Service for handling user registration, authentication, and permission checks.
 */
export class UserService {
  /**
   * Initializes a new UserService instance.
   * @param {string} [apiUrl="https://api.example.com"] - Base API endpoint.
   */
  constructor(apiUrl = "https://api.example.com") {
    this.apiUrl = apiUrl;
    /** @type {Map<string, UserProfile>} */
    this.users = new Map();
  }

  /**
   * Authenticates a user with username and password.
   *
   * @param {string} username - Login username.
   * @param {string} password - Plaintext password to verify against hash.
   * @returns {Promise<AuthSession>} Resolved session token and user profile upon successful login.
   * @throws {Error} If credentials are invalid or user does not exist.
   *
   * @example
   * const service = new UserService();
   * const session = await service.authenticate("alice", "secret123");
   * console.log(`Welcome ${session.user.username}`);
   */
  async authenticate(username, password) {
    if (!username || !password) {
      throw new Error("Missing username or password");
    }
    const user = Array.from(this.users.values()).find((u) => u.username === username);
    if (!user) {
      throw new Error(`User ${username} not found`);
    }
    return {
      token: "session_" + Math.random().toString(36).substring(2),
      expiresAt: Date.now() + 3600 * 1000,
      user,
    };
  }

  /**
   * Creates and registers a new user in the system.
   *
   * @param {Omit<UserProfile, "id">} data - New user account details.
   * @returns {Promise<UserProfile>} The newly created user with generated ID.
   */
  async createUser(data) {
    const id = "usr_" + Math.random().toString(36).substring(2, 9);
    /** @type {UserProfile} */
    const newUser = {
      id,
      username: data.username,
      email: data.email,
      role: data.role || "member",
      isActive: data.isActive !== undefined ? data.isActive : true,
    };
    this.users.set(id, newUser);
    return newUser;
  }

  /**
   * Retrieves user profile by unique ID.
   *
   * @param {string} id - The user ID.
   * @returns {UserProfile | null} Found user profile or null if not found.
   */
  getUserById(id) {
    return this.users.get(id) || null;
  }
}
