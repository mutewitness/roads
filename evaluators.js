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
 * CommuteTimeEvaluator :: State -> float
 */
function CommuteTimeEvaluator(s)
{
    const noRoadTravelTime  = 10.0
    const travelTime        = [3.0, 1.5, 1.0]
      
    /*
     * commuteCost :: (Point,Point) -> float
     */ 
    function commuteCost(line) 
    {
        const path       = RoadSystem.path(line[0], line[1], s.roads)
        const segments   = R.zip(path, R.tail(path)).map((pair) => RoadSystem.findSegment(pair[0], pair[1], s.roads))
        const onTheRoad  = R.reduce((acc, segment) => acc + travelTime[segment.quality] * segment.length, 0, segments)
        const offTheRoad = noRoadTravelTime * (pointPointDistance(line[0], R.head(path)) +
                                               pointPointDistance(line[1], R.last(path))) 
        return onTheRoad + offTheRoad
    }
  
    // The maximum possible travel cost for given segment (having no roads at all)
    const maximumCost = (line) => noRoadTravelTime * pointPointDistance(line[0], line[1])
  
    return R.sum(s.trainingSet.map(commuteCost)) / R.sum(s.trainingSet.map(maximumCost))
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
    const maximumCost = (line) => segmentCost(RoadSegment(line[0], line[1], RoadSegment.SUPER_HIGHWAY))
      
    return R.sum(s.roads.segments.map(segmentCost)) / R.sum(s.trainingSet.map(maximumCost)) 
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
    
    const cityNoise = (city) => R.reduce((acc, segment) => acc + segmentNoise(city, segment), 0, s.roads.segments)
    
    // The maximum possible cost for given city. (having an highway at zero distance)
    const maximumCost = s.cities.length * roadQualityNoise[RoadSegment.SUPER_HIGHWAY]
  
    return R.sum(s.cities.map(cityNoise)) / maximumCost
}
