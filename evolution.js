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
 * evaluate :: State -> State
 * 
 * Re-evaluates what the cost is of the given state
 * (according to the installed evaluators)
 */
Evolution.evaluate = (s) =>
    R.assoc('currentCost',
            s.config.evaluators.map((f) => f(s)),
            s)


/**
 * mutate :: State -> State
 * 
 * Mutates the road system and returns a new (evaluated) state object.
 */
Evolution.mutate = (s) =>
{
    // TODO: attention mutation.
    // TODO: variant extendSegment that connects to existing point around selected one?

    /*
     Mutation helper functions.
     */
    
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
    const nudgeVertex = (p) => RoadSystem.moveVertex(p, Evolution.randomPointAround(p, Evolution.randomPointRange))

    
    /**
     * changeRoadQuality :: RoadSegment -> (RoadSystem -> RoadSystem)
     */
    const changeRoadQuality = (s) => RoadSystem.changeRoadQuality(Evolution.randomQuality(), s) // TODO: exclude current road quality as possibility.
    
    
    /**
     * extendSegment :: RoadSegment -> (RoadSystem -> RoadSystem)
     */
    const extendSegment = (p, quality) => RoadSystem.addSegment(RoadSegment(p, Evolution.randomPointAround(p, Evolution.randomPointRange), quality))
    
    
    /*
     Pick random mutation and apply it to the road system
     */
            
    const mutators = [
        Evolution.withRandomVertexOrCity(s.cities, extendSegment),
        Evolution.withRandomVertex(nudgeVertex),
        Evolution.withRandomVertex(RoadSystem.removeVertex),
        Evolution.withRandomSegment(RoadSystem.removeSegment),
        Evolution.withRandomSegment(split),
        Evolution.withRandomSegment(splitAnd((ps, ss) => extendSegment(ps[0], ss[0].quality))),
        Evolution.withRandomSegment(splitAnd((ps, ss) => changeRoadQuality(randomFromList(ss)))),
        Evolution.withRandomSegment(splitAnd((ps, ss) => nudgeVertex(randomFromList(ps)))),
        Evolution.withRandomSegment(changeRoadQuality)
        ]
    
    const mutator = randomFromList(mutators)
    
    return State.setRoadSystem(mutator(s.roads))(s)
}


/**
 * nextIteration :: ([float] -> [float]) -> State -> State
 * 
 * Returns the next iteration in evolution of the given state.
 * 
 * A custom weight function is applied to the final cost before
 * promoting or discarding the new road system fabricated through evolution.
 */
Evolution.nextIteration = (weightFunction, s) =>
{
    /**
     * selectNewState :: State -> State
     */
    function selectNewState(s)
    {
        const newState = Evolution.mutate(s)
        const costFunction = (s) => R.sum(weightFunction(s.currentCost))
        const promote = (costFunction(newState) < costFunction(s))
        return (promote) ? newState : s
    }

    const increaseCounter = R.over(R.lensProp('evolution'), R.inc)
            
    return increaseCounter(selectNewState(s))
}


/**
 * randomPointRange :: int
 */
Evolution.randomPointRange = 3


/**
 * randomPointAround :: Point -> int -> Point
 */
Evolution.randomPointAround = (p, r) =>
    p.add(new Point(-r+randomInt(2*r+1),
                    -r+randomInt(2*r+1)
                    ))
                    

/**
 * randomQuality :: int
 */
Evolution.randomQuality = () => randomInt(RoadSegment.SUPER_HIGHWAY+1)


/**
 * withRandomSegment :: (RoadSegment -> RoadSystem) -> (RoadSystem -> RoadSystem)
 */
Evolution.withRandomSegment = (f) => (roadSystem) =>
    ((roadSystem.segments.length > 0)
        ? f(randomFromList(roadSystem.segments))
        : R.identity)
    (roadSystem)
    
    
/**
 * withRandomVertex :: (Point -> RoadSystem) -> (RoadSystem -> RoadSystem)
 */
Evolution.withRandomVertex = (f) => (roadSystem) =>
    ((roadSystem.segments.length > 0)
        ? f(randomFromList(RoadSegment.vertices(roadSystem.segments)))
        : R.identity)
    (roadSystem)
    
    
/**
 * withRandomVertexOrCity :: [Point] -> (Point -> RoadSystem) -> (RoadSystem -> RoadSystem)
 */
Evolution.withRandomVertexOrCity = (cities, f) => (roadSystem) =>
    f(randomFromList(R.concat(cities, RoadSegment.vertices(roadSystem.segments))))
    (roadSystem)
    
    
curryAll(Evolution)
