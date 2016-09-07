/**
 * ================================================================================
 *
 *  Cost evaluators for the genetic algorithm.
 *
 * ================================================================================
 */

/**
 * CommuteTimeEvaluator :: State -> float
 */
function CommuteTimeEvaluator(s)
{
    const missingRoadPenalty = 10.0
    const travelTimeCost = [3.0, 1.5, 1.0]

    // commuteCost :: (Point,Point) -> float
    function commuteCost(line)
    {
        /*
        Query all segments we would travel on if going from
        point line[0] to line[1], and multiply their lengths
        by the travel time factor as defined in travelTimeCost
        (depending on the quality of the road.)

        The first and last parts of the route are possibly off-road.
        Apply a penalty.
         */

        /* First query all road vertices we would travel on if going from point line[0] to line[1]. */
        const path = RoadSystem.path(line[0], line[1], s.roads)

        /* Find all segments between the vertices on the path. */
        const segments = R.zip(path, R.tail(path)).map(
            (pair) => RoadSystem.findSegment(pair[0], pair[1], s.roads))

        /* Sum the travel time cost of all found segments. */
        const segmentCost = (segment) => travelTimeCost[segment.quality] * segment.length
        const totalCost = sumBy(segmentCost, segments)

        /* Calculate the cost for missing segments */
        const penalty = missingRoadPenalty * (pointPointDistance(line[0], R.head(path)) + pointPointDistance(line[1], R.last(path)))

        return totalCost + penalty
    }

    // The maximum possible travel cost for given segment (having no roads at all)
    const maximumCost = (line) => missingRoadPenalty * pointPointDistance(line[0], line[1])

    return sumBy(commuteCost, s.trainingSet) / sumBy(maximumCost, s.trainingSet)
}


/**
 * FinancialEvaluator :: State -> float
 */
function FinancialEvaluator(s)
{
    const constructionCost  = [1.0, 2.0, 4.0]
    const roadLength        = (segment) => pointPointDistance(segment.from, segment.to)
    const segmentCost       = (segment) => roadLength(segment) * constructionCost[segment.quality]

    // The maximum possible cost cost for given segment (constructing highways everywhere)
    const maximumCost = (line) => segmentCost(RoadSegment(line[0], line[1], RoadQuality.SUPER_HIGHWAY))

    return sumBy(segmentCost, s.roads.segments) / sumBy(maximumCost, s.trainingSet)
}


/**
 * NoiseEvaluator :: State -> float
 */
function NoiseEvaluator(s)
{
    const halfDistance = 2
    const roadQualityNoise = [0, 1.0, 3.0] // no noise for ordinary roads to facilitate generation of roads at all)

    /**
     * segmentNoise :: Point -> Segment -> float
     */
    function segmentNoise(city, segment)
    {
        const qf = roadQualityNoise[segment.quality]
        const df = () => Math.exp(-(RoadSegment.distanceToPoint(city, segment)*segment.length)/halfDistance)
        return (qf > 0) ? qf * df() : 0
    }

    // TODO: use noise map based approach to determining city noise factors.
    // (looping over each segment for every city does not scale well.)

    //    /* Build a noise map by mapping each road segment to a list
    //     of map coordinates the segment occupies.
    //     */
    //
    //    const occupiedTiles = (segment) =>
    //        R.fromPairs(raytrace(segment.from, segment.to)
    //         .map((p) => [RoadSystem.keyOfPoint(p),
    //                      roadQualityNoise[segment.quality]]
    //             ))
    //
    //    const noiseMap = R.reduce((m, segment) =>
    //        R.mergeWith(R.max, m, occupiedTiles(segment)), {})

    const cityNoise = (city) => sumBy(R.curry(segmentNoise)(city), s.roads.segments)

    // The maximum possible cost for given city. (having an highway at zero distance)
    const maximumCost = s.problem.cities.length * roadQualityNoise[RoadQuality.SUPER_HIGHWAY]

    return sumBy(cityNoise, s.problem.cities) / maximumCost
}
