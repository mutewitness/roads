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


/**
 * State :: ProblemDescription -> State
 *
 * Constructs a new state object.
 *
 * The state holds all information of this session, except
 * for GUI state variables (see GUIState)
 */
var State = (problem) => (
{
    /**
     * problem :: ProblemDescription
     */
    problem: problem,

    /**
     * currentCost :: [float]
     */
    currentCost: [],

    /**
     * evolution :: int
     */
    evolution: 0,

    /**
     * roads :: RoadSystem
     */
    roads: RoadSystem(),

    /**
     * [(Point,Point)]
     */
    trainingSet: []
})


/**
 * newState :: ProblemDescription -> State
 *
 * Returns a new state with random cities and training set.
 */
State.newState = (problem) =>
    State.newTrainingSet(State(problem))


/**
 * newTrainingSet :: State -> State
 *
 * Returns a new state with a random training set.
 * A training set consists of commute traffic between random cities.
 */
State.newTrainingSet = (s) =>
{
    /* for every city, pick a few target commute cities */
    const n = 3 // how many destinations per city?

    const validDestinations = (origin) => R.without([origin], s.problem.cities)
    const randomPath        = (origin) => [origin, pickRandom(validDestinations(origin))]
    const destinations      = (origin) => R.times(() => randomPath(origin), n)
    const newSet            = R.reduce((acc, value) => acc.concat(destinations(value)), [], s.problem.cities)

    return State.setTrainingSet(newSet, s)
}


/**
 * setRoadSystem :: RoadSystem -> State -> State
 */
State.setRoadSystem = (newRoadSystem, s) =>
    Evolution.evaluate(R.assoc('roads', newRoadSystem, s))


/**
 * setTrainingSet :: [(Point,Point)] -> State -> State
 */
State.setTrainingSet = (trainingSet, s) =>
    Evolution.evaluate(R.assoc('trainingSet', trainingSet, s))


/**
 * transformProblem :: (ProblemDescription -> ProblemDescription) -> (State -> State)
 *
 * Applies given transformation function to the problem and
 * wraps it in a new state.
 */
State.transformProblem = (f, s) =>
    R.assoc('problem', f(s.problem), s)


curryAll(State)
