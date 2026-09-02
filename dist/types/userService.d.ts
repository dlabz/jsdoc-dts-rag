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
    constructor(apiUrl?: string);
    apiUrl: string;
    /** @type {Map<string, UserProfile>} */
    users: Map<string, UserProfile>;
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
    authenticate(username: string, password: string): Promise<AuthSession>;
    /**
     * Creates and registers a new user in the system.
     *
     * @param {Omit<UserProfile, "id">} data - New user account details.
     * @returns {Promise<UserProfile>} The newly created user with generated ID.
     */
    createUser(data: Omit<UserProfile, "id">): Promise<UserProfile>;
    /**
     * Retrieves user profile by unique ID.
     *
     * @param {string} id - The user ID.
     * @returns {UserProfile | null} Found user profile or null if not found.
     */
    getUserById(id: string): UserProfile | null;
}
/**
 * User account profile information.
 */
export type UserProfile = {
    /**
     * - Unique identifier of the user.
     */
    id: string;
    /**
     * - User's unique login handle.
     */
    username: string;
    /**
     * - Verified contact email address.
     */
    email: string;
    /**
     * - Access control permission role.
     */
    role: "admin" | "member" | "guest";
    /**
     * - Whether the account is currently active.
     */
    isActive?: boolean;
};
/**
 * Authentication token metadata.
 */
export type AuthSession = {
    /**
     * - Signed JWT or Bearer session token.
     */
    token: string;
    /**
     * - Timestamp in milliseconds when the token expires.
     */
    expiresAt: number;
    /**
     * - Account profile snapshot.
     */
    user: UserProfile;
};
