/**
 * ================================================================================
 * ROAD GENERATION AND MULTIPLE CONSTRAINTS
 * 
 * Demonstrates a genetic algorithm for creating road systems based
 * on cost function.
 * 
 * Uses Rambda to emphasize a purer functional programming style in JavaScript.
 * Except for some parts of the GUI code, there are no internal state variables
 * that change or other side-effects.  
 * 
 * Uses Paper.js for rendering of vector graphics. 
 *  
 * by Sander van de Merwe (sandervdmerwe@gmail.com)
 * ================================================================================
 */


/*

The road system.
 
A road system is a collection of segments. Each segment has a .from and .to property,
defining the line geometry of the road.

*/


// --------------------------------------------------------------------------------
//
//  RoadSegment
//
// --------------------------------------------------------------------------------


/**
 * RoadSegment :: Point -> Point -> int -> RoadSegment
 */
const RoadSegment = (from, to, quality) => (
{
    /**
     * from :: Point
     */
    from: from,
    
    /**
     * to :: Point
     */
    to: to,
    
    /**
     * quality :: int
     */
    quality : quality || RoadSegment.ROAD,
    
    /**
     * length :: float
     */
    length: pointPointDistance(from, to)
})


// Road qualities

RoadSegment.ROAD            = 0
RoadSegment.HIGHWAY         = 1
RoadSegment.SUPER_HIGHWAY   = 2


/**
 * distanceToPoint :: Point -> RoadSegment -> int
 * 
 * Get shortest distance from this segment to given point.
 * @param p The point.
 * @param s The segment.
 * @returns Distance
 */
RoadSegment.distanceToPoint = (p, s) =>
    pointLineDistance(p, s.from, s.to)

  
/**
 * equals :: RoadSegment -> RoadSegment -> bool
 * 
 * Compares the two given segments for equality.
 * It is invariant to swapping of the .from and .to properties.
 * The quality of the segment is not considered.
 */
RoadSegment.equals = (a, b) =>
    (a.from.equals(b.from) && a.to.equals(b.to))
 || (a.from.equals(b.to) && a.to.equals(b.from))

   
/**
 * isEmpty :: RoadSegment -> bool
 * 
 * Checks if given segment is empty.
 * A segment is considered empty if its from and to properties are equal.
 */
RoadSegment.isEmpty = (s) =>
    s.from.equals(s.to)

                      
/**
 * intersection :: RoadSegment -> RoadSegment -> Point
 * 
 * Returns intersection point between the two given segments
 * or NULL if the segments do not intersect.
 * Note that sharing of a vertex is not considered as an intersection.
 */
RoadSegment.intersection = (other, s) =>
    lineLineIntersection(s.from, s.to, other.from, other.to)
    

/**
 * keyOf :: RoadSegment -> string
 * 
 * Computes a key identifying this segment.
 * It is invariant to swapping of the .from and .to properties.
 * The quality of the segment is not considered. 
 */
RoadSegment.keyOf = (s) =>
    RoadSegment.keyOfAB(s.from, s.to)

        
/**
 * keyOfAB :: Point -> Point -> string 
 * 
 * Computes a key identifying the segment given
 * by the two points.
 * The order of the two points are irrelevant.
 */
RoadSegment.keyOfAB = (a, b) => {
    const order  = (a.y < b.y || (a.y == b.y && a.x < b.x))
    const first  = order ? a : b
    const second = order ? b : a
    return (first.x+'|'+first.y+'|'+second.x+'|'+second.y)
}

    
/**
 * vertices :: [RoadSegment] -> [Point]
 */
RoadSegment.vertices = (segments) =>
    R.uniqWith( (a, b) => a.equals(b),
                R.ap([R.prop('from'), R.prop('to')], segments) )

    
// --------------------------------------------------------------------------------
//
//  RoadSystem
//
// --------------------------------------------------------------------------------


/**
 * RoadSystem :: RoadSystem
 */
const RoadSystem = () => ({
    /**
     * connectionMap :: { k: [Point] }
     */
    connectionMap: {},
    
    /**
     * segments :: [RoadSegment]
     */
    segments: [],
    
    /**
     * segmentMap :: { k: RoadSegment }
     */
    segmentMap: {}  
})

    
/**
 * keyOfPoint :: Point -> string
 */
