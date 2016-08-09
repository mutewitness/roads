/**
 * ================================================================================
 * app.js - road system generation example
 * 
 * Demonstrates genetic algorithm for creating road systems based
 * on cost function.
 * 
 * Uses Rambda to emphasize a purer functional programming style in JavaScript.
 * Uses Paper.js for rendering of vector graphics. 
 *  
 * by Sander van de Merwe (sandervdmerwe@gmail.com)
 * ================================================================================
 */

function RoadSegment(from, to, quality)
{
    this.from = from
    this.to   = to
    this.quality = quality || RoadSegment.DIRT
}

//================================================================================

// Road quality types

RoadSegment.DIRT                = 0
RoadSegment.ROAD                = 1
RoadSegment.HIGHWAY             = 2

//================================================================================

// Road segment utility functions

RoadSegment.keyOf               = (s) => RoadSegment.keyOfAB(s.from, s.to)

RoadSegment.keyOfAB             = (a, b) =>
{
    var order  = (a.y < b.y || (a.y == b.y && a.x < b.x)),
        first  = order ? a : b,
        second = order ? b : a
    return (first.x+'|'+first.y+'|'+second.x+'|'+second.y)
}

RoadSegment.equals              = (a, b) => (a.from.equals(b.from) && a.to.equals(b.to))
                                         || (a.from.equals(b.to) && a.to.equals(b.from))

RoadSegment.isEmpty             = (s) => (s) => s.from.equals(s.to)

//================================================================================

// Road segment prototype functions

/**
 * Get shortest distance from this segment to given point.
 * @param p Point
 * @returns Distance
 */
RoadSegment.prototype.distanceToPoint = function(p)
{
    return pointToLineDistance(
            p.x, p.y,
            this.from.x,
            this.from.y,
            this.to.x,
            this.to.y)
}

/**
 * @param other
 * @returns True if segments intersect.
 */
