/**
 * CommuteTimeEvaluator :: State -> float
 */
function CommuteTimeEvaluator(s)
{
    const missingRoadPenalty = 10.0
    const travelTimeCost     = [3.0, 1.5, 1.0]

    /*
    For every commute path in the training set,
    query all segments we would travel on and multiply their lengths
    by the travel time cost factor (depends on the road quality)

    The first and last parts of the route are possibly off-road.
    Apply a penalty to those instead.
    */

    // commuteCost :: (Point,Point) -> float
    function commuteCost(line)
    {
        const path        = RoadSystem.path(line[0], line[1], s.roads)
        const findSegment = (pair) => RoadSystem.findSegment(pair[0], pair[1], s.roads)
        const segments    = R.zip(path, R.tail(path)).map(findSegment)
        const segmentCost = (segment) => travelTimeCost[segment.quality] * segment.length
        const totalCost   = sumBy(segmentCost, segments)
        const penalty     = missingRoadPenalty * (pointPointDistance(line[0], R.head(path)) + pointPointDistance(line[1], R.last(path)))

        return totalCost + penalty
    }

    // The maximum possible travel cost for given segment (having no roads at all)
    const maximumCost = (line) => missingRoadPenalty * pointPointDistance(line[0], line[1])

    return sumBy(commuteCost, s.trainingSet) / sumBy(maximumCost, s.trainingSet)
}