RoadSystem.keyOfPoint = (p) => (p.x + '|' + p.y)

        
/**
 * addSegment :: RoadSegment -> RoadSystem -> RoadSystem
 */
RoadSystem.addSegment = (segment, roadSystem) =>
{
    /*
     Determine if segment we try to add intersects
     with any existing segment.
       
     If it does, remove the conflicting segment and
     re-add all sub-segments, recursively calling
     this function.
      
     If it doesn't, add the segment.
     */

    function resolveConflict(conflictingSegment)
    {
        const intersection = roundPoint(RoadSegment.intersection(segment, conflictingSegment))
        return R.pipe(
                RoadSystem.removeSegment(conflictingSegment),
                RoadSystem.addSegment(RoadSegment(intersection, segment.from, segment.type)),
                RoadSystem.addSegment(RoadSegment(intersection, segment.to, segment.type)),
                RoadSystem.addSegment(RoadSegment(intersection, conflictingSegment.from, segment.type)),
                RoadSystem.addSegment(RoadSegment(intersection, conflictingSegment.to, segment.type))
                )
    }
    
    function performChanges(roadSystem)
    {
        const whereConflicting = (other) => null !== RoadSegment.intersection(segment, other)
        const conflictingSegment = R.find(whereConflicting, roadSystem.segments)
        
        return (conflictingSegment)
            ? resolveConflict(conflictingSegment)(roadSystem)
            : RoadSystem.addNonIntersectingSegment(segment)(roadSystem)
    }
    
    return (RoadSegment.isEmpty(segment))
        ? roadSystem
        : performChanges(roadSystem)
}


/**
 * addNonIntersectingSegment :: RoadSegment -> RoadSystem -> RoadSystem
 * 
 * Add road segment to system.
 */
RoadSystem.addNonIntersectingSegment = (segment) =>
{
    const addConnectionToMap    = (a, b) => (tbl) => R.mergeWith(R.concat, tbl, R.objOf(RoadSystem.keyOfPoint(a), [b]))
    const addConnectionToSystem = (a, b) => RoadSystem.updateConnectionMap(addConnectionToMap(a, b))
    const addSegmentToMap       = RoadSystem.updateSegmentMap(R.assoc(RoadSegment.keyOf(segment), segment))

    return R.compose(
            addConnectionToSystem(segment.from, segment.to),
            addConnectionToSystem(segment.to, segment.from),
            addSegmentToMap
            )
}


/**
 * changeRoadQuality :: int -> RoadSegment-> RoadSystem -> RoadSystem
 */
RoadSystem.changeRoadQuality = (newQuality, segment) =>
    R.pipe(RoadSystem.removeSegment(segment),
           RoadSystem.addSegment(R.assoc('quality', newQuality, segment)))


/**
 * findSegment :: Point -> Point -> RoadSystem -> RoadSegment
 */
RoadSystem.findSegment = (a, b, roadSystem) =>
    roadSystem.segmentMap[RoadSegment.keyOfAB(a, b)]

        
/**
 * moveVertex :: Point -> Point -> RoadSystem -> RoadSystem
 */
RoadSystem.moveVertex = (a, b, roadSystem) =>
{
    const k = RoadSystem.keyOfPoint(a)
    const oldSegments = roadSystem.connectionMap[k].map(RoadSystem.findSegment(a, R.__, roadSystem))
    const newSegments = roadSystem.connectionMap[k].map((c) => RoadSegment(b, c, RoadSystem.findSegment(a, c, roadSystem).quality))
        
    return R.compose(
        R.reduce(R.flip(RoadSystem.addSegment), R.__, newSegments),
        R.reduce(R.flip(RoadSystem.removeSegment), R.__, oldSegments)
      )(roadSystem)
}


/**
 * path :: Point -> Point -> RoadSystem -> [Point]
 * 
 * Returns a path between the two given points.
 * The first and last elements of the returned path
 * are not necessarily equal to the first and second
 * point given as arguments to this function.
 */
