/**
 * ================================================================================
 *
 *  The graphical user interface code and GUI state object.
 *
 * ================================================================================
 */

/*
All GUI functions are dirty in the sense that they produce side-effects
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
 * GUI.State :: State -> GUI.State
 */
GUI.State = (s) => ({
    /**
     * appState :: State
     */
    appState: s,

    /**
     * layers :: {k: Layer (Paper)}
     */
    layers: {},

    /**
     * running: bool
     */
    running: false,

    /**
     * selectedCity :: int
     */
    selectedCity: -1,

    /**
     * userInteracting :: bool
     */
    userInteracting: false
})


/**
 * applyCustomWeights :: [float] -> [float]
 * Applies user-defined weights (the sliders) to the given vector
 * and returns a new vector.
 */
GUI.applyCustomWeights = (xs) =>
{
    const weightScalar = R.compose(parseFloat, R.prop('value'))
    const w = normalizeVector(GUI.sliders().map(weightScalar))
    return multiplyVectors(w, xs)
}


/**
 * createLayers :: GUI.State -> GUI.State
 */
GUI.createLayers = (s) =>
{
    project.clear()

    return R.assoc('layers', {
        map: new Layer({opacity:0.1}),
        roads: new Layer(),
        cities: new Layer(),
    }, s)
}


/**
 * newProblemDescription :: () -> ProblemDescription
 */
GUI.newProblemDescription = () =>
    ProblemDescription.randomizeCities(30, ProblemDescription({
        evaluators  : [CommuteTimeEvaluator,
                       FinancialEvaluator,
                       NoiseEvaluator],
        mapSize     : new Size(90, 60)}))


/**
 * newState :: () -> GUI.State
 */
GUI.newState = () =>
    R.pipe( GUI.newProblemDescription,
            State.newState,
            GUI.State,
            GUI.createLayers,
            GUI.updateMap,
            GUI.updateCities,
            GUI.updateRoads,
            GUI.updateStatistics,
            GUI.updateControls
           ) ()


/**
 * nextIteration :: GUI.State -> GUI.State
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
 * onButtonStartClicked :: (event) -> GUI.State -> GUI.State
 */
GUI.onButtonStartClicked = (ev, s) =>
    GUI.updateControls(R.over(R.lensProp('running'), R.not, s))


/**
 * onButtonResetClicked :: (event) -> GUI.State -> GUI.State
 */
GUI.onButtonResetClicked = (ev, s) =>
    GUI.newState()


/**
 * onDocumentMouseDown :: (event) -> GUI.State -> GUI.State
 */
GUI.onDocumentMouseDown = (ev, s) =>
    R.assoc('userInteracting', true, s)


/**
 * onDocumentMouseUp :: (event) -> GUI.State -> GUI.State
 */
GUI.onDocumentMouseMove = (ev, s) =>
    R.when(R.prop('userInteracting'),
           GUI.updateControls)(s)


/**
 * onDocumentMouseUp :: (event) -> GUI.State -> GUI.State
 */
GUI.onDocumentMouseUp = (ev, s) =>
    R.assoc('userInteracting', false, s)


/**
 * onFrame :: (event) -> GUI.State -> GUI.State
 */
GUI.onFrame = (ev) =>
    R.when((s) => (s.running && !s.userInteracting),
           GUI.nextIteration())


/**
 * onMouseDown :: MouseEvent -> GUI.State -> GUI.State
 */
GUI.onMouseDown = (event) => (s) => {
    const hit = s.layers.cities.hitTest(event.point)
    const selectedCity = (hit) ? hit.item.index : -1
    return R.assoc('selectedCity', selectedCity, s)
}


/**
 * onMouseUp :: MouseEvent -> GUI.State -> GUI.State
 */
GUI.onMouseUp = (event) =>
    R.when((s) => -1 != s.selectedCity,
            R.pipe(R.assoc('selectedCity', -1),
                   GUI.transformState(State.newTrainingSet),
                   GUI.updateCities))


