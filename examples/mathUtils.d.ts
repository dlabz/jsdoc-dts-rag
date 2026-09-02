/**
 * @fileoverview Mathematical utilities for 2D/3D geometry and matrix operations.
 * @module mathUtils
 */
/**
 * Represents a point in 2D Cartesian space.
 * @typedef {Object} Point2D
 * @property {number} x - The horizontal coordinate.
 * @property {number} y - The vertical coordinate.
 */
/**
 * Calculates Euclidean distance between two 2D points.
 *
 * @param {Point2D} p1 - The first coordinate point.
 * @param {Point2D} p2 - The second coordinate point.
 * @returns {number} The straight-line distance between p1 and p2.
 * @throws {TypeError} If either point is missing x or y numeric properties.
 *
 * @example
 * const dist = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
 * console.log(dist); // 5
 */
export function calculateDistance(p1: Point2D, p2: Point2D): number;
/**
 * Performs linear interpolation between two numeric scalar values.
 *
 * @param {number} a - Start value.
 * @param {number} b - End value.
 * @param {number} t - Interpolation factor (normally clamped between 0 and 1).
 * @returns {number} The interpolated value.
 *
 * @example
 * const mid = lerp(10, 20, 0.5); // 15
 */
export function lerp(a: number, b: number, t: number): number;
/**
 * Computes Manhattan distance between two points.
 * @deprecated Use calculateDistance for accurate Euclidean calculations instead.
 * @param {Point2D} p1 - First point.
 * @param {Point2D} p2 - Second point.
 * @returns {number} Manhattan grid distance.
 */
export function manhattanDistance(p1: Point2D, p2: Point2D): number;
/**
 * A 2D transformation Matrix utility class.
 */
export class Matrix2D {
    /**
     * Constructs a 2x2 matrix with given elements.
     * @param {number} a - Row 1, Col 1
     * @param {number} b - Row 1, Col 2
     * @param {number} c - Row 2, Col 1
     * @param {number} d - Row 2, Col 2
     */
    constructor(a?: number, b?: number, c?: number, d?: number);
    a: number;
    b: number;
    c: number;
    d: number;
    /**
     * Computes the determinant of the 2x2 matrix.
     * @returns {number} The determinant (ad - bc).
     */
    determinant(): number;
    /**
     * Multiplies this matrix by another 2D matrix.
     * @param {Matrix2D} other - The other matrix to multiply with.
     * @returns {Matrix2D} A new Matrix2D containing the product.
     */
    multiply(other: Matrix2D): Matrix2D;
}
/**
 * Represents a point in 2D Cartesian space.
 */
export type Point2D = {
    /**
     * - The horizontal coordinate.
     */
    x: number;
    /**
     * - The vertical coordinate.
     */
    y: number;
};
