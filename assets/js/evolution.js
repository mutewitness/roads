/**
 * ================================================================================
 *
 *  The genetic algorithm.
 *
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
            s.problem.evaluators.map((f) => f(s)),
            s)


/**
 * mutate :: State -> State
 *
 * Mutates the road system and returns a new (evaluated) state object.
 */
Evolution.mutate = (s) =>
{
    // TODO: attention mutation.
    // TODO: variant createSegment that connects to existing point around selected one?

    /*
     Mutation helper functions.
     */

    const E                 = Evolution
    const RS                = RoadSystem
    const splitAnd          = E.splitAnd
    const split             = splitAnd(R.always(R.identity))
    const nudgeVertex       = (p) => RS.moveVertex(p, E.randomPointAround(p))
    const changeRoadQuality = RS.changeRoadQuality(E.randomQuality()) // TODO: exclude current road quality as possibility.
    const createSegment     = (p, quality) => RS.addSegment(RoadSegment(p, E.randomPointAround(p), quality))

     /*
     Pick random mutation and apply it to the road system
     */

    const mutators = [
        E.pickRandomVertexOrCityAnd(s.problem.cities, createSegment),
        E.pickRandomVertexAnd(nudgeVertex),
        E.pickRandomVertexAnd(RS.removeVertex),
        E.pickRandomSegmentAnd(RS.removeSegment),
        E.pickRandomSegmentAnd(split),
        E.pickRandomSegmentAnd(splitAnd((ps, ss) => createSegment(ps[0], ss[0].quality))),
        E.pickRandomSegmentAnd(splitAnd((ps, ss) => changeRoadQuality(pickRandom(ss)))),
        E.pickRandomSegmentAnd(splitAnd((ps, ss) => nudgeVertex(pickRandom(ps)))),
        E.pickRandomSegmentAnd(changeRoadQuality)
        ]

    const mutator = pickRandom(mutators)

    return State.setRoadSystem()(mutator(s.roads))(s)
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
    const newState          = Evolution.mutate(s)
    const costFunction      = (s) => R.sum(weightFunction(s.currentCost))
    const shouldPromote     = (costFunction(newState) < costFunction(s))
    const nextState         = shouldPromote ? newState : s
    const increaseCounter   = R.over(R.lensProp('evolution'), R.inc)

    return increaseCounter(nextState)
}


/**
 * randomPointRange :: int
 */
Evolution.randomPointRange = 3


/**
 * randomPointAround :: Point -> Point
 */
Evolution.randomPointAround = (p) =>
{
    const r = Evolution.randomPointRange
    return p.add(new Point(
        -r+randomInt(2*r+1),
        -r+randomInt(2*r+1)))
}


/**
 * randomQuality :: int
 */
Evolution.randomQuality = () =>
    randomInt(RoadQuality.SUPER_HIGHWAY+1)


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
Evolution.splitAnd = (f) => (oldSegment) =>
{
    const pointOnLine = (a, b, x) => roundPoint(a.add(b.subtract(a).multiply(x)))
    const splitPoint  = pointOnLine(oldSegment.from, oldSegment.to, Math.random())
    const segmentA    = RoadSegment(oldSegment.from, splitPoint, oldSegment.quality)
    const segmentB    = RoadSegment(oldSegment.to, splitPoint, oldSegment.quality)

    return R.pipe(
        RoadSystem.removeSegment(oldSegment),
        RoadSystem.addSegment(segmentA),
        RoadSystem.addSegment(segmentB),
        f([splitPoint, oldSegment.from, oldSegment.to],
          [segmentA, segmentB]))
}


/**
 * pickRandomSegmentAnd :: (RoadSegment -> RoadSystem) -> (RoadSystem -> RoadSystem)
 */
Evolution.pickRandomSegmentAnd = (f) => (roadSystem) =>
    ((roadSystem.segments.length > 0)
        ? f(pickRandom(roadSystem.segments))
        : R.identity)
    (roadSystem)


/**
 * pickRandomVertexAnd :: (Point -> RoadSystem) -> (RoadSystem -> RoadSystem)
 */
Evolution.pickRandomVertexAnd = (f) => (roadSystem) =>
    ((roadSystem.segments.length > 0)
        ? f(pickRandom(RoadSegment.vertices(roadSystem.segments)))
        : R.identity)
    (roadSystem)


/**
 * pickRandomVertexOrCityAnd :: [Point] -> (Point -> RoadSystem) -> (RoadSystem -> RoadSystem)
 */
Evolution.pickRandomVertexOrCityAnd = (cities, f) => (roadSystem) =>
    f(pickRandom(R.concat(cities, RoadSegment.vertices(roadSystem.segments))))
    (roadSystem)


curryAll(Evolution)
