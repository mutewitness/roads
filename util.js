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
 * curryAll :: object -> object
 * Applies R.curry(..) to all found functions in object. 
 */
function curryAll(clazz)
{
    for (var k in clazz) {
        const v = clazz[k]
        if ('function' == typeof v)
            clazz[k] = R.curry(v)
    }
}


/**
 * multiplyVectors :: [float] -> [float] -> [float]
 */
function multiplyVectors(a, b) {
    var result = [];
    result.length = a.length;
    for (var i=0, n=a.length; i<n; i++)
        result[i] = a[i] * b[i];
    return result;
}

/**
 * randomBool :: bool
 */
function randomBool()
{
    return (1 == randomInt(2))
}


/**
 * pickRandom :: [a] -> a
 */
function pickRandom(lst)
{
    return (lst.length > 0)
        ? lst[randomInt(lst.length)]
        : undefined
}


/**
 * randomInt :: int -> int
 * Returns random number between 0 (inclusive) and ub (exclusive)
 */
function randomInt(ub)
{
    return Math.floor(Math.random() * ub)
}


///**
// * softmax :: [float] -> [float]
// * 
// * Calculates the normalized exponential values of given array.
// */
//function softmax(xs)
//{
//    const exps = xs.map(Math.exp)
//    return exps.map(R.multiply(1.0/exps.reduce(R.add)))
//}
//

/**
 * normalizeVector :: [float] -> [float]
 */
function normalizeVector(xs)
{
    return xs.map(R.multiply(1.0/xs.reduce(R.add)))
}

