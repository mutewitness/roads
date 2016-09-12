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
{
    /* create transformer to change the selected city's location
    to the unprojected coordinates of the mouse cursor. */
    const problemTransformer = ProblemDescription.setCity(
        s.selectedCity, GUI.unproject(event.point))

    return R.when(
        (s) => -1 != s.selectedCity,
        R.pipe(GUI.transformProblem()(problemTransformer), GUI.updateCities)
        )(s)
}


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

    const MutableState = {
        s: GUI.newState(),
        transform: (f) => (event) => { MutableState.s = f(event)(MutableState.s) }
    }

    /* setup event handlers */

    view.onFrame            = MutableState.transform(GUI.onFrame)
    view.onMouseDown        = MutableState.transform(GUI.onMouseDown)
    view.onMouseUp          = MutableState.transform(GUI.onMouseUp)
    view.onMouseDrag        = MutableState.transform(GUI.onMouseDrag)

    document.onmouseup      = MutableState.transform(GUI.onDocumentMouseUp)
    document.onmousedown    = MutableState.transform(GUI.onDocumentMouseDown)
    document.onmousemove    = MutableState.transform(GUI.onDocumentMouseMove)

    elementById('btn-start').onclick = MutableState.transform(GUI.onButtonStartClicked)
    elementById('btn-reset').onclick = MutableState.transform(GUI.onButtonResetClicked)
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
    elementById('btn-start').innerHTML = s.running ? 'Pause' : 'Start';

    /* update the visual slider values to reflect the normalized weights. */
    R.zip(GUI.sliders(), GUI.applyCustomWeights([1,1,1]))
        .forEach((tup) => tup[0].value = tup[1])

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
    const pathOptions   = (segment) => ({segments: [segment.from, segment.to].map(GUI.project),
                                         layer: s.layers.road})
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
    elementById('evolutions').innerHTML = s.appState.evolution;
    return s
}


curryAll(GUI)
