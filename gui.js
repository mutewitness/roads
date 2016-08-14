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

window.onload = () =>
{
    /* setup Paper framework */
    
    paper.install(window)       // export paper classes into global namespace
    paper.setup('canvas')
    
    /* setup affine transformation matrix for projecting map to screen coordinates. */
    
    GUI.projectionMatrix = new Matrix(10, 0, 0, 10, 0, 0)

    var s = GUI.newState()
    
    /* setup event handlers */
    
    view.onFrame        = (event) => { s = GUI.nextIteration(s) }
    view.onMouseDown    = (event) => { s = GUI.onMouseDown(event, s) }
    view.onMouseUp      = (event) => { s = GUI.onMouseUp(event, s) }
    view.onMouseDrag    = (event) => { s = GUI.onMouseDrag(event, s) }
}

// --------------------------------------------------------------------------------

var GUI =
{
    selectedCity: -1,
    projectionMatrix: null,
    styles: {
        grid: {
            strokeWidth: .5,
            strokeColor: 'black'
        },
        cities: {
            sides: 5,
            radius: 7,
            fillColor: 'rgba(255, 255, 255, 1)',
            strokeColor: 'rgba(0, 0, 0, .5)',
            strokeWidth: 1.5
        },
        roads: [
          {strokeWidth: 0.5, strokeColor: '#808080'},
          {strokeWidth: 2.0, strokeColor: '#0080ff'},
          {strokeWidth: 5.0, strokeColor: '#0080ff'}
          ]
    }
}

// --------------------------------------------------------------------------------

/**
 * GUIState :: State -> GUIState
 */
const GUIState = (s) => ({
    appState: s,
    layers: {}
})
    

//--------------------------------------------------------------------------------
//
//  GUI functions
//
// --------------------------------------------------------------------------------

// All GUI functions are dirty in the sense that they produce side-effects
// by using the Paper framework.


/**
 * apply :: (State -> State) -> GUIState -> GUIState
 * 
 * Applies given transformation function to the application state and
 * wraps it in a new GUI state.
 */
GUI.apply = (f, s) =>
    R.assoc('appState', f(s.appState), s)

    
/**
 * applyCustomWeights :: [float] -> [float]
 */
GUI.applyCustomWeights = (xs) =>
{
    const getWeight = (id) => parseInt(document.getElementById(id).value)
    const w = ['w0', 'w1', 'w2'].map(getWeight)
    const sum = R.sum(w)
    return R.range(0, xs.length).map((i) => (w[i]/sum) * xs[i]) // TODO: get rid of range and map.
}


/**
 * createLayers :: GUIState -> GUIState 
 */
GUI.createLayers = (s) =>
    R.assoc('layers', {
        map: new Layer({opacity:0.1}),
        roads: new Layer(),
        cities : new Layer(),
    }, s)

    
    
/**
 * getConfig :: Config
 */
GUI.getConfig = () => Config({
    evaluators  : [TravelTimeEvaluator,
                   FinancialEvaluator,
                   NoiseEvaluator],
    numCities   : 20,
    mapSize     : new Size(100, 80)
})
    

/**
 * newState :: GUIState 
 */
GUI.newState = () => R.pipe(
        GUI.getConfig,
        State.newState,
        GUIState,
        GUI.createLayers,
        GUI.updateMap,
        GUI.updateCities
        )()


/**
 * nextIteration :: GUIState -> GUIState
 */
GUI.nextIteration = (s) =>
{
    const batch = 10 // number of iterations to apply
    
    const newState = R.reduce(
            State.nextIteration(GUI.applyCustomWeights),
            s.appState,
            R.range(0, batch) )
            
    return GUI.updateStatistics(
        (newState === s.appState)
            ? s
            : GUI.updateRoads(R.assoc('appState', newState, s)))
}


/**
 * onMouseDown :: MouseEvent -> GUIState -> GUIState
 */
GUI.onMouseDown = (event, s) => {
    const hit = s.layers.cities.hitTest(event.point)
    return R.assoc('selectedCity',
            (hit) ? hit.item.index : -1,
            s)
}


/**
 * onMouseUp :: MouseEvent -> GUIState -> GUIState
 */
GUI.onMouseUp = (event, s) =>
    R.when((s) => -1 != s.selectedCity,
            R.pipe(R.assoc('selectedCity', -1),
                    GUI.apply(State.newTrainingSet),
                    GUI.updateCities),
            s)

      
/**
 * onMouseDrag :: MouseEvent -> GUIState -> GUIState
 */
GUI.onMouseDrag = (event, s) =>
    R.when((s) => -1 != s.selectedCity,
           R.pipe( GUI.apply(State.setCity(s.selectedCity, GUI.unproject(event.point))),
                   GUI.updateCities ),
           s)
    

/**
 * project :: Point -> Point
 * Project point to screen coordinates.
 */
GUI.project = (p) =>
    GUI.projectionMatrix.transform(p)

    
/**
 * unproject :: Point -> Point
 * Project point to map coordinates.
 */
GUI.unproject = (p) =>
    roundPoint(GUI.projectionMatrix.inverseTransform(p))
    
    
/**
 * updateCities :: GUIState -> GUIState
 * 
 * Create Paper.js objects for all cities. 
 */
GUI.updateCities = (s) =>
{
    const style = R.merge(GUI.styles.cities, {layer: s.layers.cities})
    const createShape = (location) => new Path.RegularPolygon(R.merge(style, {center: GUI.project(location)}))
    
    s.layers.cities.activate()
    s.layers.cities.removeChildren()
    s.appState.cities.forEach(createShape)
    
    return s
}


/**
 * updateMap :: GUIState -> GUIState
 * 
 * Create Paper.js objects for the map. 
 */
GUI.updateMap = (s) =>
{
    const projectedSize = GUI.project(new Point(s.appState.config.mapSize))
    view.viewSize = new Size(projectedSize)
    
    const style                   = R.merge(GUI.styles.grid, {layer: s.layers.map})
    const createVerticalLine      = (i) => [new Point(i, 0), new Point(i, s.appState.config.mapSize.height)]
    const createHorizontalLine    = (i) => [new Point(0, i), new Point(s.appState.config.mapSize.width, i)]
    const createPath              = (lst) => new Path(R.merge(style, {segments: lst.map(GUI.project)}))

    s.layers.map.activate()
    s.layers.map.removeChildren()
    
    R.times(R.compose(createPath, createVerticalLine), s.appState.config.mapSize.width)
    R.times(R.compose(createPath, createHorizontalLine), s.appState.config.mapSize.height)
    
    return s
}


/**
 * updateRoads :: GUIState -> GUIState
 * 
 * Create Paper.js objects for all road segments.
 */
GUI.updateRoads = (s) =>
{
    const style = (segment) => R.merge(GUI.styles.roads[segment.quality], {layer: s.layers.road})
    const createPath = (segment) => new Path(R.merge(style(segment), { segments: [segment.from, segment.to].map(GUI.project) }))
    
    s.layers.roads.activate()
    s.layers.roads.removeChildren()
    s.appState.roads.segments.forEach(createPath)
    
    return s
}


/**
 * updateStatistics :: GUIState -> GUIState
 */
GUI.updateStatistics = (s) =>
{
    document.getElementById('evolutions').innerText = s.appState.evolution;
    return s
}


curryAll(GUI)
