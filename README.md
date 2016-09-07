# Road system generation with conflicting evaluators


This application is mostly just an experiment in functional programming in JavaScript using the Ramda library. By no means is this implementation the fastest one possible for these kind of algorithms nor is there any direct practical use.

See the [online demo](http://mutewitness.net/roads) here.

### Coding style

Some notes regarding code style:
 * Except some GUI/Paperjs related ones, all functions are pure and have no side effects.
 * All variables are declared constant (except for namespaces)
 * Arrow functions are used extensively to promote a compacter style.
 * I use point-free style functions whenever I can. Unfortunately this is not always possible, because not all functions have been necessarily declared.

### Links

 * [Ramda](http://ramdajs.com/) - Ramda library
 * [Paper.js](http://paperjs.org) - Paperjs library
