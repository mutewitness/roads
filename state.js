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
 * Config :: {k: *} -> Config
 */
var Config = (opts) => R.merge(
{
    /**
     * evaluators :: [State -> float]
     */
    evaluators: [],
    
    /**
     * numCities :: int
     */
    numCities: 0,
    
    /**
     * mapSize :: Size
     */
    mapSize: new Size(0, 0)
}, opts)


/**
 * State :: Config -> State
 * 
 * Constructs a new state object.
 * 
 * The state holds all information of this session, except
 * for GUI state variables (see GUIState)
 */
var State = (config) => (
{
    /**
     * cities :: [Point]
     */
    cities: [],
    
    /**
     * config :: Config
     */
    config: config,
    
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
 * newCityLocations :: State -> State
 * 
 * Returns a new state with random cities.
 */
State.newCityLocations = (s) =>
{
    const margin = 1
    
    const randomPoint = () =>
        new Point( margin+randomInt(s.config.mapSize.width-2*margin),
                   margin+randomInt(s.config.mapSize.height-2*margin) )
        
    const newLocations = R.times(randomPoint, s.config.numCities)
    
    return State.setCities(newLocations, s)
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
    /* for every city, pick a few target commute cities. */
    
    function getTargetCommuteCities(origin) {
        const numDestinations = 3
        const validDestinations = R.without([origin], s.cities)
        return R.times(() => [origin, randomFromList(validDestinations)], numDestinations)
    }
    
    const newSet = R.reduce(
            (acc, value) => acc.concat(getTargetCommuteCities(value)),
            [], s.cities)
    
    return State.setTrainingSet(newSet, s)
}


/**
 * setCity :: int -> Point -> State -> State
 */
State.setCity = (id, location, s) =>
    State.setCities(R.update(id, location, s.cities))(s)

    
/**
 * setCity :: [Point] -> State -> State
 */
State.setCities = (cities, s) =>
    Evolution.evaluate(R.assoc('cities', cities, s))

    
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
    
    
    
curryAll(State)