RoadSegment.prototype.intersection = function(other)
{
    var a1 = this.from,
        a2 = this.to,
        b1 = other.from,
        b2 = other.to,
        ua_t = (b2.x - b1.x) * (a1.y - b1.y) - (b2.y - b1.y) * (a1.x - b1.x),
        ub_t = (a2.x - a1.x) * (a1.y - b1.y) - (a2.y - a1.y) * (a1.x - b1.x),
        u_b  = (b2.y - b1.y) * (a2.x - a1.x) - (b2.x - b1.x) * (a2.y - a1.y)

    if (u_b != 0) {
        var ua = ua_t / u_b;
        var ub = ub_t / u_b;

        if ( 0 <= ua && ua <= 1 && 0 <= ub && ub <= 1 ) {
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
 * Tests if this road segment intersects the given segment.
 * If the segments share a vertex but do not cross, false is returned.
 * @param other
 * @returns True if segments intersect.
 */
RoadSegment.prototype.intersects = function(other)
{
    return (null !== this.intersection(other))
}

//================================================================================

/**
 * Road system.
 */
function RoadSystem()
{
    this.segmentMap    = {}
    this.connectionMap = {}
}

//================================================================================

// some helper functions
RoadSystem.keyOfPoint           = (p) => (p.x+'|'+p.y)

//================================================================================

RoadSystem.P=20;

/**
 * Add road segment to system.
 * @param segment Segment to add.
 * @returns New RoadSystem
 */
RoadSystem.prototype.addSegment = function(segment)
{
    var existingSegments        = this.segments(),
        normalizeIntersection   = (intersection) => intersection ? new Point(Math.round(intersection.x), Math.round(intersection.y)) : null,
        intersections           = R.map((other) => normalizeIntersection(other.intersection(segment)), existingSegments),
        intersectsWith          = R.findIndex((intersection) => null !== intersection, intersections),
        addConnectionToMap      = (a, b, tbl) => R.mergeWith(R.concat, tbl, R.objOf(RoadSystem.keyOfPoint(a), [b])),
        addConnectionToSystem   = (a, b) => (roadSystem) => R.assoc('connectionMap', addConnectionToMap(a, b, roadSystem.connectionMap), roadSystem),
        addSegmentToMap         = (roadSystem) => R.assoc('segmentMap', R.assoc(RoadSegment.keyOf(segment), segment, roadSystem.segmentMap))(roadSystem),
        addSegmentToSystem      = R.compose( addConnectionToSystem(segment.from, segment.to),
                                             addConnectionToSystem(segment.to, segment.from),
                                             addSegmentToMap ) 

    if (-1 != intersectsWith)
    {
        var u = existingSegments[intersectsWith].from,
            v = existingSegments[intersectsWith].to,
            intersection = intersections[intersectsWith]
            
        return this.removeSegment(existingSegments[intersectsWith])
                   .addSegment(new RoadSegment(segment.from, intersection, segment.type))
                   .addSegment(new RoadSegment(segment.to, intersection, segment.type))
                   .addSegment(new RoadSegment(existingSegments[intersectsWith].from, intersection, segment.type))
                   .addSegment(new RoadSegment(existingSegments[intersectsWith].to, intersection, segment.type))
    }
                                             
    return (-1 != intersectsWith) ? this : addSegmentToSystem(this)
}

/**
 * 
 */
RoadSystem.prototype.changeRoadQuality = function(segment, newQuality)
{
    return this.removeSegment(segment).addSegment(R.assoc('quality', newQuality, segment))
}

/**
 * @param p
 * @returns
 */
RoadSystem.prototype.findSegment = function(a, b)
{
    return this.segmentMap[RoadSegment.keyOfAB(a, b)]
}

/**
 * @param a
 * @param b
 */
RoadSystem.prototype.movePoint = function(a, b, createIntersection)
{
    var k                       = RoadSystem.keyOfPoint(a),
        oldSegments             = this.connectionMap[k].map((c) => this.findSegment(a, c)),
        newSegments             = this.connectionMap[k].map((c) => new RoadSegment(b, c, this.findSegment(a, c).quality)),
        movePoint               = R.compose( R.reduce((acc, x) => acc.addSegment(x), R.__, newSegments),
                                             R.reduce((acc, x) => acc.removeSegment(x), R.__, oldSegments))
        
    // TODO: test implementation of createIntersection
    return (createIntersection)
        ? movePoint(this).addSegment(new RoadSegment(a, b))
        : movePoint(this)
}

/**
 * Returns the distance between two points.
 * 
 * @param a First point
 * @param b Secondary point
 * @returns
 */
RoadSystem.prototype.path = function(a, b)
{
    /* recursively concatenate list of nearest nodes,
       until we reach encounter node b or there is no
       node left that is closer to the target node
       except the lastly added node itself. */ 

    var connectionsAt           = (p) => (this.connectionMap[RoadSystem.keyOfPoint(p)] || []),
        distanceToTarget        = (p) => p.getDistance(b),
        stopAt                  = (x, y) => (!x.equals(y)) ? y : undefined,
        nearestConnection       = (x) => stopAt(x, R.reduce(R.minBy(distanceToTarget), x, connectionsAt(x))),
        nextPoint               = (x) => (undefined !== x) ? ([x].concat(nextPoint(nearestConnection(x)))) : []
        
    return nextPoint(a)
}

/**
 * 
 */
RoadSystem.prototype.removePoint = function(p)
{
    var k                       = RoadSystem.keyOfPoint(p),
        segmentsToRemove        = this.connectionMap[k].map((q) => this.findSegment(p, q)),
        newRoadQuality          = R.reduce(R.min, RoadSegment.HIGHWAY, R.pluck('quality', segmentsToRemove)),
        segmentFactory          = (a) => new RoadSegment(a[0], a[1], newRoadQuality)
        segmentsToAdd           = R.uniqWith(RoadSegment.equals, R.reject(RoadSegment.isEmpty, R.xprod(this.connectionMap[k], this.connectionMap[k]).map(segmentFactory))),
        removeSegments          = (roadSystem) => R.reduce((acc, x) => acc.removeSegment(x), roadSystem, segmentsToRemove)
        addSegments             = (roadSystem) => R.reduce((acc, x) => acc.addSegment(x), roadSystem, segmentsToAdd)
        
    return R.compose(removeSegments, addSegments)(this)
}

/**
 * Remove road segment from system.
 * @param segment Segment to remove.
 * @returns New RoadSystem
 */
RoadSystem.prototype.removeSegment = function(segment)
{
    var removeFromMap           = (a, b, tbl) => R.mergeWith(R.flip(R.without), tbl, R.objOf(RoadSystem.keyOfPoint(a), [b])),
        removeFromSystem        = (a, b) => (roadSystem) => R.assoc('connectionMap', removeFromMap(a, b, roadSystem.connectionMap))(roadSystem),
        ifThisSegment           = (other) => (other === this.findSegment(segment.from, segment.to)),
        removeSegmentFromMap    = (roadSystem) => R.assoc('segmentMap', R.dissoc(RoadSegment.keyOf(segment), roadSystem.segmentMap))(roadSystem),
        removeSegmentFromSystem = R.compose(removeFromSystem(segment.from, segment.to),
                                            removeFromSystem(segment.to, segment.from),
                                            removeSegmentFromMap)
    
    return removeSegmentFromSystem(this)
}

/**
 * 
 */
RoadSystem.prototype.segments = function()
{
    return R.values(this.segmentMap)
}

/**
 * 
 */
RoadSystem.prototype.vertices = function()
{
    var segments = this.segments(), 
        a        = R.pluck('from', segments),
        b        = R.pluck('to', segments)
        
    return R.uniqWith((a, b) => a.equals(b), R.concat(a, b))
}
