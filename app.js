/**
 * ================================================================================
 * app.js - road system generation example
 * 
 * Demonstrates genetic algorithm for creating road systems based
 * on cost function.
 * 
 * Uses Rambda to emphasize a purer functional programming style in JavaScript.
 * Uses Paper.js for rendering of vector graphics. 
 *  
 * by Sander van de Merwe (sandervdmerwe@gmail.com)
 * ================================================================================
 */

var app = {}

// wait for document to be ready and start application.

window.onload = () => {
    
    paper.install(window) // export paper classes into global namespace
    
    app.config = {
        mapSize   : new Size(100, 50),
        numCities : 50,
        batchIterations : 0
    }
    app.state = {
        evolution: 0,
        cities: {
            locations: [],
            shapes: [],
            lookup: {}
        },
        roads: {
            system: new RoadSystem(),
            shapes: []
        },
        layers: {},
        trainingSet: []
    }
    
    app.setupGUI()
    app.startNew()
}

//================================================================================
//  Application code
//================================================================================

app.createLayers = function()
{
    var s = this.state
    s.layers = {
        'map': new Layer({opacity:0.1}),
        'roads': new Layer(),
        'cities': new Layer(),
    }
    return s
}

app.createMap = function()
{
    var s                       = this.state,
        mapSize                 = this.config.mapSize,
        style                   = { layer        : s.layers.map,
                                    strokeWidth  : 0.5,
                                    strokeColor  : 'black'
                                  },
        createVerticalLine      = (i) => new Path(R.merge({segments: [this.project(new Point(i, 0)), this.project(new Point(i, mapSize.height))]}, style)),
        createHorizontalLine    = (i) => new Path(R.merge({segments: [this.project(new Point(0, i)), this.project(new Point(mapSize.width, i))]}, style))

    s.layers.map.activate()
    s.layers.map.removeChildren()
    
    R.range(0, mapSize.width).forEach(createVerticalLine)
    R.range(0, mapSize.height).forEach(createHorizontalLine)
}

/**
 * Create Paper.js objects for all cities. 
 */
app.createCityShapes = function()
{
    var s                       = this.state,
        style                   = { layer          : s.layers.cities, 
                                    sides          : 5,
                                    radius         : 15,
                                    fillColor      : 'rgba(255, 255, 255, 1)',
                                    strokeColor    : 'rgba(0, 0, 0, .5)',
                                    strokeWidth    : 2 },
        createShape             = (location) => new Path.RegularPolygon(R.merge(style, {center: this.project(location)}))
    
    s.layers.cities.activate()
    s.layers.cities.removeChildren()
    s.cities.shapes = R.map(createShape, s.cities.locations)
    
    return s
}

/**
 * Create Paper.js objects for all road segments.
 */
app.createRoadShapes = function()
{
    var s                       = this.state,
        styles                  = [ {strokeWidth: 0.5, strokeColor: 'brown'},
                                    {strokeWidth: 2.0, strokeColor: 'brown'},
                                    {strokeWidth: 3.0, strokeColor: 'blue'}
                                  ],
        createShape             = (segment) => new Path(R.merge(
                                    { layer: s.layers.roads,  
                                      segments: [this.project(segment.from), this.project(segment.to)],
                                    },
                                    styles[segment.quality]))
    
    s.layers.roads.activate()
    s.layers.roads.removeChildren()
    s.roads.shapes = s.roads.system.segments().map(createShape)
    
    return s
}

/**
 * 
 */
