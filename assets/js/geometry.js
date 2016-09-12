/**
 * ================================================================================
 *
 *  Geometry utility functions.
 *
 * ================================================================================
 */

/*
Note: implementation of the lineLineIntersection and pointLineDistance
functions are borrowed from the internet; author unbeknownst by me.
*/


/**
 * lineLineIntersection :: Point -> Point -> Point -> Point -> Point
 */
function lineLineIntersection(a1, a2, b1, b2)
{
    const ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x)
    const ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x)
    const u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y)

    if (u_b != 0) {
        const ua = ua_t / u_b;
        const ub = ub_t / u_b;

        if (0 <= ua && ua <= 1 && 0 <= ub && ub <= 1) {
            if (0 == ua || 1 == ua) {
                // perfect connection; threat it as non-intersecting.
                return null;
            }

            return new Point(
                    a1.x + ua * (a2.x - a1.x),
                    a1.y + ua * (a2.y - a1.y))
        } else {
            return null
        }
    } else {
        // if ua_t or ub_t equals 0, it's a coincident.
        // otherwise the lines are parallel.
        return null
    }
}


/**
 * pointPointDistance :: Point -> Point -> float
 */
function pointPointDistance(a, b)
{
    return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y))
}


/**
 * pointLineDistance :: Point -> Point -> Point -> float
 */
function pointLineDistance(p, a, b)
{
    const A     = p.x - a.x
    const B     = p.y - a.y
    const C     = b.x - a.x
    const D     = b.y - a.y
    const dot   = A * C + B * D
    const lenSq = C * C + D * D
    const param = (lenSq != 0) ? (dot / lenSq) : -1

    var xx, yy;

    if (param < 0) {
        xx = a.x;
        yy = a.y;
    } else if (param > 1) {
        xx = b.x;
        yy = b.y;
    } else {
        xx = a.x + param * C;
        yy = a.y + param * D;
    }

    const dx = p.x - xx;
    const dy = p.y - yy;

    return Math.sqrt(dx * dx + dy * dy);

}


/**
 * roundPoint :: Point -> Point
 */
function roundPoint(p)
{
    return p
        ? new Point(Math.round(p.x), Math.round(p.y))
        : null
}
