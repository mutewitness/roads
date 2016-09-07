# Road system generation with conflicting evaluators


This application is mostly just an experiment in functional programming in JavaScript using the Ramda library. By no means is this implementation the fastest one possible for these kind of algorithms nor is there any direct practical use.

See the [online demo](http://mutewitness.net/roads) here.

### Coding style

Some notes regarding code style:
 * Save some functions having to do with the GUI (Paper framework), there are no functions with side-effects.
 * All variables are declared constant (except for some objects we use to denote namespaces, eg. GUI)
 * Nearly all functions are arrow functions to promote a compacter style; except for functions with a return statement.


### Links

 * [Ramda](http://ramdajs.com/) - Ramda library
 * [Paper.js](http://paperjs.org) - Paperjs library
