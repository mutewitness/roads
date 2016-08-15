/**
 * ================================================================================
 * ROAD GENERATION AND MULTIPLE CONSTRAINTS
 * 
 * Demonstrates a genetic algorithm for creating road systems based
 * on cost function.
 * 
 * Uses Rambda to emphasize a purer functional programming style in JavaScript.
 * Uses Paper.js for rendering of vector graphics. 
 *  
 * by Sander van de Merwe (sandervdmerwe@gmail.com)
 * ================================================================================
 */

/**
 * Geometry utility functions.
 * 
 * lineLineIntersection and pointLineDistance functions
 * are borrowed from unknown author.
 */


/**
 * @param a1
 * @param a2
 * @param b1
 * @param b2
 * @returns
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

//function lineCircleIntersection(a, b, p, r)
//{
//    const eDistAtoB = a.getDistance(b)
//    const d = new Point((b.x-a.x) / eDistAtoB, (b.y-a.y) / eDistAtoB)
//    const t = (d.x * (p.x-a.x)) + (d.y * (p.y-a.y));
//    const e = new Point((t * d.x) + a.x, (t * d.y) + a.y)
//    const eDistCtoE = e.getDistance(p)
//
//    if (eDistCtoE < r) {
//        const dt = Math.sqrt( Math.pow(r, 2) - Math.pow(eDistCtoE, 2))
//        const f = new Point((t-dt) * d.x + a.x, (t-dt) * d.y + a.y)
//        const g = new Point((t+dt) * d.x + a.x, (t+dt) * d.y + a.y)
//
//        const isOnLine = (a, b, c) => {
//            return a.getDistance(b) == a.getDistance(c) + b.getDistance(c)
//        }
//        
//        if (isOnLine(a, b, f) && isOnLine(a, b, g))
//            return [f, g]
//    }
//    
//    return null
//}

/**
 * @param a
 * @param b
 * @returns
 */
function pointPointDistance(a, b)
{
    return Math.sqrt((a.x-b.x)*(a.x-b.x)+(a.y-b.y)*(a.y-b.y))
}

/**
 * @param p
 * @param a
 * @param b
 * @returns
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
 * roundPoint :: Point? -> Point?
 * @param p
 * @returns
 */
function roundPoint(p) {
    return p ? new Point(Math.round(p.x), Math.round(p.y)) : null
}