/**
 * onMouseDrag :: MouseEvent -> GUI.State -> GUI.State
 */
GUI.onMouseDrag = (event) => (s) =>
    R.when((s) => -1 != s.selectedCity,
           R.pipe(GUI.transformProblem()(ProblemDescription.setCity(s.selectedCity, GUI.unproject(event.point))),
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

    const transformStateWith = (f) => (event) => { s = f(event)(s) }
    const onClick = (id) => (f) => elementById(id).addEventListener('click', f)

    view.onFrame      = transformStateWith(GUI.onFrame)
    view.onMouseDown  = transformStateWith(GUI.onMouseDown)
    view.onMouseUp    = transformStateWith(GUI.onMouseUp)
    view.onMouseDrag  = transformStateWith(GUI.onMouseDrag)

    document.addEventListener('mouseup', transformStateWith(GUI.onDocumentMouseUp))
    document.addEventListener('mousedown', transformStateWith(GUI.onDocumentMouseDown))
    document.addEventListener('mousemove', transformStateWith(GUI.onDocumentMouseMove))

    onClick('btn-start')(transformStateWith(GUI.onButtonStartClicked))
    onClick('btn-reset')(transformStateWith(GUI.onButtonResetClicked))
}


/**
 * sliders :: () -> [DOMElement]
 */
GUI.sliders = () => ['w0', 'w1', 'w2'].map(elementById)


/**
 * transformProblem :: (ProblemDescription -> ProblemDescription) -> (GUI.State -> GUI.State)
 *
 * Applies given transformation function to the problem description and
 * wraps it in a new GUI state.
 */
GUI.transformProblem = () =>
    R.compose(GUI.transformState, State.transformProblem)


/**
 * transformState :: (State -> State) -> (GUI.State -> GUI.State)
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
 * updateCities :: GUI.State -> GUI.State
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
 * updateStatistics :: GUI.State -> GUI.State
 */
GUI.updateControls = (s) =>
{
    elementById('btn-start').innerText = s.running ? 'Pause' : 'Start';

    /* update the visual slider values to reflect the normalized weights. */
    const w = GUI.applyCustomWeights([1,1,1])
    GUI.sliders().forEach((el, i) => el.value = w[i])

    return s
}


/**
 * updateMap :: GUI.State -> GUI.State
 *
 * Create Paper.js objects for the map.
 */
GUI.updateMap = (s) =>
{
    const mapSize           = s.appState.problem.mapSize
    const projectedSize     = GUI.project(new Point(mapSize))
    const style             = R.merge(GUI.styles.grid, {layer: s.layers.map})
    const verticalLine      = (i)   => [new Point(i, 0), new Point(i, mapSize.height)]
    const horizontalLine    = (i)   => [new Point(0, i), new Point(mapSize.width, i)]
    const pathOf            = (lst) =>  new Path(R.merge(style, {segments: lst.map(GUI.project)}))

    view.viewSize = new Size(projectedSize)

    s.layers.map.activate()
    s.layers.map.removeChildren()

    R.times(R.compose(pathOf, verticalLine), mapSize.width)
    R.times(R.compose(pathOf, horizontalLine), mapSize.height)

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
 * updateRoads :: GUI.State -> GUI.State
 *
 * Create Paper.js objects for all road segments.
 */
GUI.updateRoads = (s) =>
{
    const style         = (segment) => GUI.styles.roads[segment.quality]
    const pathOptions   = (segment) => ({segments: [segment.from, segment.to].map(GUI.project), layer: s.layers.road})
    const createPath    = (segment) => new Path(R.merge(style(segment), pathOptions(segment)))

    s.layers.roads.activate()
    s.layers.roads.removeChildren()

    s.appState.roads.segments.forEach(createPath)

    return s
}


/**
 * updateStatistics :: GUI.State -> GUI.State
 */
GUI.updateStatistics = (s) =>
{
    elementById('evolutions').innerText = s.appState.evolution;
    return s
}


curryAll(GUI)
