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
 * TravelTimeEvaluator :: State -> float
 */
function TravelTimeEvaluator(s)
{
    const travelTime        = (quality) => [1.0, 0.5, 0.1][quality]
    const noRoadTravelTime  = 10.0
      
   /*
    * costOfSegment :: Segment -> float
    */ 
   const commuteCost = (line) => 
   {
       const path           = RoadSystem.path(line[0], line[1], s.roads)
       const segments       = R.zip(path, R.tail(path)).map((pair) => RoadSystem.findSegment(pair[0], pair[1], s.roads))
       const onTheRoad      = R.sum(segments.map((segment) => travelTime(segment.quality) * RoadSegment.distance(segment)))
       const offTheRoad     = noRoadTravelTime * (pointPointDistance(line[0], R.head(path)) + pointPointDistance(line[1], R.last(path))) 
          
       return onTheRoad + offTheRoad
   }
  
   /*
    * maximumCost :: Segment -> float
    * Returns maximum possible travel cost for given segment.
    * (having no roads at all)
    */
    const maximumCost = (segment) =>
        noRoadTravelTime * pointPointDistance(segment[0], segment[1])
  
    return R.sum(s.trainingSet.map(commuteCost)) / R.sum(s.trainingSet.map(maximumCost))
}


/**
 * FinancialEvaluator :: State -> float
 */
function FinancialEvaluator(s)
{
    const constructionCost  = [1.0, 1.0, 3.0]
    const roadLength        = (segment) => pointPointDistance(segment.from, segment.to)
    const segmentCost       = (segment) => roadLength(segment) * constructionCost[segment.quality]
      
  /*
   * maximumCost :: Segment -> float
   * Returns maximum possible cost for given segment
   * (constructing highways everywhere)
   */
    const maximumCost = (segment) =>
        segmentCost(RoadSegment(segment[0], segment[1], RoadSegment.HIGHWAY))
      
    return R.sum(s.roads.segments.map(segmentCost)) / R.sum(s.trainingSet.map(maximumCost)) 
}


/**
 * NoiseEvaluator :: State -> float
 */
function NoiseEvaluator(s)
{
    const roadQualityNoise  = (quality) => [0.1, 2.0, 3.0][quality]
    const halfLife          = 1
    const noiseFromRoad     = (city) => (segment) => roadQualityNoise(segment.quality) * Math.exp(-RoadSegment.distanceToPoint(city, segment)/halfLife)
    const cityNoise         = (city) => R.sum(s.roads.segments.map(noiseFromRoad(city)))
      
    /*
     * maximumCost :: Point -> float
     * Returns maximum possible cost for given city.
     * (having an highway at zero distance)
     */
    const maximumCost = s.cities.length * roadQualityNoise(RoadSegment.HIGHWAY)
  
    return R.sum(s.cities.map(cityNoise)) / maximumCost
}