app.evaluateRoadSystem = function(s, roadSystem)
{
    console.assert(null != roadSystem)
    
    var evaluators = {}
    
    evaluators['travel-time']   = (roadSystem) =>
    {
        var travelTimePerQuality= [5.0, 1.0, 0.1],
            noRoadTravelTime    = 1000.0
        
        return R.mean(s.trainingSet.map((segment) =>
        {
            var paths           = roadSystem.path(segment.from, segment.to),
                roads           = R.zip(paths, R.tail(paths)).map((pair) => roadSystem.findSegment(pair[0], pair[1])),
                segmentDistance = (segment) => segment.from.getDistance(segment.to)
                
            return 100 * R.sum(roads.map((segment) => travelTimePerQuality[segment.quality] * segmentDistance(segment)))
                    + noRoadTravelTime * segment.from.getDistance(R.head(paths))
                    + noRoadTravelTime * segment.to.getDistance(R.last(paths))
        }))
    }
    
    evaluators['costs']         = (roadSystem) =>
    {
        var constructionCost    = [0.1, 1.0, 5.0],
            fixedCostFactor     = 3,
            roadLength          = (segment) => segment.from.getDistance(segment.to)
        return R.sum(R.map((segment) => (fixedCostFactor+roadLength(segment)) * constructionCost[segment.quality],
                           roadSystem.segments()))  
    }
    
    evaluators['noise']         = (roadSystem) =>
    {
        var segments = roadSystem.segments() 
        
        if (segments.length > 0)
        {
            var cities          = this.state.cities.locations,
                roadQualityNoise= (quality) => [0, 1.0, 5.0][quality],
                halfLife        = 1,
                noiseFromRoad   = (city) => (segment) => roadQualityNoise(segment.quality) * Math.exp(-segment.distanceToPoint(city)/halfLife),
                cityNoise       = (city) => R.sum(R.map(noiseFromRoad(city), segments))
                
            return 100 * R.sum(R.map(cityNoise, cities))
            
        } else {
            return 0
        }
    }
    
    return R.map((f) => f(roadSystem), evaluators)
}

/**
 * 
 */
app.mutateRoadSystem = function(roadSystem)
{
    // TODO: attention.
    
    var RANGE = 5
    
    var s                       = this.state,
        mapSize                 = this.config.mapSize,
        allCities               = s.cities.locations,
        randomPointAround       = (p, r) => new Point(p.x-r+randomInt(2*r+1), p.y-r+randomInt(2*r+1)),
        randomQuality           = () => randomInt(RoadSegment.HIGHWAY+1),
        normalizePoint          = (p) => new Point(Math.round(p.x), Math.round(p.y)),
        pointOnLine             = (a, b, t) => normalizePoint(a.add(b.subtract(a).multiply(t))),
        allRoadVertices         = (roadSystem) => roadSystem.vertices(),
        randomPoint             = (roadSystem) => randomFromList(R.concat(allCities, allRoadVertices(roadSystem))),
        //randomPointInRange      = (roadSystem, p, r) => randomFromList(R.filter((q) => q.getDistance(p) <= r, R.concat(allCities, allRoadVertices(roadSystem))))
        randomPointInRange      = (roadSystem, p, r) => randomPointAround(p, r) // FIXME: original impl. could return undefined
        realRandomPoint         = () => new Point(randomInt(mapSize.width), randomInt(mapSize.height))
        
    function createSegment(roadSystem)
    {
          var p = randomPoint(roadSystem)
          return roadSystem.addSegment(new RoadSegment(
                  p, randomPointInRange(roadSystem, p, RANGE), randomQuality()))
    }
        
    function extendSegment(roadSystem) {
          var p = randomPoint(roadSystem)
          return roadSystem.addSegment(new RoadSegment(p, randomPointInRange(roadSystem, p, RANGE), randomQuality()))
    }
        
    function removeRandomPoint(roadSystem) {
        var segments = roadSystem.segments()
        return (segments.length > 0)
            ? roadSystem.removeSegment(randomFromList(segments))
            : roadSystem;
    }
        
    function splitRandomSegment(roadSystem) {
        var segments = roadSystem.segments()
        if (segments.length > 0)
        {
            var oldSegment      = randomFromList(segments),
                newPoint        = randomPointInRange(roadSystem, pointOnLine(oldSegment.from, oldSegment.to, Math.random()), RANGE),
                newSegment1     = new RoadSegment(oldSegment.from, newPoint, oldSegment.quality),
                newSegment2     = new RoadSegment(oldSegment.to, newPoint, oldSegment.quality),
                newSegment3     = new RoadSegment(newPoint, randomPointInRange(roadSystem, newPoint, RANGE), oldSegment.quality)
            //TODO: randomly switch newSegment3 on/off
            return roadSystem
                .removeSegment(oldSegment)
                .addSegment(newSegment1)
                .addSegment(newSegment2)
                .addSegment(newSegment3)
        }
        return roadSystem
    }
    
    function moveRandomPoint(roadSystem) {
        var segments = roadSystem.segments()
        if (segments.length > 0)
        {
            var p = randomFromList(allRoadVertices(roadSystem)),
                createIntersection = randomInt(2) < 1 
            return roadSystem.movePoint(p, randomPointInRange(roadSystem, p, RANGE), createIntersection)
        }
        return roadSystem
    }

    function removeRandomPoint(roadSystem) {
        var segments = roadSystem.segments()
        if (segments.length > 0) {
            return roadSystem.removePoint(randomFromList(allRoadVertices(roadSystem)))
        }
        return roadSystem
    }
    
    function changeRoadQuality(roadSystem) {
        var segments = roadSystem.segments()
        if (segments.length > 0)
        {
            return roadSystem.changeRoadQuality(
                    randomFromList(segments),
                    randomQuality())
        }
        return roadSystem
    }
        
    var mutators = [createSegment,
                    extendSegment,
                    moveRandomPoint,
                    removeRandomPoint,
                    splitRandomSegment,
                    removeRandomPoint,
                    changeRoadQuality]
    
    //    var numMutations = 1 + randomInt(100)
    //    
    //    return R.reduce( (acc, x) => randomFromList(mutators)(acc),
    //                     roadSystem,
    //                     R.range(0, numMutations) )
    
    return randomFromList(mutators)(roadSystem)
}

