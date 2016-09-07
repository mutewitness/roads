/**
 * FinancialEvaluator :: State -> float
 */
function FinancialEvaluator(s)
{
    const constructionCost = [1.0, 2.0, 4.0]
    const roadLength       = (segment) => pointPointDistance(segment.from, segment.to)
    const segmentCost      = (segment) => roadLength(segment) * constructionCost[segment.quality]

    // The maximum possible cost cost for given segment (constructing highways everywhere)
    const maximumCost      = (line) => segmentCost(RoadSegment(line[0], line[1], RoadQuality.SUPER_HIGHWAY))

    return sumBy(segmentCost, s.roads.segments) / sumBy(maximumCost, s.trainingSet)
}
