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

var Evolution = {}

/**
 * newRoadSystem :: State -> RoadSystem
 */
Evolution.newRoadSystem = (s) =>
{
    // TODO: attention mutation.
    // TODO: variant extendSegment that connects to existing point around selected one?
    
    /*
     Mutation (helper) functions
     */
    
    /**
     * randomPointRange :: int
     */
    const randomPointRange = 3

    /**
     * randomQuality :: int
     */
    const randomQuality = () => randomInt(RoadSegment.SUPER_HIGHWAY+1)
    
    /**
     * randomPointAround :: Point -> int -> Point
     */
    const randomPointAround = (p, r) =>
        p.add(new Point(-r+randomInt(2*r+1),
                        -r+randomInt(2*r+1)
                        ))
       
                        
    /**
     * withRandomSegment :: (RoadSegment -> RoadSystem) -> (RoadSystem -> RoadSystem)
     */
    const withRandomSegment = (f) => (roadSystem) =>
        ((roadSystem.segments.length > 0)
            ? f(randomFromList(roadSystem.segments))
            : R.identity)
        (roadSystem)
        
        
    /**
     * withRandomVertex :: (Point -> RoadSystem) -> (RoadSystem -> RoadSystem)
     */
    const withRandomVertex = (f) => (roadSystem) =>
        ((roadSystem.segments.length > 0)
            ? f(randomFromList(RoadSegment.vertices(roadSystem.segments)))
            : R.identity)
        (roadSystem)
        
        
    /**
     * withRandomVertexOrCity :: (Point -> RoadSystem) -> (RoadSystem -> RoadSystem)
     */
    const withRandomVertexOrCity = (f) => (roadSystem) =>
        f(randomFromList(R.concat(s.cities, RoadSegment.vertices(roadSystem.segments))))
        (roadSystem)
        
        
    /**
     * splitAnd :: ([Point] -> [RoadSegment] -> (RoadSystem -> RoadSystem)) -> RoadSegment -> (RoadSystem -> RoadSystem)
     * 
     * Returns a function that, when given a road segment, creates a
     * road transformation function that splits the segment at a random point
     * and invokes function f.
     * 
     * The function will be invoked with:
     *      - a list of points: the split point and the two edges of the original segment
     *      - a list of segments: the two new segments after the split
     * and should return a road system transformation function (RoadSystem -> RoadSystem) 
     */
    const splitAnd = (f) => (oldSegment) =>
    {
        const pointOnLine = (a, b, x) => roundPoint(a.add(b.subtract(a).multiply(x)))
        const splitPoint = pointOnLine(oldSegment.from, oldSegment.to, Math.random())
        const segmentA = RoadSegment(oldSegment.from, splitPoint, oldSegment.quality)
        const segmentB = RoadSegment(oldSegment.to, splitPoint, oldSegment.quality)
        
        return R.pipe( RoadSystem.removeSegment(oldSegment),
                       RoadSystem.addSegment(segmentA),
                       RoadSystem.addSegment(segmentB),
                       f([splitPoint, oldSegment.from, oldSegment.to],
                         [segmentA, segmentB])
                       )
    }
    
    
    /**
     * split :: RoadSegment -> (RoadSystem -> RoadSystem)
     */
    const split = splitAnd(R.always(R.identity))
    
    
    /**
     * nudgeVertex :: Point -> (RoadSystem -> RoadSystem)
     */
    const nudgeVertex = (p) => RoadSystem.moveVertex(p, randomPointAround(p, randomPointRange))

    
    /**
     * changeRoadQuality :: RoadSegment -> (RoadSystem -> RoadSystem)
     */
    const changeRoadQuality = (s) => RoadSystem.changeRoadQuality(randomQuality(), s) // TODO: exclude current road quality as possibility.
    
    
    /**
     * extendSegment :: RoadSegment -> (RoadSystem -> RoadSystem)
     */
    const extendSegment = (p, quality) => RoadSystem.addSegment(RoadSegment(p, randomPointAround(p, randomPointRange), quality))
    
    
    /*
     Pick random mutation and apply it to the road system
     */
            
    const mutators = [
        withRandomVertexOrCity(extendSegment),
        withRandomVertex(nudgeVertex),
        withRandomVertex(RoadSystem.removeVertex),
        withRandomSegment(RoadSystem.removeSegment),
        withRandomSegment(split),
        withRandomSegment(splitAnd((ps, ss) => extendSegment(ps[0], ss[0].quality))),
        withRandomSegment(splitAnd((ps, ss) => changeRoadQuality(randomFromList(ss)))),
        withRandomSegment(splitAnd((ps, ss) => nudgeVertex(randomFromList(ps)))),
        withRandomSegment(changeRoadQuality)
        ]
    
    const mutator = randomFromList(mutators)
    
    return mutator(s.roads)
}