/**
 * 
 */
app.nextIteration = function()
{
    for (var z=0; z<app.config.batchIterations; z++)
    {
        var s                   = this.state,
            newRoadSystem       = this.mutateRoadSystem(s.roads.system),
            currentCost         = this.evaluateRoadSystem(s, s.roads.system),
            newCost             = this.evaluateRoadSystem(s, newRoadSystem),
            costValue           = (cost) => R.sum(R.values(cost))
        
        if (costValue(newCost) <= costValue(currentCost) && costValue(currentCost) > 0)
        {
            s.roads.system = newRoadSystem
            this.createRoadShapes()
        }
        
        ++s.evolution
        
        $('debug').innerHTML = 
              'evolution ' + s.evolution + '<br/>'
            + R.map((p) => (p[0] + ': ' + p[1]), R.toPairs(currentCost)).join('<br/>') + '<br/>'
            + (s.roads.system.segments().length) + ' road segments<br/>' 
    }
}

/**
 * Project point to screen coordinates.
 * @param p Point
 * @returns Projected point
 */
app.project = function(p)
{
    return new Point(50 + 12 * p.x, 50 + 12 * p.y)  
}

app.isCity = function(p) {
    return ((p.x+'|'+p.y) in this.state.cities.lookup)
}

/**
 * 
 */
app.randomizeCityLocations = function()
{
    var s                       = this.state,
        mapSize                 = this.config.mapSize,
        numCities               = this.config.numCities
        
    s.cities.locations          = R.range(0, numCities).map(() => new Point(randomInt(mapSize.width), randomInt(mapSize.height)))
    s.cities.lookup             = R.zipObj(s.cities.locations.map((p)=>p.x+'|'+p.y), R.range(0, s.cities.locations.length))
        
    this.createCityShapes()
        
    return s
}

/**
 * 
 */
app.randomizeRoadSegments = function()
{
    var s                       = this.state,
        mapSize                 = this.config.mapSize

    s.roads.system              = new RoadSystem().randomize(this.config.numCities, mapSize)
       
    this.createRoadShapes()
    
    return s
}

/**
 * Application main entry point.
 */
app.setupGUI = function()
{
    paper.setup('canvas')
    
    view.onResize               = (event) => view.setViewSize(window.innerWidth, window.innerHeight)
    view.onFrame                = (event) => { app.nextIteration() }
    view.onResize()
}

app.createTrainingSetCities = function()
{
    var s                       = this.state,
        mapSize                 = this.config.mapSize,
        realRandomPoint         = () => new Point(randomInt(mapSize.width), randomInt(mapSize.height))

    return R.range(0, this.config.numCities)
        .map(() => new RoadSegment(randomFromList(s.cities.locations), randomFromList(s.cities.locations)))
}

app.createTrainingSetAnywhere = function()
{
    var s                       = this.state,
        mapSize                 = this.config.mapSize,
        realRandomPoint         = () => new Point(randomInt(mapSize.width), randomInt(mapSize.height))

    return R.range(0, this.config.numCities)
        .map(() => new RoadSegment(realRandomPoint(), randomFromList(s.cities.locations)))
}

app.createTrainingSet = function()
{
    var s = this.state 
    s.trainingSet = R.concat( this.createTrainingSetCities(),
            this.createTrainingSetAnywhere() )
}

/**
 * Start new random session.
 */
app.startNew = function()
{
    var s = this.state 
    
    this.createLayers()
    this.createMap()
    
    this.randomizeCityLocations()
    
    this.createTrainingSet()
            
    return s
}
