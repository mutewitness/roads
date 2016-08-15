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
 * randomBool :: bool
 */
const randomBool = () =>
    (1 == randomInt(2)) 


/**
 * randomFromList :: [a] -> a
 */
const randomFromList = (lst) =>
    (lst.length > 0)
        ? lst[randomInt(lst.length)]
        : undefined


/**
 * randomInt :: int -> int
 * Returns random number between 0 (inclusive) and ub (exclusive)
 */
const randomInt = (ub) =>
    Math.floor(Math.random() * ub)

