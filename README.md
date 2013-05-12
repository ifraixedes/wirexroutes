Wirexroutes
====================

Wirexroutes is node module, that basically, helps to organise the express routes definition and the associated middlewares.
I used only with express 3.0.


## Why this module

I developed this module when I took the challenge to design, create and code, as well, a new web (REST) system from scratch for a new start.

My concerns, as a Software Engineer, are always to try to create a modular and scalable system, bearing in mind that all the code as possible be reusable, easy to maintain and all those type of things that avoid to create the minimum "spaghetti code" as possible.

Express is an awesome web application framework that provide "a thin layer of features fundamental to any web application, without obscuring features that you know and love in node.js". You build the web application routes using simple middlewares and each route is not limited to only one, so you can "chain" different middlewares (simple functions) to fulfil all the "actions" that the request require; take a look to documentation app.VERB (http://expressjs.com/api.html#app.VERB) if you don't know that I am referring.

From my point of view, the simplicity and flexibility of express' route chaining functionality allows to create a bunch of middlewares which performs generic operations, and use them in several routes, so you can build middlewares bearing in mind the reusability, more testable, security management and so on, and all of this is possible just using express.

But then if express is awesome, what does it do?

Well, I wondered, how I could track the chains of each route when your application start to have a huge bunch of them and how I can make difference between middlewares that performs some operations but call 'next' without sending any response (remember if a response is sent, no possibility to send another), the middlewares that send the response and the middlewares that perform some operations after sending a response (i.e. logging operations, etc). I replied myself,  building this module as a helper organise them.


## Installation

    $ npm install wirexroutes

## Wirexroutes API

Wirexroutes is a class (constructor) that accepts the following parameters in this order:

1. Express application: The express application's instance.
2. routes definition: An array with wirexroutes route's definition objects.
3. defaults options: (Optional) An object which has the default values to apply for required parameters which haven't been specified in the any route definition.

A wirexroutes' definition object is an object which has the next properties:

* path: The proper route path. It may be a String or a regular expression, alike express#app#use accepts.
* action: The function action middleware (wirexroutes arity) to use.
* [method]: The HTTP verb to use for that route; 'all' can also be used, in that case the route will be registered using express#app#all method. If it is not specified the default method will be applied.
* [pre]: A pre-middleware function or an array of them.
* [post]: A post-middleware function or an array of them.
* [routes]: An array of wirexroutes route's definition objects. The routes, under it, chains its path to the parent's path route definition's object if it is a string and its path is a string as well. The routes also inherit the ancestors' pre/post-middlewares, so these routes will add (adding them at the end of the chain) their pre/post-middlewares. The inherit chain is not limited so this routes may define a 'routes' property with more children routes as well.

The defaults options object, in the present time, only support one property, 'method'. If it is defined, and some routes don't specify the 'method' to apply to the route, then it will be applied, but if any route doesn't define any 'method' and no default 'method'' has been provided, wirexroutes constructor will throw an error

Wirexroutes instance is simple object that has some properties; basically it hold the provide parameters under the same name and has one more, 'routePathWords' which is an object whose properties' name are the words used in the routes (express route parameters won't be taken into account), and their values are an array of integers where each one is the path's position where it appears; I reckoned that you're wondering why wirexroutes instance has the 'routePathWords' property, well, I added it, because in some point, I needed to know the words used in my routes, because the could create some stuff where he could choose the URL's slug to use, so I needed to know what words my routes use to avoid that the user could choose one of them to avoid that the users' slugs clash with the application's routes.


## How to use

This section show a simple basic example about how I think that this module may help to organise the express routes and their associate middlewares. The module is a helper, it doesn't define how to organise the several files of your web application, that is up to you, but I needed to define one to write this section, and I used the directory structure that I am comfortable, also bear in mind that this directory structure only has the needed directories to write this wirexroutes' example.

Note, that this example is too simple, so maybe it is so difficult to gauge if it is helpful for all the stuff that I mentioned above.

### Directory structure

* Main structure

App route path
└─┬
  ├─┬ controllers
  │ ├── public
  │ ├── user
  │ └── project
  │
  └─┬ routes
    ├── public.js
    ├── user.js
    ├── project.js
    └── index.js

* Controller structure
Each controller (each directory under 'controllers') has the same structure defined here for 'user'

