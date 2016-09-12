/**
 * NoiseEvaluator :: State -> float
 */
function NoiseEvaluator(s)
{
    const halfDistance     = 2
    const roadQualityNoise = [0, 1.0, 3.0] // no noise for ordinary roads to facilitate generation of roads at all)

    // segmentNoise :: Point -> Segment -> float
    function segmentNoise(city, segment)
    {
        const distance = RoadSegment.distanceToPoint(city, segment)
        const qf = roadQualityNoise[segment.quality]
        const df = () => Math.exp( -(distance * segment.length) / halfDistance )
        return (qf > 0) ? qf * df() : 0
    }

    // TODO: use noise map based approach to determining city noise factors.
    // (looping over each segment for every city does not scale well.)

    const cityNoise = (city) => sumBy(R.curry(segmentNoise)(city), s.roads.segments)

    // The maximum possible cost for given city. (having an highway at zero distance)
    const maximumCost = s.problem.cities.length * roadQualityNoise[RoadQuality.SUPER_HIGHWAY]

    return sumBy(cityNoise, s.problem.cities) / maximumCost
}
