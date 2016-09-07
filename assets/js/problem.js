/**
 * ProblemDescription :: {k: *} -> ProblemDescription
 */
var ProblemDescription = (opts) => R.merge(
{
    /**
     * cities :: [Point]
     */
    cities: [],

    /**
     * evaluators :: [State -> float]
     */
    evaluators: [],

    /**
     * mapSize :: Size
     */
    mapSize: new Size(0, 0)
}, opts)


/**
 * randomizeCities :: int -> ProblemDescription -> ProblemDescription
 *
 * Returns a new state with random cities.
 */
ProblemDescription.randomizeCities = (n, problem) =>
{
    const margin       = 1
    const mapSize      = problem.mapSize
    const randomScalar = (n) => margin + randomInt(n-2*margin)
    const randomPoint  = () => new Point(randomScalar(mapSize.width), randomScalar(mapSize.height))

    return ProblemDescription.setCities(
        R.times(randomPoint, n),
        problem)
}


/**
 * setCity :: int -> Point -> ProblemDescription -> ProblemDescription
 */
ProblemDescription.setCity = (id, location, problem) =>
    ProblemDescription.setCities(R.update(id, location, problem.cities))(problem)


/**
 * setCity :: [Point] -> ProblemDescription -> ProblemDescription
 */
ProblemDescription.setCities = (cities, problem) =>
    R.assoc('cities', cities, problem)


curryAll(ProblemDescription)
