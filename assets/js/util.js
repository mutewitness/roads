/**
 * ================================================================================
 *
 *  Utility functions.
 *
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
 * elementById :: string -> DOMElement
 */
function elementById(id)
{
    return document.getElementById(id)
}


/**
 * multiplyVectors :: [float] -> [float] -> [float]
 * Returns element-wise multipication of given vectors.
 */
function multiplyVectors(a, b)
{
    console.assert(a.length == b.length)
    var result = [];
    result.length = a.length;
    for (var i=0, n=a.length; i<n; i++)
        result[i] = a[i] * b[i];
    return result;
}


/**
 * normalizeVector :: [float] -> [float]
 * Returns normalized vector.
 */
function normalizeVector(xs)
{
    return xs.map(R.multiply(1.0/xs.reduce(R.add)))
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
 * randomBool :: bool
 */
function randomBool()
{
    return (1 == randomInt(2))
}


/**
 * randomInt :: int -> int
 * Returns random number between 0 (inclusive) and ub (exclusive)
 */
function randomInt(ub)
{
    return Math.floor(Math.random() * ub)
}


/**
 * sumBy :: (a -> b) -> [a] -> b
 */
function sumBy(f, lst)
{
    return R.reduce((acc, x) => acc + f(x), 0, lst)
}