RoadSystem.path = (a, b, roadSystem) =>
{
    /* Recursively concatenate list of nearest nodes,
       until we reach encounter node b or there is no
       node left that is closer to the target node
       except the lastly added node itself. */ 

    const connectionsAt       = (p) => (roadSystem.connectionMap[RoadSystem.keyOfPoint(p)] || [])
    const distanceToTarget    = (p) => pointPointDistance(p, b)
    const stopAt              = (x, y) => (!x.equals(y)) ? y : undefined
    const nearestConnection   = (x) => stopAt(x, R.reduce(R.minBy(distanceToTarget), x, connectionsAt(x)))
    const nextPoint           = (x) => (undefined !== x) ? ([x].concat(nextPoint(nearestConnection(x)))) : []
        
    return nextPoint(a)
}


/**
 * removeSegment :: RoadSegment -> RoadSystem -> RoadSystem
 */
RoadSystem.removeSegment = (segment, roadSystem) =>
{
    //const removeFromMap       = (a, b) => (tbl) => R.mergeWith(R.flip(R.without), tbl, R.objOf(RoadSystem.keyOfPoint(a), [b]))
    
    function removeFromMap(a, b) {
        return (tbl) => {
            const k = RoadSystem.keyOfPoint(a)
            return (tbl[k]) ? (() => {
                const newList = R.without([b], tbl[k])
                return (newList.length > 0)
                    ? R.assoc(k, newList, tbl)
                    : R.dissoc(k, tbl)
            })() : tbl;
        }
    }
    
    const removeFromSystem    = (a, b) => RoadSystem.updateConnectionMap(removeFromMap(a, b))
    const removeSegmentFromMap= RoadSystem.updateSegmentMap(R.dissoc(RoadSegment.keyOf(segment)))
    
    return R.compose(
        removeFromSystem(segment.from, segment.to),
        removeFromSystem(segment.to, segment.from),
        removeSegmentFromMap
        )(roadSystem)
}


/**
 * removeVertex :: Point -> RoadSystem -> RoadSystem
 */
RoadSystem.removeVertex = (p, roadSystem) =>
{
    /*
    Find all segments that share a vertex with
    requested point and remove all those segments.
    Re-connect all segments that now miss a link. 
     */
    
    const k                   = RoadSystem.keyOfPoint(p)
    const segmentsToRemove    = roadSystem.connectionMap[k].map(RoadSystem.findSegment(p, R.__, roadSystem))
    const lowestRoadQuality   = R.reduce(R.min, RoadSegment.SUPER_HIGHWAY, R.pluck('quality', segmentsToRemove))
    const segmentFromLink     = (a) => RoadSegment(a[0], a[1], lowestRoadQuality)
    const allMissingLinks     = R.xprod(roadSystem.connectionMap[k], roadSystem.connectionMap[k])
    const allMissingSegments  = allMissingLinks.map(segmentFromLink)
    const withoutEmpty        = R.reject(RoadSegment.isEmpty)
    const withoutDuplicates   = R.uniqWith(RoadSegment.equals)
    const segmentsToAdd       = withoutEmpty(withoutDuplicates(allMissingSegments))
    const removeSegments      = (roadSystem) => R.reduce(R.flip(RoadSystem.removeSegment), roadSystem, segmentsToRemove)
    const addSegments         = (roadSystem) => R.reduce(R.flip(RoadSystem.addSegment), roadSystem, segmentsToAdd)
        
    return (segmentsToAdd.length <= 3) // TODO: review limit (a simplified removeVertex() that does not rejoin broken links?) 
        ? addSegments(removeSegments(roadSystem))
        : removeSegments(roadSystem)
}


/**
 * updateConnectionMap :: (object -> object) -> RoadSystem -> RoadSystem
 */
RoadSystem.updateConnectionMap = (f, roadSystem) =>
    R.assoc('connectionMap', f(roadSystem.connectionMap))(roadSystem)
        

/**
 * updateSegmentMap :: (object -> object) -> RoadSystem -> RoadSystem
 */
RoadSystem.updateSegmentMap = (f, roadSystem) =>
{
    const newMap = f(roadSystem.segmentMap)
    return R.compose(
        R.assoc('segmentMap', newMap),
        R.assoc('segments', R.values(newMap))
        )(roadSystem)
                           
}
        
        
// --------------------------------------------------------------------------------
    
curryAll(RoadSystem)
curryAll(RoadSegment)

// --------------------------------------------------------------------------------
