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

/**
 * Utility functions.
 */

/**
 * Returns DOM element by ID.
 * @param id ID of element
 * @returns DOM element
 */
function $(x) {
    return document.getElementById(x)
}

/**
 * randomInt int => int
 * 
 * @param ub
 * @returns Random number between 0 (inclusive) and ub (exclusive)
 */
function randomInt(ub) {
    return Math.floor(Math.random() * ub)
}

/**
 * @param lst
 * @returns
 */
function randomFromList(lst) {
    return lst.length > 0 ? lst[randomInt(lst.length)] : undefined
}

/**
 * 
 */
function pointToLineDistance(x, y, x1, y1, x2, y2)
{
    var A       = x - x1,
        B       = y - y1,
        C       = x2 - x1,
        D       = y2 - y1,
        dot     = A * C + B * D,
        lenSq   = C * C + D * D
        
    var param = -1;
    if (lenSq != 0) //in case of 0 length line
        param = dot / lenSq;

    var xx, yy;

    if (param < 0) {
      xx = x1;
      yy = y1;
    }
    else if (param > 1) {
      xx = x2;
      yy = y2;
    }
    else {
      xx = x1 + param * C;
      yy = y1 + param * D;
    }

    var dx = x - xx;
    var dy = y - yy;
    return Math.sqrt(dx * dx + dy * dy);
    
}