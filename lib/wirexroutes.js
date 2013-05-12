'use strict';

/**
 * Constructor
 *
 * Load the specified routes in the provied express application instance
 *
 * @param {Object} expressApp The express application instance to add the routes
 * @param {Array} routes The routes to add. Each route may have the next properties:
 *
 * path: {String | Regex}. Required if it is a string then this is appended to the parent route
 * path, otherwise the last path (in the route chain) parameter value is used.
 *
 * action: Function. The action middleware to use.
 *
 * [pre]: {Function | Array[Functions]}. The middlewware functions to execute before the action
 * (main callback) be executed. This functions must have the arity specified by Connect middlewares
 * with the simple exception over the next function that Express has,
 * @see http://expressjs.com/api.html#app.VERB
 *
 * [post]: {Function | Array[Functions]}. The middlewware functions to execute after the action
 * (main callback) be executed. This functions must have the arity specified by Connect middlewares
 * with the simple exception over the next function that Express has,
 * @see http://expressjs.com/api.html#app.VERB
 *
 * [method]: {String}. The method (HTTP verbs) managed by this route; this string it is used
 * directly to call the app.VERB of Express Application
 * @see http://expressjs.com/api.html#app.VERB. The parameter it is optional if the method has been
 *      specified in the defaults options (third parameter of this function).
 *
 *
 * [routes]: {Array[routes]}. The routes which are chained to this route; each route specified in
 * this may have the same parameters commented above but they inherit the middlewares, so they are
 * prepended to its middlewares, and the path of each route is concatenated if they are strings.
 * Method it is not inherited, so if the route does not specify the it, the method specified in the
 * defaults options will be used.
 *
 *
 * @param {Object} defaults The default options to use for all the routes if the option is not
 *          specified in the route. In the time being, only the method ('method' is used like
 *          property name) can be defined by default if the route does not specify it.
 * @api public
 */
function WireXRoutes(expressApp, routes, defaults) {

  // Ensure that the function is called like a constructor
  if (!(this instanceof WireXRoutes)) {
    return new WireXRoutes(expressApp, routes, defaults);
  }

  if ((!expressApp) || (!routes)) {
    throw new Error('Express App and routes are required');
  }

  this.expressApp = expressApp;
  this.routes = routes;
  this.defaults = (defaults) ? defaults : {};
  this.routePathWords = {};

  this.loadRoutes('', this.routes, {
    pre: [],
    post: []
  });
}

/*
 * @api private
 */
WireXRoutes.prototype.loadRoutes = function (path, routes, middlewares) {

  // Flow control variables
  var routePath;
  var routeMiddlewares;
  var action;
  var exRouteParams;
  var routeMethod;
  var routeDef;

  for (routeDef = 0; routeDef < routes.length; routeDef++) {

    // path may be a string or regular expression
    if (routes[routeDef].path) {
      // Check that the parent and descendant routes are string, any of them is a regular expression
      if (('string' === typeof routes[routeDef].path) && ('string' === typeof path)) {
          routePath = path
            + ((routes[routeDef].path[0] === '/') ? routes[routeDef].path : '/'
            + routes[routeDef].path);
      } else {
        // The route it is a whole defined because it is a regular expression
        routePath = routes[routeDef].path;
      }
    } else {
      // There aren't descendant routes
      routePath = path;
    }

    // parse the route words
    this.parseRoutePathWords(routePath);

    // Adding pre middlewares
    routeMiddlewares = {
      pre: middlewares.pre.slice(0),
      post: middlewares.post.slice(0)
    };

    if (routes[routeDef].pre) {
      if (routes[routeDef].pre instanceof Array) {
        routeMiddlewares.pre.push.apply(
          routeMiddlewares.pre, routes[routeDef].pre);
      }
      else {
        routeMiddlewares.pre.push(routes[routeDef].pre);
      }
    }

    // Adding post middlewares
    if (routes[routeDef].post) {
      if (routes[routeDef].post instanceof Array) {
        routeMiddlewares.post.push.apply(routeMiddlewares.post, routes[routeDef].post);
      }
      else {
        routeMiddlewares.post.push(routes[routeDef].post);
      }
    }

    if (routes[routeDef].routes) {
      this.loadRoutes(routePath, routes[routeDef].routes, routeMiddlewares);
    }

    if (routes[routeDef].action) {
      action = this.setPostMiddlewares(routes[routeDef].action, routeMiddlewares.post);

      exRouteParams = [];
      exRouteParams.push(routePath);
      exRouteParams.push.apply(exRouteParams, routeMiddlewares.pre);
      exRouteParams.push(action);


      routeMethod = (routes[routeDef].method) ? routes[routeDef].method : this.defaults.method;

      this.expressApp[routeMethod].apply(this.expressApp, exRouteParams);
    }

  } // End loop

};

/**
 * Setup the action to provide a function to call for execute the post middlewares; post middlewares
 * would be operations post response, because the call to each post middleware is executed
 * asynchronously.
 *
 * All the actions will receive a third parameter that it is the function to call for start the
 * chain of post middlewares; The number of the parameters is not established, the post middleware
 * function will establish that depending the operations that it executes; the function to chain
 * with the next middleware it will always be call with the next chaining function like the last
 * parameter, but it will be provided automatically, the middleware only has to provide the
 * parameters to pass to the next post middleware. The last one will also receive a chaining
 * function, but it will be noop function, in this way the post middleware may be developed that
 * there will a next post middleware, although there is none.
 *
 * @param {Function} actionFn The action function to provide to express route
 * @param {Array} [postMiddlewares] The post middlewares to chain after the call to the action, if
 *          it is not provided then a noop chaining function will be the action like it had a post
 *          middleware
 * @returns {Function} The function to use like action in express. This function wraps the call to
 *          the action.
 * @api private
 */
WireXRoutes.prototype.setPostMiddlewares = function (actionFn, postMiddlewares) {

  var nMWare = 0;

  function postChain() {
    if ((postMiddlewares) && (nMWare < postMiddlewares.length)) {
      var pMiddleware = postMiddlewares[nMWare++];
      var next = postChain();

      return function () {
        var args = [];
        args = args.slice.call(arguments, 0);
        args.push(next);
        process.nextTick(function () {
          pMiddleware.apply(null, args);
        });
      };
    } else {
      return function () {};
    }
  }

  var postAction = postChain();

  return function (req, res, next) {
    return actionFn(req, res, next, postAction);
  };

};

WireXRoutes.prototype.parseRoutePathWords = function (path) {

  if ('string' !== typeof path) {
    return;
  }

  var pathWords = path.split('/');
  var word;

  for (var wi = 0, level = 1; wi < pathWords.length; wi++) {

    word = pathWords[wi];

    if (pathWords[wi].length === 0) {
      continue;
    }

    // Check that the word not be an express route parameter
    if (pathWords[wi][0] !== ':') {
      if (!this.routePathWords[word]) {
        this.routePathWords[word] = [level];
      } else {
        if (this.routePathWords[word].indexOf(level) < 0) {
          this.routePathWords[word].push(level);
        }
      }
    }

    level++;
  }
};

module.exports = exports = WireXRoutes;