App route path
└─┬
  └─┬ controllers
    └─┬ user
      ├── actions
      ├─┬ middlewares
      │ ├── pre
      │ └── post
      └── index.js


### Defining the controllers

The module disaggregate the middlewares in three types, actions, pre-middlewares and post-middlewares.
The chain of each route is: pre-middlewares --> action --> post-middleware. The action is the only required and pre/post-middlewares can be 0 or N.

Pre-middlewares are just express middlewares (refer to http://expressjs.com/api.html#app.VERB for more info), the action and post-middlewares are as express middleware but with different arity, but an action is the last registered express route's middleware are not appended to the list of middlewares of express route definition.

The concept is, that the action will send the response to the client, although pre-middlewares may send the response if the pre-condition/s that it performs is not accomplished, then it should also abort the route chain (in express is, not to call next()).

On the other hand, the post-middlewares must never send the response, they are only to perform operations that don't affect the response to the client, for example logging, tracking, ...

I create one file for each pre/post-middleware and action and, of course, I put them into the corresponding controller's directory. I define a controller for each entity element of the web application, in this basic example there are three (public, user and project). Maybe it seems that there will be lots of files, but I think that putting each one in a different files is more manageable for a development team (repository synchronization, etc.).


Because I define one file per pre/post-middleware and action, I export just the middleware function, so the next code samples are that.

#### Simple example of a pre-middleware

This a basic pre-middleware which checks if the user is logged, so it would be used in all the routes which required an authenticated user.

i.e. file's name: checkUserAuth.js


```js

module.exports = function (req, res, next) {

  // User has been authenticated before and his session is valid
  if (req.session.user) {
    next();
  } else {
    res.send(401, 'The user is not authenticated');
  }
};

```

#### Simple example of an action

This a basic action which performs an user logout.

i.e. file's name: logout.js

```js

module.exports = function(req, res, next, post) {

  req.session.destroy(function(err) {
    if (err) {
      console.log('Error when destroying the user\'s session. ' + err);

     res.send(500, 'Application error');
     post(err, req, res);

    } else {
     res.send(200);
     post(null, req, res);
    }

  });
};

```

#### Simple example of a post-middleware

Simple example of post-middleware would manage an error reported by a precedent action or post-middleware.

i.e. file's name: errorReporter.js

```js

module.exports = function (err, req, res, post) {

    if (err) {
      // Here you can report the error into log, send an email or whatever you would like to do
      // with it

    }

    // And after call post to continue the route's chain; the post middleware is agnostic about if
    // there are more post-middlewares or not
    post(null, req, res);

};

```

#### All together

I use the index.js file defined in each controller to get all the pre/post-middlewares and actions of the controller together, so in that file I reference then for afterwards only need to import (require) on file rather than several files.

So an index.js file that reference the three above samples is:

```js

module.exports.actions = {
    logout: require('./actions/logout')
};

module.exports.middlewares = {
  pre: {
    checkUserAuth: require('./middlewares/pre/checkUserAuth')
  },
  post: {
    errorReporter: require('./middlewares/post/errorReporter')
  }
};

```

### Defining the routes

I use one file per entity, alike I do with one directory per controller, to define the its associated routes.
Each route file exports an array with wirexroutes' definition and I use route/index.js to get all the routes together and to create wirexroute instance, which register them in express.

i.e. the routes/user.js file associate with a route which uses the above pre/post-middleware and action samples is:

```js

var userCtrl = require('../controllers/user');

module.exports = [
  {
    path: '/user/logout',
    method: 'get',
    action: userCtrl.actions.logout,
    pre: userCtrl.middlewares.pre.checkUserAuth,
    post: userCtrl.middlewares.post.errorsReporter
  }
];

```

and route/index.js for this example is ('settings' is a module that I use to hold application settings and global variables, so wherever I instantiated express application I added it 'settings', and here I add into it the Wirexroutes instance):

```js

(function initialize() {

  var settings = require('../settings.js');
  var routes = [];

  routes.push.apply(routes, require('./public'));
  routes.push.apply(routes, require('./user'));
  routes.push.apply(routes, require('./project'));


  // Register the routes in express application
  var Wirexroutes = require('wirexroutes');
  settings.wireXRoutes = new Wirexroutes(settings.expressApp, routes);

}());

```


## LICENSE

License
(The MIT License)

Copyright (c) 2013 Ivan Fraixedes Cugat <ifcdev@gmail.com>
