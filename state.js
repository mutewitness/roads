/**
 * ================================================================================
 * app.js - road system generation example
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

//--------------------------------------------------------------------------------
//
//  Application state
//
// --------------------------------------------------------------------------------

var Config = (opts) => R.merge({
    evaluators  : [],
    numCities   : 0,
    mapSize     : new Size(0, 0)
}, opts)


/**
 * State :: State
 */
var State = (config) => ({
    cities      : [],
    config      : config,
    currentCost : {},
    evolution   : 0,
    roads       : RoadSystem(),
    trainingSet : []
})

        
/**
 * evaluate :: State -> State
 * 
 * Re-evaluates what the cost is of the given state
 * (according to the installed evaluators)
 */
State.evaluate = (s) =>
    R.assoc('currentCost',
            s.config.evaluators.map((f) => f(s)),
            s)


/**
 * newCityLocations :: State -> State
 * 
 * Returns a new state with random cities.
 */
State.newCityLocations = (s) =>
{
    const randomPoint  = () => new Point(1+randomInt(s.config.mapSize.width-2), 1+randomInt(s.config.mapSize.height-2))
    const newLocations = R.times(randomPoint, s.config.numCities)
    return R.assoc('cities', newLocations, s)
}


/**
 * newState :: Config -> State
 * 
 * Returns a new state with random cities and training set.
 */
State.newState = (cfg) => R.pipe(
    State.newCityLocations,
    State.newTrainingSet
   ) (State(cfg))


/**
 * newTrainingSet :: State -> State
 * 
 * Returns a new state with a random training set.
 * A training set consists of commute traffic between random cities.
 */
State.newTrainingSet = (s) =>
{
    /* for every city, pick target commute cities. */
    const newSet = R.times(
            () => [randomFromList(s.cities), randomFromList(s.cities)],
            Math.ceil(3 * s.config.numCities)) 
    
    return State.evaluate(
        R.assoc('trainingSet', newSet, s))
}


/**
 * nextIteration :: ([float] -> [float]) -> State -> State
 * 
 * Returns the next iteration in evolution of the given state.
 * 
 * A custom weight function is applied to the final cost before
 * promoting or discarding the new road system fabricated through evolution.
 */
State.nextIteration = (weightFunction, s) =>
{
    function selectState(s)
    {
        const newState     = State.evaluate(State.setRoadSystem(Evolution.newRoadSystem(s), s), s)
        const costFunction = (s) => R.sum(weightFunction(R.values(s.currentCost)))
        const promote      = (costFunction(newState) <= costFunction(s))
        return (promote) ? newState : s
    }

    const increaseCounter = R.over(R.lensProp('evolution'), R.inc)
            
    return increaseCounter(selectState(s))
}


/**
 * setCity :: int -> Point -> State -> State
 */
State.setCity = (id, location, s) =>
    R.assoc('cities', R.update(id, location, s.cities), s)


/**
 * setRoadSystem :: RoadSystem -> State -> State
 */
State.setRoadSystem = (newRoadSystem, s) =>
    R.assoc('roads', newRoadSystem, s)
    
    
curryAll(State)
