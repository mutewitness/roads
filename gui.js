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

/*
Note: All GUI functions are dirty in the sense that they produce side-effects
      by using the Paper framework.
*/

var GUI =
{
    projectionMatrix: null,
    styles: {
        grid: {
            strokeWidth: .5,
            strokeColor: 'black'
        },
        cities: {
            sides: 5,
            radius: 7,
            fillColor: 'white',
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
    appState    : s,
    layers      : {},
    running     : false,
    selectedCity: -1,
    userInteraction: false
})
    

/**
 * applyCustomWeights :: [float] -> [float]
 */
GUI.applyCustomWeights = (xs) =>
{
    const getWeight = R.compose(parseFloat, R.prop('value'))
    const w = normalizeVector(GUI.sliders().map(getWeight))
    return multiplyVectors(w, xs)
}


/**
 * createLayers :: GUIState -> GUIState 
 */
GUI.createLayers = (s) =>
{
    project.clear()
    
    return R.assoc('layers', {
        map     : new Layer({opacity:0.1}),
        roads   : new Layer(),
        cities  : new Layer(),
    }, s)
}

    
/**
 * newProblemDescription :: int -> ProblemDescription
 */
GUI.newProblemDescription = (n) =>
    ProblemDescription.randomizeCities(n, ProblemDescription({
        evaluators  : [CommuteTimeEvaluator,
                       FinancialEvaluator,
                       NoiseEvaluator],
        mapSize     : new Size(90, 60)
    }))
    

/**
 * newState :: () -> GUIState 
 */
GUI.newState = () => 
    R.pipe( GUI.newProblemDescription,
            State.newState,
            GUIState,
            GUI.createLayers,
            GUI.updateMap,
            GUI.updateCities,
            GUI.updateRoads,
            GUI.updateStatistics,
            GUI.updateControls
           ) (30)
        

/**
 * nextIteration :: GUIState -> GUIState
 */
GUI.nextIteration = () =>
{
    const stateAfterXSteps = (steps) => R.reduce(
            Evolution.nextIteration(GUI.applyCustomWeights),
            R.__,
            R.range(0, steps))
            
    return R.pipe(
        GUI.transformState(stateAfterXSteps(10)),
        GUI.updateStatistics,
        GUI.updateRoads
        )
}


/**
 * onButtonStartClicked :: GUIState -> GUIState
 */
GUI.onButtonStartClicked = (s) =>
    GUI.updateControls(
            R.over(R.lensProp('running'), R.not, s)
            )


/**
 * onButtonStartClicked :: GUIState -> GUIState
 */
GUI.onButtonResetClicked = (s) =>
    GUI.newState()
    
    
/**
 * onDocumentMouseDown :: GUIState -> GUIState
 */
GUI.onDocumentMouseDown = (s) =>
    R.assoc('userInteraction', true, s)


/**
 * onDocumentMouseUp :: GUIState -> GUIState
 */
GUI.onDocumentMouseMove = (s) =>
    R.when(R.prop('userInteraction'),
           GUI.updateControls)(s)
    
    
/**
 * onDocumentMouseUp :: GUIState -> GUIState
 */
GUI.onDocumentMouseUp = (s) =>
    R.assoc('userInteraction', false, s)
    

/**
 * onFrame :: GUIState -> GUIState 
 */
GUI.onFrame = () =>
    R.when( (s) => (s.running && !s.userInteraction),
            GUI.nextIteration() )


/**
 * onMouseDown :: MouseEvent -> GUIState -> GUIState
 */
GUI.onMouseDown = (event) => (s) => {
    const hit = s.layers.cities.hitTest(event.point)
    const selectedCity = (hit) ? hit.item.index : -1 
    return R.assoc('selectedCity', selectedCity, s)
}


/**
 * onMouseUp :: MouseEvent -> GUIState -> GUIState
 */
GUI.onMouseUp = (event) =>
    R.when((s) => -1 != s.selectedCity,
            R.pipe(R.assoc('selectedCity', -1),
                   GUI.transformState(State.newTrainingSet),
                   GUI.updateCities))

      
/**
 * onMouseDrag :: MouseEvent -> GUIState -> GUIState
 */
GUI.onMouseDrag = (event) => (s) =>
    R.when((s) => -1 != s.selectedCity,
           R.pipe(GUI.transformState(State.transformProblem(ProblemDescription.setCity(s.selectedCity, GUI.unproject(event.point)))),
                  GUI.updateCities
          ))(s)
    

/**
 * project :: Point -> Point
 * Project point to screen coordinates.
 */
GUI.project = (p) =>
    GUI.mapProjectionMatrix.transform(p)

    
/**
 * run :: () -> ()
 */
GUI.run = () =>
{
    /* setup Paper framework */
    
    paper.install(window)       // export paper classes into global namespace
    paper.setup('canvas')
    
    /* setup affine transformation matrix for projecting map to screen coordinates. */
    
    GUI.mapProjectionMatrix = new Matrix(10, 0, 0, 10, 0, 0)

    var s = GUI.newState()
    
    /* setup event handlers */
    
    view.onFrame        = (event) => { s = GUI.onFrame()(s) }
    view.onMouseDown    = (event) => { s = GUI.onMouseDown(event)(s) }
    view.onMouseUp      = (event) => { s = GUI.onMouseUp(event)(s) }
    view.onMouseDrag    = (event) => { s = GUI.onMouseDrag(event)(s) }
    
    document.addEventListener('mouseup', (event) => { s = GUI.onDocumentMouseUp(s) })
    document.addEventListener('mousedown', (event) => { s = GUI.onDocumentMouseDown(s) })
    document.addEventListener('mousemove', (event) => { s = GUI.onDocumentMouseMove(s) })
    document.getElementById('btn-start').addEventListener('click', (event) => { s = GUI.onButtonStartClicked(s) })
    document.getElementById('btn-reset').addEventListener('click', (event) => { s = GUI.onButtonResetClicked(s) })
}


/**
 * sliders :: () -> [DOMElement]
 */
GUI.sliders = () => {
    const sliderIds = ['w0', 'w1', 'w2']
    return sliderIds.map((id) => document.getElementById(id)) // cannot invoke directly?
}


/**
 * transformState :: (State -> State) -> (GUIState -> GUIState)
 * 
 * Applies given transformation function to the application state and
 * wraps it in a new GUI state.
 */
GUI.transformState = (f, s) =>
    R.assoc('appState', f(s.appState), s)


/**
 * unproject :: Point -> Point
 * Project point to map coordinates.
 */
GUI.unproject = (p) =>
    roundPoint(GUI.mapProjectionMatrix.inverseTransform(p))
    
    
/**
 * updateCities :: GUIState -> GUIState
 * 
 * Create Paper.js objects for all cities. 
 */
GUI.updateCities = (s) =>
{
    const style = R.merge(GUI.styles.cities,
                         {layer: s.layers.cities})
                         
    const createShape = (location) =>
        new Path.RegularPolygon(R.merge(
                style,
                {center: GUI.project(location)}
                ))
    
    s.layers.cities.activate()
    s.layers.cities.removeChildren()
    s.appState.problem.cities.forEach(createShape)
    
    return s
}


/**
 * updateStatistics :: GUIState -> GUIState
 */
GUI.updateControls = (s) =>
{
    document.getElementById('btn-start').innerText = s.running ? 'Pause' : 'Start';
    
    /* update the visual slider values to reflect the normalized weights. */
    const w = GUI.applyCustomWeights([1,1,1])
    GUI.sliders().forEach((el, i) => el.value = w[i])
    
    return s
}


/**
 * updateMap :: GUIState -> GUIState
 * 
 * Create Paper.js objects for the map. 
 */
GUI.updateMap = (s) =>
{
    const mapSize = s.appState.problem.mapSize
    
    const projectedSize = GUI.project(new Point(mapSize))
    view.viewSize = new Size(projectedSize)
    
    const style = R.merge(GUI.styles.grid,
                          {layer: s.layers.map})
                          
    const createVerticalLine = (i) => [new Point(i, 0), new Point(i, mapSize.height)]
    const createHorizontalLine = (i) => [new Point(0, i), new Point(mapSize.width, i)]
    const createPath = (lst) => new Path(R.merge(style, {segments: lst.map(GUI.project)}))

    s.layers.map.activate()
    s.layers.map.removeChildren()
    
    R.times(R.compose(createPath, createVerticalLine), mapSize.width)
    R.times(R.compose(createPath, createHorizontalLine), mapSize.height)
    
    // --------------------------------------------------------------------------------
    
    //    const roadQualityNoise = [1,1,1]
    //    const occupiedTiles = (segment) =>
    //        R.fromPairs(raytrace(segment.from, segment.to)
    //         .map((p) => [RoadSystem.keyOfPoint(p),
    //                      roadQualityNoise[segment.quality]]
    //             ))
    //    
    //    const createNoiseMap = R.reduce((m, segment) =>
    //        R.mergeWith(R.max, m, occupiedTiles(segment)), {})
    //        
    //    const noiseMap = createNoiseMap(s.appState.roads.segments)
    //    
    //    const createTile = (key, value) => {
    //        var xy = key.split('|'),
    //            p0 = GUI.project(new Point(parseInt(xy[0]), parseInt(xy[1]))),
    //            p1 = GUI.project(new Point(parseInt(xy[0])+1, parseInt(xy[1])+1))
    //        new Path.Rectangle({from: p0, to: p1, fillColor: '#ff0000'})
    //    }
    //    
    //    R.mapObjIndexed(
    //            (value, key, obj) => createTile(key, value),
    //            noiseMap)
        
    // --------------------------------------------------------------------------------
    
    return s
}


/**
 * updateRoads :: GUIState -> GUIState
 * 
 * Create Paper.js objects for all road segments.
 */
GUI.updateRoads = (s) =>
{
    const style = (segment) => R.merge(
            GUI.styles.roads[segment.quality],
            {layer: s.layers.road})
    
    const createPath = (segment) => new Path(R.merge(
            style(segment),
            { segments: [segment.from, segment.to].map(GUI.project) }
            ))
    
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
