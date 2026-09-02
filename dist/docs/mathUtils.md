---
module: "mathUtils"
source: "mathUtils.js"
symbolCount: 5
symbols: ["Point2D", "calculateDistance", "lerp", "Matrix2D", "manhattanDistance"]
---

# Module `mathUtils`
**Source File**: `mathUtils.js`

## Index of Symbols
- [Point2D](#point2d) (`TypeDef`) - Represents a point in 2D Cartesian space.
- [calculateDistance](#calculatedistance) (`Function`) - Calculates Euclidean distance between two 2D points.
- [lerp](#lerp) (`Function`) - Performs linear interpolation between two numeric scalar values.
- [Matrix2D](#matrix2d) (`Class`) - A 2D transformation Matrix utility class.
- [manhattanDistance](#manhattandistance) (`Function`) - Computes Manhattan distance between two points.

---

## API Documentation

### `Point2D`
*Kind*: **TypeDef**

```typescript
type Point2D = Object
```

Represents a point in 2D Cartesian space.

---

### `calculateDistance`
*Kind*: **Function**

```typescript
export function calculateDistance(p1, p2)
```

Calculates Euclidean distance between two 2D points.

#### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `p1` | `Point2D` | - The first coordinate point. |
| `p2` | `Point2D` | - The second coordinate point. |

#### Returns
- **Type**: `number`
- **Description**: The straight-line distance between p1 and p2.

#### Examples
```javascript
const dist = calculateDistance({ x: 0, y: 0 }, { x: 3, y: 4 });
console.log(dist); // 5
```

---

### `lerp`
*Kind*: **Function**

```typescript
export function lerp(a, b, t)
```

Performs linear interpolation between two numeric scalar values.

#### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `a` | `number` | - Start value. |
| `b` | `number` | - End value. |
| `t` | `number` | - Interpolation factor (normally clamped between 0 and 1). |

#### Returns
- **Type**: `number`
- **Description**: The interpolated value.

#### Examples
```javascript
const mid = lerp(10, 20, 0.5); // 15
```

---

### `Matrix2D`
*Kind*: **Class**

```typescript
class Matrix2D
```

A 2D transformation Matrix utility class.

#### Methods
- **`determinant`**: `determinant()`
  Computes the determinant of the 2x2 matrix.
- **`multiply`**: `multiply(other)`
  Multiplies this matrix by another 2D matrix.

---

### `manhattanDistance`
*Kind*: **Function**

> ⚠️ **Deprecated**: Use calculateDistance for accurate Euclidean calculations instead.

```typescript
export function manhattanDistance(p1, p2)
```

Computes Manhattan distance between two points.

#### Parameters
| Parameter | Type | Description |
| :--- | :--- | :--- |
| `p1` | `Point2D` | - First point. |
| `p2` | `Point2D` | - Second point. |

#### Returns
- **Type**: `number`
- **Description**: Manhattan grid distance.

---
