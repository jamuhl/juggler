/**
 * almond 0.1.1 Copyright (c) 2011, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/almond for details
 */
//Going sloppy to avoid 'use strict' string cost, but strict practices should
//be followed.
/*jslint sloppy: true */
/*global setTimeout: false */

var requirejs, require, define;
(function (undef) {
    var defined = {},
        waiting = {},
        config = {},
        defining = {},
        aps = [].slice,
        main, req;

    /**
     * Given a relative module name, like ./something, normalize it to
     * a real name that can be mapped to a path.
     * @param {String} name the relative name
     * @param {String} baseName a real name that the name arg is relative
     * to.
     * @returns {String} normalized name
     */
    function normalize(name, baseName) {
        var baseParts = baseName && baseName.split("/"),
            map = config.map,
            starMap = (map && map['*']) || {},
            nameParts, nameSegment, mapValue, foundMap, i, j, part;

        //Adjust any relative paths.
        if (name && name.charAt(0) === ".") {
            //If have a base name, try to normalize against it,
            //otherwise, assume it is a top-level require that will
            //be relative to baseUrl in the end.
            if (baseName) {
                //Convert baseName to array, and lop off the last part,
                //so that . matches that "directory" and not name of the baseName's
                //module. For instance, baseName of "one/two/three", maps to
                //"one/two/three.js", but we want the directory, "one/two" for
                //this normalization.
                baseParts = baseParts.slice(0, baseParts.length - 1);

                name = baseParts.concat(name.split("/"));

                //start trimDots
                for (i = 0; (part = name[i]); i++) {
                    if (part === ".") {
                        name.splice(i, 1);
                        i -= 1;
                    } else if (part === "..") {
                        if (i === 1 && (name[2] === '..' || name[0] === '..')) {
                            //End of the line. Keep at least one non-dot
                            //path segment at the front so it can be mapped
                            //correctly to disk. Otherwise, there is likely
                            //no path mapping for a path starting with '..'.
                            //This can still fail, but catches the most reasonable
                            //uses of ..
                            return true;
                        } else if (i > 0) {
                            name.splice(i - 1, 2);
                            i -= 2;
                        }
                    }
                }
                //end trimDots

                name = name.join("/");
            }
        }

        //Apply map config if available.
        if ((baseParts || starMap) && map) {
            nameParts = name.split('/');

            for (i = nameParts.length; i > 0; i -= 1) {
                nameSegment = nameParts.slice(0, i).join("/");

                if (baseParts) {
                    //Find the longest baseName segment match in the config.
                    //So, do joins on the biggest to smallest lengths of baseParts.
                    for (j = baseParts.length; j > 0; j -= 1) {
                        mapValue = map[baseParts.slice(0, j).join('/')];

                        //baseName segment has  config, find if it has one for
                        //this name.
                        if (mapValue) {
                            mapValue = mapValue[nameSegment];
                            if (mapValue) {
                                //Match, update name to the new value.
                                foundMap = mapValue;
                                break;
                            }
                        }
                    }
                }

                foundMap = foundMap || starMap[nameSegment];

                if (foundMap) {
                    nameParts.splice(0, i, foundMap);
                    name = nameParts.join('/');
                    break;
                }
            }
        }

        return name;
    }

    function makeRequire(relName, forceSync) {
        return function () {
            //A version of a require function that passes a moduleName
            //value for items that may need to
            //look up paths relative to the moduleName
            return req.apply(undef, aps.call(arguments, 0).concat([relName, forceSync]));
        };
    }

    function makeNormalize(relName) {
        return function (name) {
            return normalize(name, relName);
        };
    }

    function makeLoad(depName) {
        return function (value) {
            defined[depName] = value;
        };
    }

    function callDep(name) {
        if (waiting.hasOwnProperty(name)) {
            var args = waiting[name];
            delete waiting[name];
            defining[name] = true;
            main.apply(undef, args);
        }

        if (!defined.hasOwnProperty(name)) {
            throw new Error('No ' + name);
        }
        return defined[name];
    }

    /**
     * Makes a name map, normalizing the name, and using a plugin
     * for normalization if necessary. Grabs a ref to plugin
     * too, as an optimization.
     */
    function makeMap(name, relName) {
        var prefix, plugin,
            index = name.indexOf('!');

        if (index !== -1) {
            prefix = normalize(name.slice(0, index), relName);
            name = name.slice(index + 1);
            plugin = callDep(prefix);

            //Normalize according
            if (plugin && plugin.normalize) {
                name = plugin.normalize(name, makeNormalize(relName));
            } else {
                name = normalize(name, relName);
            }
        } else {
            name = normalize(name, relName);
        }

        //Using ridiculous property names for space reasons
        return {
            f: prefix ? prefix + '!' + name : name, //fullName
            n: name,
            p: plugin
        };
    }

    function makeConfig(name) {
        return function () {
            return (config && config.config && config.config[name]) || {};
        };
    }

    main = function (name, deps, callback, relName) {
        var args = [],
            usingExports,
            cjsModule, depName, ret, map, i;

        //Use name if no relName
        relName = relName || name;

        //Call the callback to define the module, if necessary.
        if (typeof callback === 'function') {

            //Pull out the defined dependencies and pass the ordered
            //values to the callback.
            //Default to [require, exports, module] if no deps
            deps = !deps.length && callback.length ? ['require', 'exports', 'module'] : deps;
            for (i = 0; i < deps.length; i++) {
                map = makeMap(deps[i], relName);
                depName = map.f;

                //Fast path CommonJS standard dependencies.
                if (depName === "require") {
                    args[i] = makeRequire(name);
                } else if (depName === "exports") {
                    //CommonJS module spec 1.1
                    args[i] = defined[name] = {};
                    usingExports = true;
                } else if (depName === "module") {
                    //CommonJS module spec 1.1
                    cjsModule = args[i] = {
                        id: name,
                        uri: '',
                        exports: defined[name],
                        config: makeConfig(name)
                    };
                } else if (defined.hasOwnProperty(depName) || waiting.hasOwnProperty(depName)) {
                    args[i] = callDep(depName);
                } else if (map.p) {
                    map.p.load(map.n, makeRequire(relName, true), makeLoad(depName), {});
                    args[i] = defined[depName];
                } else if (!defining[depName]) {
                    throw new Error(name + ' missing ' + depName);
                }
            }

            ret = callback.apply(defined[name], args);

            if (name) {
                //If setting exports via "module" is in play,
                //favor that over return value and exports. After that,
                //favor a non-undefined return value over exports use.
                if (cjsModule && cjsModule.exports !== undef &&
                    cjsModule.exports !== defined[name]) {
                    defined[name] = cjsModule.exports;
                } else if (ret !== undef || !usingExports) {
                    //Use the return value from the function.
                    defined[name] = ret;
                }
            }
        } else if (name) {
            //May just be an object definition for the module. Only
            //worry about defining if have a module name.
            defined[name] = callback;
        }
    };

    requirejs = require = req = function (deps, callback, relName, forceSync) {
        if (typeof deps === "string") {
            //Just return the module wanted. In this scenario, the
            //deps arg is the module name, and second arg (if passed)
            //is just the relName.
            //Normalize module name, if it contains . or ..
            return callDep(makeMap(deps, callback).f);
        } else if (!deps.splice) {
            //deps is a config object, not an array.
            config = deps;
            if (callback.splice) {
                //callback is an array, which means it is a dependency list.
                //Adjust args if there are dependencies
                deps = callback;
                callback = relName;
                relName = null;
            } else {
                deps = undef;
            }
        }

        //Support require(['a'])
        callback = callback || function () {};

        //Simulate async callback;
        if (forceSync) {
            main(undef, deps, callback, relName);
        } else {
            setTimeout(function () {
                main(undef, deps, callback, relName);
            }, 15);
        }

        return req;
    };

    /**
     * Just drops the config on the floor, but returns req in case
     * the config return value is used.
     */
    req.config = function (cfg) {
        config = cfg;
        return req;
    };

    define = function (name, deps, callback) {

        //This module may not have dependencies
        if (!deps.splice) {
            //deps is not an array, so probably means
            //an object literal or factory function for
            //the value. Adjust args.
            callback = deps;
            deps = [];
        }

        waiting[name] = [name, deps, callback];
    };

    define.amd = {
        jQuery: true
    };
}());

this["JST"] = this["JST"] || {};

this["JST"]["bars/segment"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<a href=\"javascript:;\" class=\"back nocd\">";
  foundHelper = helpers.back;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.back; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</a><ul class=\"segmented-controller\"></ul><a href=\"javascript:;\" class=\"next nocd\">";
  foundHelper = helpers.next;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.next; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</a>";
  return buffer;};

this["JST"]["bars/segmentItem"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<a href=\"javascript:;\" class=\"target\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</a>";
  return buffer;};

this["JST"]["bars/tabItem"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<a href=\"javascript:;\" class=\"target\"><i class=\"icon\"></i><div class=\"tab-label\">";
  foundHelper = helpers.label;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.label; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</div></a>";
  return buffer;};

this["JST"]["bars/title"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  var buffer = "", stack1, foundHelper, functionType="function", escapeExpression=this.escapeExpression;


  buffer += "<a href=\"javascript:;\" class=\"back nocd\">";
  foundHelper = helpers.back;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.back; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</a><h1 class=\"title\">";
  foundHelper = helpers.title;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.title; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</h1><a href=\"javascript:;\" class=\"next nocd\">";
  foundHelper = helpers.next;
  if (foundHelper) { stack1 = foundHelper.call(depth0, {hash:{}}); }
  else { stack1 = depth0.next; stack1 = typeof stack1 === functionType ? stack1() : stack1; }
  buffer += escapeExpression(stack1) + "</a>";
  return buffer;};

this["JST"]["demo/done"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div class=\"content-padded\"><p>Lorem ipsum dolor sit amet, consectetuer adipiscing elit, sed diam nonummy nibh euismod tincidunt ut laoreet dolore magna aliquam erat volutpat. Ut wisi enim ad minim veniam, quis nostrud exerci tation ullamcorper suscipit lobortis nisl ut aliquip ex ea commodo consequat. </p><p>Duis autem vel eum iriure dolor in hendrerit in vulputate velit esse molestie consequat, vel illum dolore eu feugiat nulla facilisis at vero eros et accumsan et iusto odio dignissim qui blandit praesent luptatum zzril delenit augue duis dolore te feugait nulla facilisi.</p><a class=\"back nocd button-main button-block\">bring me back</a></div>";};

this["JST"]["demo/home"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div class=\"content-padded\"><h3>Get more information about:</h3></div><ul class=\"list inset\"><li><a href=\"#transitions\" class=\"nocd transitions\"><i class=\"icon-exchange icon-large\"></i> Transitions<span class=\"chevron\"></span></a></li><li><a href=\"#regions\" class=\"nocd regions\"><i class=\"icon-tasks icon-large\"></i> Regions<span class=\"chevron\"></span></a></li><li><a href=\"#ratchet\" class=\"nocd regions\"><i class=\"icon-pencil icon-large\"></i> Style<span class=\"chevron\"></span></a></li></ul>";};

this["JST"]["demo/ratchet"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div class=\"content-padded\"><h3>Controls and Styles:</h3><p>Juggler pulls in the gorgeous styles of ratchet.</p></div><div class=\"content-padded\"><p>Here are some examples:</p></div><ul class=\"list inset\"><li><a href=\"javascript:;\" class=\"nocd\"> List item 1<span class=\"chevron\"></span><span class=\"count\">4</span></a></li><li><a href=\"javascript:;\" class=\"nocd\"> List item 2<span class=\"chevron\"></span></a></li><li>List item 3<a href=\"javascript:;\" class=\"button\">Button</a></li><li>List item 4<div class=\"toggle\"><div class=\"toggle-handle\"></div></div></li></ul><div class=\"content-padded\"><a class=\"button-main button-block\">Block button</a></div><div class=\"content-padded\"><a class=\"button\">Button</a> <a class=\"button-main\">Button</a> <a class=\"button-positive\">Button</a> <a class=\"button-negative\">Button</a></div><div class=\"content-padded\"><a class=\"button\"> \nCount button<span class=\"count\">1</span></a> <a class=\"button-main\"> \nCount button<span class=\"count\">1</span></a></div><div class=\"content-padded\"><p> \nFor more examples go to the <a href=\"http://maker.github.com/ratchet/\" target=\"_blank\">ratchet website.</a></p></div>";};

this["JST"]["demo/regions"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div class=\"content-padded\"><h3>try out:</h3></div><ul class=\"list inset\"><li><a href=\"#regions/title\" class=\"nocd transitionSlide\">Title-Bar<span class=\"chevron\"></span></a></li><li><a href=\"#regions/titleSegmented\" class=\"nocd transitionSlide\">Title-Bar Segmented<span class=\"chevron\"></span></a></li><li><a href=\"#regions/header\" class=\"nocd transitionSlide\">Header-Bar<span class=\"chevron\"></span></a></li><li><a href=\"#regions/headerSecond\" class=\"nocd transitionFade\">Header-Bar and SecondHeader<span class=\"chevron\"></span></a></li><li><a href=\"#regions/tab\" class=\"nocd transitionStack\">Tab<span class=\"chevron\"></span></a></li></ul>";};

this["JST"]["demo/regionSecondHeader"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<a href=\"javascript:;\" class=\"button-block\">Block level button</a>";};

this["JST"]["demo/transitions"] = function (Handlebars,depth0,helpers,partials,data) {
  helpers = helpers || Handlebars.helpers;
  


  return "<div class=\"content-padded\"><h3>try out:</h3></div><ul class=\"list inset\"><li><a href=\"#transitions/transition-slide\" class=\"nocd transitionSlide\"><i class=\"icon-backward icon-large\"></i> Slide<span class=\"chevron\"></span></a></li><li><a href=\"#transitions/transition-slide-reverse\" class=\"nocd transitionSlide\"><i class=\"icon-forward icon-large\"></i> Slide-reverse<span class=\"chevron\"></span></a></li><li><a href=\"#transitions/transition-fade\" class=\"nocd transitionFade\"><i class=\"icon-exchange icon-large\"></i> Fade<span class=\"chevron\"></span></a></li><li><a href=\"#transitions/transition-stack\" class=\"nocd transitionStack\"><i class=\"icon-step-backward icon-large\"></i> Stack<span class=\"chevron\"></span></a></li><li><a href=\"#transitions/transition-noeffect\" class=\"nocd transitionNoEffect\"><i class=\"icon-remove icon-large\"></i> NoEffect<span class=\"chevron\"></span></a></li></ul>";};
/* Zepto v1.0rc1 - polyfill zepto event detect fx ajax form touch - zeptojs.com/license */

/*!
 * Lo-Dash v0.3.2 <http://lodash.com>
 * Copyright 2012 John-David Dalton <http://allyoucanleet.com/>
 * Based on Underscore.js 1.3.3, copyright 2009-2012 Jeremy Ashkenas, DocumentCloud Inc.
 * <http://documentcloud.github.com/underscore>
 * Available under MIT license <http://lodash.com/license>
 */

//     (c) 2010-2012 Jeremy Ashkenas, DocumentCloud Inc.
//     Backbone may be freely distributed under the MIT license.
//     For all details and documentation:
//     http://backbonejs.org

/*
Standalone Deferred
Copyright 2012 Otto Vehviläinen
Released under MIT license

This is a standalone implementation of the wonderful jQuery.Deferred API.
The documentation here is only for quick reference, for complete api please
see the great work of the original project:

http://api.jquery.com/category/deferred-object/
*/

// Copyright (c)2012 Derick Bailey, Muted Solutions, LLC.

// Distributed under MIT license

/*!
 * Includes BabySitter
 * https://github.com/marionettejs/backbone.babysitter/
 *
 * Includes Wreqr
 * https://github.com/marionettejs/backbone.wreqr/
 *
 * Includes EventBinder
 * https://github.com/marionettejs/backbone.eventbinder/
 */

// Backbone.BabySitter, v0.0.4
// Copyright (c)2012 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
// http://github.com/marionettejs/backbone.babysitter
// Backbone.ChildViewContainer
// ---------------------------
//
// Provide a container to store, retrieve and
// shut down child views.

// Backbone.EventBinder, v1.0.2
// Copyright (c)2012 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
// http://github.com/marionettejs/backbone.eventbinder
// EventBinder
// -----------
//
// The event binder facilitates the binding and unbinding of events
// from objects that extend `Backbone.Events`. It makes
// unbinding events, even with anonymous callback functions,
// easy. 
//
// Inspired by [Johnny Oshika](http://stackoverflow.com/questions/7567404/backbone-js-repopulate-or-recreate-the-view/7607853#7607853)

// Backbone.Wreqr, v0.1.0
// Copyright (c)2012 Derick Bailey, Muted Solutions, LLC.
// Distributed under MIT license
// http://github.com/marionettejs/backbone.wreqr

/**
 * ==================================
 * Ratchet v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ==================================
 */

/* ----------------------------------
 * POPOVER v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

/* ----------------------------------
 * PUSH v1.0.0
 * Licensed under The MIT License
 * inspired by chris's jquery.pjax.js
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

/*!function () {

  var noop = function () {};


  // Pushstate cacheing
  // ==================

  var isScrolling;
  var maxCacheLength = 20;
  var cacheMapping   = sessionStorage;
  var domCache       = {};
  var transitionMap  = {
    'slide-in'  : 'slide-out',
    'slide-out' : 'slide-in',
    'fade'      : 'fade'
  };
  var bars = {
    bartab             : '.bar-tab',
    bartitle           : '.bar-title',
    barfooter          : '.bar-footer',
    barheadersecondary : '.bar-header-secondary'
  }

  var cacheReplace = function (data, updates) {
    PUSH.id = data.id;
    if (updates) data = getCached(data.id);
    cacheMapping[data.id] = JSON.stringify(data);
    window.history.replaceState(data.id, data.title, data.url);
    domCache[data.id] = document.body.cloneNode(true);
  };

  var cachePush = function () {
    var id = PUSH.id;

    var cacheForwardStack = JSON.parse(cacheMapping.cacheForwardStack || '[]');
    var cacheBackStack    = JSON.parse(cacheMapping.cacheBackStack    || '[]');

    cacheBackStack.push(id);

    while (cacheForwardStack.length)               delete cacheMapping[cacheForwardStack.shift()];
    while (cacheBackStack.length > maxCacheLength) delete cacheMapping[cacheBackStack.shift()];

    window.history.pushState(null, '', cacheMapping[PUSH.id].url);

    cacheMapping.cacheForwardStack = JSON.stringify(cacheForwardStack);
    cacheMapping.cacheBackStack    = JSON.stringify(cacheBackStack);
  };

  var cachePop = function (id, direction) {
    var forward           = direction == 'forward';
    var cacheForwardStack = JSON.parse(cacheMapping.cacheForwardStack || '[]');
    var cacheBackStack    = JSON.parse(cacheMapping.cacheBackStack    || '[]');
    var pushStack         = forward ? cacheBackStack    : cacheForwardStack;
    var popStack          = forward ? cacheForwardStack : cacheBackStack;

    if (PUSH.id) pushStack.push(PUSH.id);
    popStack.pop();

    cacheMapping.cacheForwardStack = JSON.stringify(cacheForwardStack);
    cacheMapping.cacheBackStack    = JSON.stringify(cacheBackStack);
  };

  var getCached = function (id) {
    return JSON.parse(cacheMapping[id] || null) || {};
  };

  var getTarget = function (e) {
    var target = findTarget(e.target);

    if (
      !  target
      || e.which > 1
      || e.metaKey
      || e.ctrlKey
      || isScrolling
      || location.protocol !== target.protocol
      || location.host     !== target.host
      || !target.hash && /#/.test(target.href)
      || target.hash && target.href.replace(target.hash, '') === location.href.replace(location.hash, '')
      || target.getAttribute('data-ignore') == 'push'
    ) return;

    return target;
  };


  // Main event handlers (touchend, popstate)
  // ==========================================

  var touchend = function (e) {
    var target = getTarget(e);

    if (!target) return;

    e.preventDefault();

    PUSH({
      url        : target.href,
      hash       : target.hash,
      timeout    : target.getAttribute('data-timeout'),
      transition : target.getAttribute('data-transition')
    });
  };

  var popstate = function (e) {
    var key;
    var barElement;
    var activeObj;
    var activeDom;
    var direction;
    var transition;
    var transitionFrom;
    var transitionFromObj;
    var id = e.state;

    if (!id || !cacheMapping[id]) return;

    direction = PUSH.id < id ? 'forward' : 'back';

    cachePop(id, direction);

    activeObj = getCached(id);
    activeDom = domCache[id];

    if (activeObj.title) document.title = activeObj.title;

    if (direction == 'back') {
      transitionFrom    = JSON.parse(direction == 'back' ? cacheMapping.cacheForwardStack : cacheMapping.cacheBackStack);
      transitionFromObj = getCached(transitionFrom[transitionFrom.length - 1]);
    } else {
      transitionFromObj = activeObj;
    }

    if (direction == 'back' && !transitionFromObj.id) return PUSH.id = id;

    transition = direction == 'back' ? transitionMap[transitionFromObj.transition] : transitionFromObj.transition;

    if (!activeDom) {
      return PUSH({
        id         : activeObj.id,
        url        : activeObj.url,
        title      : activeObj.title,
        timeout    : activeObj.timeout,
        transition : transition,
        ignorePush : true
      });
    }

    if (transitionFromObj.transition) {
      activeObj = extendWithDom(activeObj, '.content', activeDom.cloneNode(true));
      for (key in bars) {
        barElement = document.querySelector(bars[key])
        if (activeObj[key]) swapContent(activeObj[key], barElement);
        else if (barElement) barElement.parentNode.removeChild(barElement);
      }
    }

    swapContent(
      (activeObj.contents || activeDom).cloneNode(true),
      document.querySelector('.content'),
      transition
    );

    PUSH.id = id;

    document.body.offsetHeight; // force reflow to prevent scroll
  };


  // Core PUSH functionality
  // =======================

  var PUSH = function (options) {
    var key;
    var data = {};
    var xhr  = PUSH.xhr;

    options.container = options.container || options.transition ? document.querySelector('.content') : document.body;

    for (key in bars) {
      options[key] = options[key] || document.querySelector(bars[key]);
    }

    if (xhr && xhr.readyState < 4) {
      xhr.onreadystatechange = noop;
      xhr.abort()
    }

    xhr = new XMLHttpRequest();
    xhr.open('GET', options.url, true);
    xhr.setRequestHeader('X-PUSH', 'true');

    xhr.onreadystatechange = function () {
      if (options._timeout) clearTimeout(options._timeout);
      if (xhr.readyState == 4) xhr.status == 200 ? success(xhr, options) : failure(options.url);
    };

    if (!PUSH.id) {
      cacheReplace({
        id         : +new Date,
        url        : window.location.href,
        title      : document.title,
        timeout    : options.timeout,
        transition : null
      });
    }

    if (options.timeout) {
      options._timeout = setTimeout(function () {  xhr.abort('timeout'); }, options.timeout);
    }

    xhr.send();

    if (xhr.readyState && !options.ignorePush) cachePush();
  };


  // Main XHR handlers
  // =================

  var success = function (xhr, options) {
    var key;
    var barElement;
    var data = parseXHR(xhr, options);

    if (!data.contents) return locationReplace(options.url);

    if (data.title) document.title = data.title;

    if (options.transition) {
      for (key in bars) {
        barElement = document.querySelector(bars[key])
        if (data[key]) swapContent(data[key], barElement);
        else if (barElement) barElement.parentNode.removeChild(barElement);
      }
    }

    swapContent(data.contents, options.container, options.transition, function () {
      cacheReplace({
        id         : options.id || +new Date,
        url        : data.url,
        title      : data.title,
        timeout    : options.timeout,
        transition : options.transition
      }, options.id);
      triggerStateChange();
    });

    if (!options.ignorePush && window._gaq) _gaq.push(['_trackPageview']) // google analytics
    if (!options.hash) return;
  };

  var failure = function (url) {
    throw new Error('Could not get: ' + url)
  };


  // PUSH helpers
  // ============

  var swapContent = function (swap, container, transition, complete) {
    var enter;
    var containerDirection;
    var swapDirection;

    if (!transition) {
      if (container) container.innerHTML = swap.innerHTML;
      else if (swap.classList.contains('content')) document.body.appendChild(swap);
      else document.body.insertBefore(swap, document.querySelector('.content'));
    } else {
      enter  = /in$/.test(transition);

      if (transition == 'fade') {
        container.classList.add('in');
        container.classList.add('fade');
        swap.classList.add('fade');
      }

      if (/slide/.test(transition)) {
        swap.classList.add(enter ? 'right' : 'left');
        swap.classList.add('slide');
        container.classList.add('slide');
      }

      container.parentNode.insertBefore(swap, container);
    }

    if (!transition) complete && complete();

    if (transition == 'fade') {
      container.offsetWidth; // force reflow
      container.classList.remove('in');
      container.addEventListener('webkitTransitionEnd', fadeContainerEnd);

      function fadeContainerEnd() {
        container.removeEventListener('webkitTransitionEnd', fadeContainerEnd);
        swap.classList.add('in');
        swap.addEventListener('webkitTransitionEnd', fadeSwapEnd);
      }
      function fadeSwapEnd () {
        swap.removeEventListener('webkitTransitionEnd', fadeSwapEnd);
        container.parentNode.removeChild(container);
        swap.classList.remove('fade');
        swap.classList.remove('in');
        complete && complete();
      }
    }

    if (/slide/.test(transition)) {
      container.offsetWidth; // force reflow
      swapDirection      = enter ? 'right' : 'left'
      containerDirection = enter ? 'left' : 'right'
      container.classList.add(containerDirection);
      swap.classList.remove(swapDirection);
      swap.addEventListener('webkitTransitionEnd', slideEnd);

      function slideEnd() {
        swap.removeEventListener('webkitTransitionEnd', slideEnd);
        swap.classList.remove('slide');
        swap.classList.remove(swapDirection);
        container.parentNode.removeChild(container);
        complete && complete();
      }
    }
  };

  var triggerStateChange = function () {
    var e = new CustomEvent('push', {
      detail: { state: getCached(PUSH.id) },
      bubbles: true,
      cancelable: true
    });

    window.dispatchEvent(e);
  };

  var findTarget = function (target) {
    var i, toggles = document.querySelectorAll('a');
    for (; target && target !== document; target = target.parentNode) {
      for (i = toggles.length; i--;) { if (toggles[i] === target) return target; }
    }
  };

  var locationReplace = function (url) {
    window.history.replaceState(null, '', '#');
    window.location.replace(url);
  };

  var parseURL = function (url) {
    var a = document.createElement('a'); a.href = url; return a;
  };

  var extendWithDom = function (obj, fragment, dom) {
    var i;
    var result    = {};

    for (i in obj) result[i] = obj[i];

    Object.keys(bars).forEach(function (key) {
      var el = dom.querySelector(bars[key]);
      if (el) el.parentNode.removeChild(el);
      result[key] = el;
    });

    result.contents = dom.querySelector(fragment);

    return result;
  };

  var parseXHR = function (xhr, options) {
    var head;
    var body;
    var data = {};
    var responseText = xhr.responseText;

    data.url = options.url;

    if (!responseText) return data;

    if (/<html/i.test(responseText)) {
      head           = document.createElement('div');
      body           = document.createElement('div');
      head.innerHTML = responseText.match(/<head[^>]*>([\s\S.]*)<\/head>/i)[0]
      body.innerHTML = responseText.match(/<body[^>]*>([\s\S.]*)<\/body>/i)[0]
    } else {
      head           = body = document.createElement('div');
      head.innerHTML = responseText;
    }

    data.title = head.querySelector('title');
    data.title = data.title && data.title.innerText.trim();

    if (options.transition) data = extendWithDom(data, '.content', body);
    else data.contents = body;

    return data;
  };


  // Attach PUSH event handlers
  // ==========================

  window.addEventListener('touchstart', function () { isScrolling = false; });
  window.addEventListener('touchmove', function () { isScrolling = true; })
  window.addEventListener('touchend', touchend);
  window.addEventListener('click', function (e) { if (getTarget(e)) e.preventDefault(); });
  window.addEventListener('popstate', popstate);

}();*/

/* ----------------------------------
 * TABS v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

/* ----------------------------------
 * SLIDER v1.0.0
 * Licensed under The MIT License
 * Adapted from Brad Birdsall's swipe
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

/* ----------------------------------
 * TOGGLE v1.0.0
 * Licensed under The MIT License
 * http://opensource.org/licenses/MIT
 * ---------------------------------- */

(function(e){String.prototype.trim===e&&(String.prototype.trim=function(){return this.replace(/^\s+/,"").replace(/\s+$/,"")}),Array.prototype.reduce===e&&(Array.prototype.reduce=function(t){if(this===void 0||this===null)throw new TypeError;var n=Object(this),r=n.length>>>0,i=0,s;if(typeof t!="function")throw new TypeError;if(r==0&&arguments.length==1)throw new TypeError;if(arguments.length>=2)s=arguments[1];else do{if(i in n){s=n[i++];break}if(++i>=r)throw new TypeError}while(!0);while(i<r)i in n&&(s=t.call(e,s,n[i],i,n)),i++;return s})})();var Zepto=function(){function C(e){return E.call(e)=="[object Function]"}function k(e){return e instanceof Object}function L(t){var n,r;if(E.call(t)!=="[object Object]")return!1;r=C(t.constructor)&&t.constructor.prototype;if(!r||!hasOwnProperty.call(r,"isPrototypeOf"))return!1;for(n in t);return n===e||hasOwnProperty.call(t,n)}function A(e){return e instanceof Array}function O(e){return typeof e.length=="number"}function M(t){return t.filter(function(t){return t!==e&&t!==null})}function _(e){return e.length>0?[].concat.apply([],e):e}function D(e){return e.replace(/::/g,"/").replace(/([A-Z]+)([A-Z][a-z])/g,"$1_$2").replace(/([a-z\d])([A-Z])/g,"$1_$2").replace(/_/g,"-").toLowerCase()}function P(e){return e in a?a[e]:a[e]=new RegExp("(^|\\s)"+e+"(\\s|$)")}function H(e,t){return typeof t=="number"&&!l[D(e)]?t+"px":t}function B(e){var t,n;return u[e]||(t=o.createElement(e),o.body.appendChild(t),n=f(t,"").getPropertyValue("display"),t.parentNode.removeChild(t),n=="none"&&(n="block"),u[e]=n),u[e]}function j(t,r){return r===e?n(t):n(t).filter(r)}function F(e,t,n,r){return C(t)?t.call(e,n,r):t}function I(e,t,r){var i=e%2?t:t.parentNode;i?i.insertBefore(r,e?e==1?i.firstChild:e==2?t:null:t.nextSibling):n(r).remove()}function q(e,t){t(e);for(var n in e.childNodes)q(e.childNodes[n],t)}var e,t,n,r,i=[],s=i.slice,o=window.document,u={},a={},f=o.defaultView.getComputedStyle,l={"column-count":1,columns:1,"font-weight":1,"line-height":1,opacity:1,"z-index":1,zoom:1},c=/^\s*<(\w+|!)[^>]*>/,h=[1,3,8,9,11],p=["after","prepend","before","append"],d=o.createElement("table"),v=o.createElement("tr"),m={tr:o.createElement("tbody"),tbody:d,thead:d,tfoot:d,td:v,th:v,"*":o.createElement("div")},g=/complete|loaded|interactive/,y=/^\.([\w-]+)$/,b=/^#([\w-]+)$/,w=/^[\w-]+$/,E={}.toString,S={},x,T,N=o.createElement("div");return S.matches=function(e,t){if(!e||e.nodeType!==1)return!1;var n=e.webkitMatchesSelector||e.mozMatchesSelector||e.oMatchesSelector||e.matchesSelector;if(n)return n.call(e,t);var r,i=e.parentNode,s=!i;return s&&(i=N).appendChild(e),r=~S.qsa(i,t).indexOf(e),s&&N.removeChild(e),r},x=function(e){return e.replace(/-+(.)?/g,function(e,t){return t?t.toUpperCase():""})},T=function(e){return e.filter(function(t,n){return e.indexOf(t)==n})},S.fragment=function(t,r){r===e&&(r=c.test(t)&&RegExp.$1),r in m||(r="*");var i=m[r];return i.innerHTML=""+t,n.each(s.call(i.childNodes),function(){i.removeChild(this)})},S.Z=function(e,t){return e=e||[],e.__proto__=arguments.callee.prototype,e.selector=t||"",e},S.isZ=function(e){return e instanceof S.Z},S.init=function(t,r){if(!t)return S.Z();if(C(t))return n(o).ready(t);if(S.isZ(t))return t;var i;if(A(t))i=M(t);else if(L(t))i=[n.extend({},t)],t=null;else if(h.indexOf(t.nodeType)>=0||t===window)i=[t],t=null;else if(c.test(t))i=S.fragment(t.trim(),RegExp.$1),t=null;else{if(r!==e)return n(r).find(t);i=S.qsa(o,t)}return S.Z(i,t)},n=function(e,t){return S.init(e,t)},n.extend=function(n){return s.call(arguments,1).forEach(function(r){for(t in r)r[t]!==e&&(n[t]=r[t])}),n},S.qsa=function(e,t){var n;return e===o&&b.test(t)?(n=e.getElementById(RegExp.$1))?[n]:i:e.nodeType!==1&&e.nodeType!==9?i:s.call(y.test(t)?e.getElementsByClassName(RegExp.$1):w.test(t)?e.getElementsByTagName(t):e.querySelectorAll(t))},n.isFunction=C,n.isObject=k,n.isArray=A,n.isPlainObject=L,n.inArray=function(e,t,n){return i.indexOf.call(t,e,n)},n.trim=function(e){return e.trim()},n.uuid=0,n.map=function(e,t){var n,r=[],i,s;if(O(e))for(i=0;i<e.length;i++)n=t(e[i],i),n!=null&&r.push(n);else for(s in e)n=t(e[s],s),n!=null&&r.push(n);return _(r)},n.each=function(e,t){var n,r;if(O(e)){for(n=0;n<e.length;n++)if(t.call(e[n],n,e[n])===!1)return e}else for(r in e)if(t.call(e[r],r,e[r])===!1)return e;return e},n.fn={forEach:i.forEach,reduce:i.reduce,push:i.push,indexOf:i.indexOf,concat:i.concat,map:function(e){return n.map(this,function(t,n){return e.call(t,n,t)})},slice:function(){return n(s.apply(this,arguments))},ready:function(e){return g.test(o.readyState)?e(n):o.addEventListener("DOMContentLoaded",function(){e(n)},!1),this},get:function(t){return t===e?s.call(this):this[t]},toArray:function(){return this.get()},size:function(){return this.length},remove:function(){return this.each(function(){this.parentNode!=null&&this.parentNode.removeChild(this)})},each:function(e){return this.forEach(function(t,n){e.call(t,n,t)}),this},filter:function(e){return n([].filter.call(this,function(t){return S.matches(t,e)}))},add:function(e,t){return n(T(this.concat(n(e,t))))},is:function(e){return this.length>0&&S.matches(this[0],e)},not:function(t){var r=[];if(C(t)&&t.call!==e)this.each(function(e){t.call(this,e)||r.push(this)});else{var i=typeof t=="string"?this.filter(t):O(t)&&C(t.item)?s.call(t):n(t);this.forEach(function(e){i.indexOf(e)<0&&r.push(e)})}return n(r)},eq:function(e){return e===-1?this.slice(e):this.slice(e,+e+1)},first:function(){var e=this[0];return e&&!k(e)?e:n(e)},last:function(){var e=this[this.length-1];return e&&!k(e)?e:n(e)},find:function(e){var t;return this.length==1?t=S.qsa(this[0],e):t=this.map(function(){return S.qsa(this,e)}),n(t)},closest:function(e,t){var r=this[0];while(r&&!S.matches(r,e))r=r!==t&&r!==o&&r.parentNode;return n(r)},parents:function(e){var t=[],r=this;while(r.length>0)r=n.map(r,function(e){if((e=e.parentNode)&&e!==o&&t.indexOf(e)<0)return t.push(e),e});return j(t,e)},parent:function(e){return j(T(this.pluck("parentNode")),e)},children:function(e){return j(this.map(function(){return s.call(this.children)}),e)},siblings:function(e){return j(this.map(function(e,t){return s.call(t.parentNode.children).filter(function(e){return e!==t})}),e)},empty:function(){return this.each(function(){this.innerHTML=""})},pluck:function(e){return this.map(function(){return this[e]})},show:function(){return this.each(function(){this.style.display=="none"&&(this.style.display=null),f(this,"").getPropertyValue("display")=="none"&&(this.style.display=B(this.nodeName))})},replaceWith:function(e){return this.before(e).remove()},wrap:function(e){return this.each(function(){n(this).wrapAll(n(e)[0].cloneNode(!1))})},wrapAll:function(e){return this[0]&&(n(this[0]).before(e=n(e)),e.append(this)),this},unwrap:function(){return this.parent().each(function(){n(this).replaceWith(n(this).children())}),this},clone:function(){return n(this.map(function(){return this.cloneNode(!0)}))},hide:function(){return this.css("display","none")},toggle:function(t){return(t===e?this.css("display")=="none":t)?this.show():this.hide()},prev:function(){return n(this.pluck("previousElementSibling"))},next:function(){return n(this.pluck("nextElementSibling"))},html:function(t){return t===e?this.length>0?this[0].innerHTML:null:this.each(function(e){var r=this.innerHTML;n(this).empty().append(F(this,t,e,r))})},text:function(t){return t===e?this.length>0?this[0].textContent:null:this.each(function(){this.textContent=t})},attr:function(n,r){var i;return typeof n=="string"&&r===e?this.length==0||this[0].nodeType!==1?e:n=="value"&&this[0].nodeName=="INPUT"?this.val():!(i=this[0].getAttribute(n))&&n in this[0]?this[0][n]:i:this.each(function(e){if(this.nodeType!==1)return;if(k(n))for(t in n)this.setAttribute(t,n[t]);else this.setAttribute(n,F(this,r,e,this.getAttribute(n)))})},removeAttr:function(e){return this.each(function(){this.nodeType===1&&this.removeAttribute(e)})},prop:function(t,n){return n===e?this[0]?this[0][t]:e:this.each(function(e){this[t]=F(this,n,e,this[t])})},data:function(t,n){var r=this.attr("data-"+D(t),n);return r!==null?r:e},val:function(t){return t===e?this.length>0?this[0].value:e:this.each(function(e){this.value=F(this,t,e,this.value)})},offset:function(){if(this.length==0)return null;var e=this[0].getBoundingClientRect();return{left:e.left+window.pageXOffset,top:e.top+window.pageYOffset,width:e.width,height:e.height}},css:function(n,r){if(r===e&&typeof n=="string")return this.length==0?e:this[0].style[x(n)]||f(this[0],"").getPropertyValue(n);var i="";for(t in n)typeof n[t]=="string"&&n[t]==""?this.each(function(){this.style.removeProperty(D(t))}):i+=D(t)+":"+H(t,n[t])+";";return typeof n=="string"&&(r==""?this.each(function(){this.style.removeProperty(D(n))}):i=D(n)+":"+H(n,r)),this.each(function(){this.style.cssText+=";"+i})},index:function(e){return e?this.indexOf(n(e)[0]):this.parent().children().indexOf(this[0])},hasClass:function(e){return this.length<1?!1:P(e).test(this[0].className)},addClass:function(e){return this.each(function(t){r=[];var i=this.className,s=F(this,e,t,i);s.split(/\s+/g).forEach(function(e){n(this).hasClass(e)||r.push(e)},this),r.length&&(this.className+=(i?" ":"")+r.join(" "))})},removeClass:function(t){return this.each(function(n){if(t===e)return this.className="";r=this.className,F(this,t,n,r).split(/\s+/g).forEach(function(e){r=r.replace(P(e)," ")}),this.className=r.trim()})},toggleClass:function(t,r){return this.each(function(i){var s=F(this,t,i,this.className);(r===e?!n(this).hasClass(s):r)?n(this).addClass(s):n(this).removeClass(s)})}},["width","height"].forEach(function(t){n.fn[t]=function(r){var i,s=t.replace(/./,function(e){return e[0].toUpperCase()});return r===e?this[0]==window?window["inner"+s]:this[0]==o?o.documentElement["offset"+s]:(i=this.offset())&&i[t]:this.each(function(e){var i=n(this);i.css(t,F(this,r,e,i[t]()))})}}),p.forEach(function(e,t){n.fn[e]=function(){var e=n.map(arguments,function(e){return k(e)?e:S.fragment(e)});if(e.length<1)return this;var r=this.length,i=r>1,s=t<2;return this.each(function(n,o){for(var u=0;u<e.length;u++){var a=e[s?e.length-u-1:u];q(a,function(e){e.nodeName!=null&&e.nodeName.toUpperCase()==="SCRIPT"&&(!e.type||e.type==="text/javascript")&&window.eval.call(window,e.innerHTML)}),i&&n<r-1&&(a=a.cloneNode(!0)),I(t,o,a)}})},n.fn[t%2?e+"To":"insert"+(t?"Before":"After")]=function(t){return n(t)[e](this),this}}),S.Z.prototype=n.fn,S.camelize=x,S.uniq=T,n.zepto=S,n}();window.Zepto=Zepto,"$"in window||(window.$=Zepto),function(e){function s(e){return e._zid||(e._zid=r++)}function o(e,t,r,i){t=u(t);if(t.ns)var o=a(t.ns);return(n[s(e)]||[]).filter(function(e){return e&&(!t.e||e.e==t.e)&&(!t.ns||o.test(e.ns))&&(!r||s(e.fn)===s(r))&&(!i||e.sel==i)})}function u(e){var t=(""+e).split(".");return{e:t[0],ns:t.slice(1).sort().join(" ")}}function a(e){return new RegExp("(?:^| )"+e.replace(" "," .* ?")+"(?: |$)")}function f(t,n,r){e.isObject(t)?e.each(t,r):t.split(/\s/).forEach(function(e){r(e,n)})}function l(t,r,i,o,a,l){l=!!l;var c=s(t),h=n[c]||(n[c]=[]);f(r,i,function(n,r){var i=a&&a(r,n),s=i||r,f=function(e){var n=s.apply(t,[e].concat(e.data));return n===!1&&e.preventDefault(),n},c=e.extend(u(n),{fn:r,proxy:f,sel:o,del:i,i:h.length});h.push(c),t.addEventListener(c.e,f,l)})}function c(e,t,r,i){var u=s(e);f(t||"",r,function(t,r){o(e,t,r,i).forEach(function(t){delete n[u][t.i],e.removeEventListener(t.e,t.proxy,!1)})})}function v(t){var n=e.extend({originalEvent:t},t);return e.each(d,function(e,r){n[e]=function(){return this[r]=h,t[e].apply(t,arguments)},n[r]=p}),n}function m(e){if(!("defaultPrevented"in e)){e.defaultPrevented=!1;var t=e.preventDefault;e.preventDefault=function(){this.defaultPrevented=!0,t.call(this)}}}var t=e.zepto.qsa,n={},r=1,i={};i.click=i.mousedown=i.mouseup=i.mousemove="MouseEvents",e.event={add:l,remove:c},e.proxy=function(t,n){if(e.isFunction(t)){var r=function(){return t.apply(n,arguments)};return r._zid=s(t),r}if(typeof n=="string")return e.proxy(t[n],t);throw new TypeError("expected function")},e.fn.bind=function(e,t){return this.each(function(){l(this,e,t)})},e.fn.unbind=function(e,t){return this.each(function(){c(this,e,t)})},e.fn.one=function(e,t){return this.each(function(n,r){l(this,e,t,null,function(e,t){return function(){var n=e.apply(r,arguments);return c(r,t,e),n}})})};var h=function(){return!0},p=function(){return!1},d={preventDefault:"isDefaultPrevented",stopImmediatePropagation:"isImmediatePropagationStopped",stopPropagation:"isPropagationStopped"};e.fn.delegate=function(t,n,r){var i=!1;if(n=="blur"||n=="focus")e.iswebkit?n=n=="blur"?"focusout":n=="focus"?"focusin":n:i=!0;return this.each(function(s,o){l(o,n,r,t,function(n){return function(r){var i,s=e(r.target).closest(t,o).get(0);if(s)return i=e.extend(v(r),{currentTarget:s,liveFired:o}),n.apply(s,[i].concat([].slice.call(arguments,1)))}},i)})},e.fn.undelegate=function(e,t,n){return this.each(function(){c(this,t,n,e)})},e.fn.live=function(t,n){return e(document.body).delegate(this.selector,t,n),this},e.fn.die=function(t,n){return e(document.body).undelegate(this.selector,t,n),this},e.fn.on=function(t,n,r){return n==undefined||e.isFunction(n)?this.bind(t,n):this.delegate(n,t,r)},e.fn.off=function(t,n,r){return n==undefined||e.isFunction(n)?this.unbind(t,n):this.undelegate(n,t,r)},e.fn.trigger=function(t,n){return typeof t=="string"&&(t=e.Event(t)),m(t),t.data=n,this.each(function(){"dispatchEvent"in this&&this.dispatchEvent(t)})},e.fn.triggerHandler=function(t,n){var r,i;return this.each(function(s,u){r=v(typeof t=="string"?e.Event(t):t),r.data=n,r.target=u,e.each(o(u,t.type||t),function(e,t){i=t.proxy(r);if(r.isImmediatePropagationStopped())return!1})}),i},"focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout change select keydown keypress keyup error".split(" ").forEach(function(t){e.fn[t]=function(e){return this.bind(t,e)}}),["focus","blur"].forEach(function(t){e.fn[t]=function(e){if(e)this.bind(t,e);else if(this.length)try{this.get(0)[t]()}catch(n){}return this}}),e.Event=function(e,t){var n=document.createEvent(i[e]||"Events"),r=!0;if(t)for(var s in t)s=="bubbles"?r=!!t[s]:n[s]=t[s];return n.initEvent(e,r,!0,null,null,null,null,null,null,null,null,null,null,null,null),n}}(Zepto),function(e){function t(e){var t=this.os={},n=this.browser={},r=e.match(/WebKit\/([\d.]+)/),i=e.match(/(Android)\s+([\d.]+)/),s=e.match(/(iPad).*OS\s([\d_]+)/),o=!s&&e.match(/(iPhone\sOS)\s([\d_]+)/),u=e.match(/(webOS|hpwOS)[\s\/]([\d.]+)/),a=u&&e.match(/TouchPad/),f=e.match(/Kindle\/([\d.]+)/),l=e.match(/Silk\/([\d._]+)/),c=e.match(/(BlackBerry).*Version\/([\d.]+)/);if(n.webkit=!!r)n.version=r[1];i&&(t.android=!0,t.version=i[2]),o&&(t.ios=t.iphone=!0,t.version=o[2].replace(/_/g,".")),s&&(t.ios=t.ipad=!0,t.version=s[2].replace(/_/g,".")),u&&(t.webos=!0,t.version=u[2]),a&&(t.touchpad=!0),c&&(t.blackberry=!0,t.version=c[2]),f&&(t.kindle=!0,t.version=f[1]),l&&(n.silk=!0,n.version=l[1]),!l&&t.android&&e.match(/Kindle Fire/)&&(n.silk=!0)}t.call(e,navigator.userAgent),e.__detect=t}(Zepto),function(e,t){function c(e){return e.toLowerCase()}function h(e){return r?r+e:c(e)}var n="",r,i,s,o={Webkit:"webkit",Moz:"",O:"o",ms:"MS"},u=window.document,a=u.createElement("div"),f=/^((translate|rotate|scale)(X|Y|Z|3d)?|matrix(3d)?|perspective|skew(X|Y)?)$/i,l={};e.each(o,function(e,i){if(a.style[e+"TransitionProperty"]!==t)return n="-"+c(e)+"-",r=i,!1}),l[n+"transition-property"]=l[n+"transition-duration"]=l[n+"transition-timing-function"]=l[n+"animation-name"]=l[n+"animation-duration"]="",e.fx={off:r===t&&a.style.transitionProperty===t,cssPrefix:n,transitionEnd:h("TransitionEnd"),animationEnd:h("AnimationEnd")},e.fn.animate=function(t,n,r,i){return e.isObject(n)&&(r=n.easing,i=n.complete,n=n.duration),n&&(n/=1e3),this.anim(t,n,r,i)},e.fn.anim=function(r,i,s,o){var u,a={},c,h=this,p,d=e.fx.transitionEnd;i===t&&(i=.4),e.fx.off&&(i=0);if(typeof r=="string")a[n+"animation-name"]=r,a[n+"animation-duration"]=i+"s",d=e.fx.animationEnd;else{for(c in r)f.test(c)?(u||(u=[]),u.push(c+"("+r[c]+")")):a[c]=r[c];u&&(a[n+"transform"]=u.join(" ")),!e.fx.off&&typeof r=="object"&&(a[n+"transition-property"]=Object.keys(r).join(", "),a[n+"transition-duration"]=i+"s",a[n+"transition-timing-function"]=s||"linear")}return p=function(t){if(typeof t!="undefined"){if(t.target!==t.currentTarget)return;e(t.target).unbind(d,arguments.callee)}e(this).css(l),o&&o.call(this)},i>0&&this.bind(d,p),setTimeout(function(){h.css(a),i<=0&&setTimeout(function(){h.each(function(){p.call(this)})},0)},0),this},a=null}(Zepto),function($){function triggerAndReturn(e,t,n){var r=$.Event(t);return $(e).trigger(r,n),!r.defaultPrevented}function triggerGlobal(e,t,n,r){if(e.global)return triggerAndReturn(t||document,n,r)}function ajaxStart(e){e.global&&$.active++===0&&triggerGlobal(e,null,"ajaxStart")}function ajaxStop(e){e.global&&!--$.active&&triggerGlobal(e,null,"ajaxStop")}function ajaxBeforeSend(e,t){var n=t.context;if(t.beforeSend.call(n,e,t)===!1||triggerGlobal(t,n,"ajaxBeforeSend",[e,t])===!1)return!1;triggerGlobal(t,n,"ajaxSend",[e,t])}function ajaxSuccess(e,t,n){var r=n.context,i="success";n.success.call(r,e,i,t),triggerGlobal(n,r,"ajaxSuccess",[t,n,e]),ajaxComplete(i,t,n)}function ajaxError(e,t,n,r){var i=r.context;r.error.call(i,n,t,e),triggerGlobal(r,i,"ajaxError",[n,r,e]),ajaxComplete(t,n,r)}function ajaxComplete(e,t,n){var r=n.context;n.complete.call(r,t,e),triggerGlobal(n,r,"ajaxComplete",[t,n]),ajaxStop(n)}function empty(){}function mimeToDataType(e){return e&&(e==htmlType?"html":e==jsonType?"json":scriptTypeRE.test(e)?"script":xmlTypeRE.test(e)&&"xml")||"text"}function appendQuery(e,t){return(e+"&"+t).replace(/[&?]{1,2}/,"?")}function serializeData(e){isObject(e.data)&&(e.data=$.param(e.data)),e.data&&(!e.type||e.type.toUpperCase()=="GET")&&(e.url=appendQuery(e.url,e.data))}function serialize(e,t,n,r){var i=$.isArray(t);$.each(t,function(t,s){r&&(t=n?r:r+"["+(i?"":t)+"]"),!r&&i?e.add(s.name,s.value):(n?$.isArray(s):isObject(s))?serialize(e,s,n,t):e.add(t,s)})}var jsonpID=0,isObject=$.isObject,document=window.document,key,name,rscript=/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,scriptTypeRE=/^(?:text|application)\/javascript/i,xmlTypeRE=/^(?:text|application)\/xml/i,jsonType="application/json",htmlType="text/html",blankRE=/^\s*$/;$.active=0,$.ajaxJSONP=function(e){var t="jsonp"+ ++jsonpID,n=document.createElement("script"),r=function(){$(n).remove(),t in window&&(window[t]=empty),ajaxComplete("abort",i,e)},i={abort:r},s;return e.error&&(n.onerror=function(){i.abort(),e.error()}),window[t]=function(r){clearTimeout(s),$(n).remove(),delete window[t],ajaxSuccess(r,i,e)},serializeData(e),n.src=e.url.replace(/=\?/,"="+t),$("head").append(n),e.timeout>0&&(s=setTimeout(function(){i.abort(),ajaxComplete("timeout",i,e)},e.timeout)),i},$.ajaxSettings={type:"GET",beforeSend:empty,success:empty,error:empty,complete:empty,context:null,global:!0,xhr:function(){return new window.XMLHttpRequest},accepts:{script:"text/javascript, application/javascript",json:jsonType,xml:"application/xml, text/xml",html:htmlType,text:"text/plain"},crossDomain:!1,timeout:0},$.ajax=function(options){var settings=$.extend({},options||{});for(key in $.ajaxSettings)settings[key]===undefined&&(settings[key]=$.ajaxSettings[key]);ajaxStart(settings),settings.crossDomain||(settings.crossDomain=/^([\w-]+:)?\/\/([^\/]+)/.test(settings.url)&&RegExp.$2!=window.location.host);var dataType=settings.dataType,hasPlaceholder=/=\?/.test(settings.url);if(dataType=="jsonp"||hasPlaceholder)return hasPlaceholder||(settings.url=appendQuery(settings.url,"callback=?")),$.ajaxJSONP(settings);settings.url||(settings.url=window.location.toString()),serializeData(settings);var mime=settings.accepts[dataType],baseHeaders={},protocol=/^([\w-]+:)\/\//.test(settings.url)?RegExp.$1:window.location.protocol,xhr=$.ajaxSettings.xhr(),abortTimeout;settings.crossDomain||(baseHeaders["X-Requested-With"]="XMLHttpRequest"),mime&&(baseHeaders.Accept=mime,mime.indexOf(",")>-1&&(mime=mime.split(",",2)[0]),xhr.overrideMimeType&&xhr.overrideMimeType(mime));if(settings.contentType||settings.data&&settings.type.toUpperCase()!="GET")baseHeaders["Content-Type"]=settings.contentType||"application/x-www-form-urlencoded";settings.headers=$.extend(baseHeaders,settings.headers||{}),xhr.onreadystatechange=function(){if(xhr.readyState==4){clearTimeout(abortTimeout);var result,error=!1;if(xhr.status>=200&&xhr.status<300||xhr.status==304||xhr.status==0&&protocol=="file:"){dataType=dataType||mimeToDataType(xhr.getResponseHeader("content-type")),result=xhr.responseText;try{dataType=="script"?(1,eval)(result):dataType=="xml"?result=xhr.responseXML:dataType=="json"&&(result=blankRE.test(result)?null:JSON.parse(result))}catch(e){error=e}error?ajaxError(error,"parsererror",xhr,settings):ajaxSuccess(result,xhr,settings)}else ajaxError(null,"error",xhr,settings)}};var async="async"in settings?settings.async:!0;xhr.open(settings.type,settings.url,async);for(name in settings.headers)xhr.setRequestHeader(name,settings.headers[name]);return ajaxBeforeSend(xhr,settings)===!1?(xhr.abort(),!1):(settings.timeout>0&&(abortTimeout=setTimeout(function(){xhr.onreadystatechange=empty,xhr.abort(),ajaxError(null,"timeout",xhr,settings)},settings.timeout)),xhr.send(settings.data?settings.data:null),xhr)},$.get=function(e,t){return $.ajax({url:e,success:t})},$.post=function(e,t,n,r){return $.isFunction(t)&&(r=r||n,n=t,t=null),$.ajax({type:"POST",url:e,data:t,success:n,dataType:r})},$.getJSON=function(e,t){return $.ajax({url:e,success:t,dataType:"json"})},$.fn.load=function(e,t){if(!this.length)return this;var n=this,r=e.split(/\s/),i;return r.length>1&&(e=r[0],i=r[1]),$.get(e,function(e){n.html(i?$(document.createElement("div")).html(e.replace(rscript,"")).find(i).html():e),t&&t.call(n)}),this};var escape=encodeURIComponent;$.param=function(e,t){var n=[];return n.add=function(e,t){this.push(escape(e)+"="+escape(t))},serialize(n,e,t),n.join("&").replace("%20","+")}}(Zepto),function(e){e.fn.serializeArray=function(){var t=[],n;return e(Array.prototype.slice.call(this.get(0).elements)).each(function(){n=e(this);var r=n.attr("type");this.nodeName.toLowerCase()!="fieldset"&&!this.disabled&&r!="submit"&&r!="reset"&&r!="button"&&(r!="radio"&&r!="checkbox"||this.checked)&&t.push({name:n.attr("name"),value:n.val()})}),t},e.fn.serialize=function(){var e=[];return this.serializeArray().forEach(function(t){e.push(encodeURIComponent(t.name)+"="+encodeURIComponent(t.value))}),e.join("&")},e.fn.submit=function(t){if(t)this.bind("submit",t);else if(this.length){var n=e.Event("submit");this.eq(0).trigger(n),n.defaultPrevented||this.get(0).submit()}return this}}(Zepto),function(e){function r(e){return"tagName"in e?e:e.parentNode}function i(e,t,n,r){var i=Math.abs(e-t),s=Math.abs(n-r);return i>=s?e-t>0?"Left":"Right":n-r>0?"Up":"Down"}function u(){o=null,t.last&&(t.el.trigger("longTap"),t={})}function a(){o&&clearTimeout(o),o=null}var t={},n,s=750,o;e(document).ready(function(){var f,l;e(document.body).bind("touchstart",function(i){f=Date.now(),l=f-(t.last||f),t.el=e(r(i.touches[0].target)),n&&clearTimeout(n),t.x1=i.touches[0].pageX,t.y1=i.touches[0].pageY,l>0&&l<=250&&(t.isDoubleTap=!0),t.last=f,o=setTimeout(u,s)}).bind("touchmove",function(e){a(),t.x2=e.touches[0].pageX,t.y2=e.touches[0].pageY}).bind("touchend",function(e){a(),t.isDoubleTap?(t.el.trigger("doubleTap"),t={}):t.x2&&Math.abs(t.x1-t.x2)>30||t.y2&&Math.abs(t.y1-t.y2)>30?(t.el.trigger("swipe")&&t.el.trigger("swipe"+i(t.x1,t.x2,t.y1,t.y2)),t={}):"last"in t&&(t.el.trigger("tap"),n=setTimeout(function(){n=null,t.el.trigger("singleTap"),t={}},250))}).bind("touchcancel",function(){n&&clearTimeout(n),o&&clearTimeout(o),o=n=null,t={}})}),["swipe","swipeLeft","swipeRight","swipeUp","swipeDown","doubleTap","tap","singleTap","longTap"].forEach(function(t){e.fn[t]=function(e){return this.bind(t,e)}})}(Zepto),define("jquery",function(e){return function(){var t,n;return t||e.$}}(this)),function(e,t){function I(e){return new q(e)}function q(e){if(e&&e._wrapped)return e;this._wrapped=e}function K(){var e,t,n,i=-1,s=arguments.length,o={bottom:"",exit:"",init:"",top:"",arrayBranch:{beforeLoop:"",loopExp:"++index < length"},objectBranch:{beforeLoop:""}};while(++i<s){e=arguments[i];for(t in e)n=(n=e[t])==null?"":n,/beforeLoop|loopExp|inLoop/.test(t)?(typeof n=="string"&&(n={array:n,object:n}),o.arrayBranch[t]=n.array,o.objectBranch[t]=n.object):o[t]=n}var u=o.args,a=o.arrayBranch,f=o.objectBranch,c=/^[^,]+/.exec(u)[0],h=f.loopExp,p=/\S+$/.exec(h||c)[0];o.firstArg=c,o.hasDontEnumBug=r,o.hasExp="hasOwnProperty.call("+p+", index)",o.iteratedObject=p,o.shadowed=l,o.useHas=o.useHas!==!1,o.exit||(o.exit="if (!"+c+") return result");if(c=="object"||!a.inLoop)o.arrayBranch=null;h||(f.loopExp="index in "+p);var d=Function("arrayClass, funcClass, hasOwnProperty, identity, iteratorBind, objectTypes, slice, stringClass, toString, undefined"," return function("+u+") {\n"+R(o)+"\n}");return d(b,S,A,Cn,Z,g,M,N,_)}function Q(e,t){return p[t]}function G(e){return"\\"+y[e]}function Y(e){return m[e]}function Z(e,t){return function(n,r,i){return e.call(t,n,r,i)}}function et(){}function nt(e,t){var n=p.length;return p[n]="'+\n_.escape("+t+") +\n'",h+n}function rt(e,t){var n=p.length;return p[n]="'+\n((__t = ("+t+")) == null ? '' : __t) +\n'",h+n}function it(e,t){var n=p.length;return p[n]="';\n"+t+";\n__p += '",h+n}function dt(e,t,n,r){if(!e)return n;var i=e.length,s=arguments.length<3;r&&(t=Z(t,r));if(i===i>>>0){i&&s&&(n=e[--i]);while(i--)n=t(n,e[i],i,e);return n}var o,u=En(e);i=u.length,i&&s&&(n=e[u[--i]]);while(i--)o=u[i],n=t(n,e[o],o,e);return n}function gt(e){if(!e)return[];if(_.call(e.toArray)==S)return e.toArray();var t=e.length;return t===t>>>0?M.call(e):Tn(e)}function yt(e){var t=[];if(!e)return t;var n=-1,r=e.length;while(++n<r)e[n]&&t.push(e[n]);return t}function bt(e){var t=[];if(!e)return t;var n=-1,r=e.length,i=L.apply(t,M.call(arguments,1));while(++n<r)xt(i,e[n])<0&&t.push(e[n]);return t}function wt(e,n,r){if(e)return n==t||r?e[0]:M.call(e,0,n)}function Et(e,t){var n=[];if(!e)return n;var r,i=-1,s=e.length;while(++i<s)r=e[i],on(r)?O.apply(n,t?r:Et(r)):n.push(r);return n}function St(e,t,n){var r={};if(!e)return r;var i,s,o=-1,u=typeof t=="function",a=e.length;u&&n&&(t=Z(t,n));while(++o<a)s=e[o],i=u?t(s,o,e):s[t],(A.call(r,i)?r[i]:r[i]=[]).push(s);return r}function xt(e,t,n){if(!e)return-1;var r=-1,i=e.length;if(n){if(typeof n!="number")return r=Pt(e,t),e[r]===t?r:-1;r=(n<0?Math.max(0,i+n):n)-1}while(++r<i)if(e[r]===t)return r;return-1}function Tt(e,n,r){return e?M.call(e,0,-(n==t||r?1:n)):[]}function Nt(e){var t=[];if(!e)return t;var n,r=-1,i=e.length,s=M.call(arguments,1);while(++r<i)n=e[r],xt(t,n)<0&&ot(s,function(e){return xt(e,n)>-1})&&t.push(n);return t}function Ct(e,n,r){if(e){var i=e.length;return n==t||r?e[i-1]:M.call(e,-n||i)}}function kt(e,t,n){if(!e)return-1;var r=e.length;n&&typeof n=="number"&&(r=(n<0?Math.max(0,r+n):Math.min(n,r-1))+1);while(r--)if(e[r]===t)return r;return-1}function Lt(e,t,n){var r=-Infinity,i=r;if(!e)return i;var s,o=-1,u=e.length;if(!t){while(++o<u)e[o]>i&&(i=e[o]);return i}n&&(t=Z(t,n));while(++o<u)s=t(e[o],o,e),s>r&&(r=s,i=e[o]);return i}function At(e,t,n){var r=Infinity,i=r;if(!e)return i;var s,o=-1,u=e.length;if(!t){while(++o<u)e[o]<i&&(i=e[o]);return i}n&&(t=Z(t,n));while(++o<u)s=t(e[o],o,e),s<r&&(r=s,i=e[o]);return i}function Ot(e,t,n){n||(n=1),arguments.length<2&&(t=e||0,e=0);var r=-1,i=Math.max(Math.ceil((t-e)/n),0),s=Array(i);while(++r<i)s[r]=e,e+=n;return s}function Mt(e,n,r){return e?M.call(e,n==t||r?1:n):[]}function _t(e){if(!e)return[];var t,n=-1,r=e.length,i=Array(r);while(++n<r)t=Math.floor(Math.random()*(n+1)),i[n]=i[t],i[t]=e[n];return i}function Dt(e,n,r){if(!e)return[];if(typeof n=="string"){var i=n;n=function(e){return e[i]}}else r&&(n=Z(n,r));var s=-1,o=e.length,u=Array(o);while(++s<o)u[s]={criteria:n(e[s],s,e),value:e[s]};u.sort(function(e,n){var r=e.criteria,i=n.criteria;return r===t?1:i===t?-1:r<i?-1:r>i?1:0});while(o--)u[o]=u[o].value;return u}function Pt(e,t,n,r){if(!e)return 0;var i,s=0,o=e.length;if(n){r&&(n=qt(n,r)),t=n(t);while(s<o)i=s+o>>>1,n(e[i])<t?s=i+1:o=i}else while(s<o)i=s+o>>>1,e[i]<t?s=i+1:o=i;return s}function Ht(){var e=-1,t=[],n=L.apply(t,arguments),r=n.length;while(++e<r)xt(t,n[e])<0&&t.push(n[e]);return t}function Bt(e,t,n,r){var i=[];if(!e)return i;var s,o=-1,u=e.length,a=[];typeof t=="function"&&(r=n,n=t,t=!1),n?r&&(n=Z(n,r)):n=Cn;while(++o<u){s=n(e[o],o,e);if(t?!o||a[a.length-1]!==s:xt(a,s)<0)a.push(s),i.push(e[o])}return i}function jt(e){var t=[];if(!e)return t;var n=M.call(arguments,1),r=-1,i=e.length;while(++r<i)xt(n,e[r])<0&&t.push(e[r]);return t}function Ft(e){if(!e)return[];var t=-1,n=Lt(ht(arguments,"length")),r=Array(n);while(++t<n)r[t]=ht(arguments,t);return r}function It(e,t){return e<1?t():function(){if(--e<1)return t.apply(this,arguments)}}function qt(e,t){function s(){var o=arguments,u=t;r||(e=t[n]),i.length&&(o=o.length?L.apply(i,o):i);if(this instanceof s){et.prototype=e.prototype,u=new et;var a=e.apply(u,o);return g[typeof a]&&a!==null?a:u}return e.apply(u,o)}var n,r=_.call(e)==S;if(!r)n=t,t=e;else if(D)return D.call.apply(D,arguments);var i=M.call(arguments,2);return s}function Rt(e){var t=arguments,n=1;t.length==1&&(n=0,t=nn(e));for(var r=t.length;n<r;n++)e[t[n]]=qt(e[t[n]],e);return e}function Ut(){var e=arguments;return function(){var t=arguments,n=e.length;while(n--)t=[e[n].apply(this,t)];return t[0]}}function zt(e,n,r){function a(){u=t,r||e.apply(o,i)}var i,s,o,u;return function(){var t=r&&!u;return i=arguments,o=this,j(u),u=F(a,n),t&&(s=e.apply(o,i)),s}}function Wt(e,n){var r=M.call(arguments,2);return F(function(){return e.apply(t,r)},n)}function Xt(e){var n=M.call(arguments,1);return F(function(){return e.apply(t,n)},1)}function Vt(e,t){var n={};return function(){var r=t?t.apply(this,arguments):arguments[0];return A.call(n,r)?n[r]:n[r]=e.apply(this,arguments)}}function $t(e){var t,n=!1;return function(){return n?t:(n=!0,t=e.apply(this,arguments),t)}}function Jt(e){var t=M.call(arguments,1),n=t.length;return function(){var r,i=arguments;return i.length&&(t.length=n,O.apply(t,i)),r=t.length==1?e.call(this,t[0]):e.apply(this,t),t.length=n,r}}function Kt(e,n){function a(){u=new Date,o=t,e.apply(s,r)}var r,i,s,o,u=0;return function(){var t=new Date,f=n-(t-u);return r=arguments,s=this,f<=0?(u=t,i=e.apply(s,r)):o||(o=F(a,f)),i}}function Qt(e,t){return function(){var n=[e];return arguments.length&&O.apply(n,arguments),t.apply(this,n)}}function Gt(e){return g[typeof e]&&e!==null?on(e)?e.slice():Zt({},e):e}function rn(e,t){return A.call(e,t)}function un(e){return e===!0||e===!1||_.call(e)==w}function an(e){return _.call(e)==E}function fn(e){return!!e&&e.nodeType==1}function cn(e,n,i){i||(i=[]);if(e===n)return e!==0||1/e==1/n;if(e==t||n==t)return e===n;e._chain&&(e=e._wrapped),n._chain&&(n=n._wrapped);if(e.isEqual&&_.call(e.isEqual)==S)return e.isEqual(n);if(n.isEqual&&_.call(n.isEqual)==S)return n.isEqual(e);var s=_.call(e);if(s!=_.call(n))return!1;switch(s){case N:return e==String(n);case x:return e!=+e?n!=+n:e==0?1/e==1/n:e==+n;case w:case E:return+e==+n;case T:return e.source==n.source&&e.global==n.global&&e.multiline==n.multiline&&e.ignoreCase==n.ignoreCase}if(typeof e!="object"||typeof n!="object")return!1;var o=i.length;while(o--)if(i[o]==e)return!0;var u=-1,a=!0,f=0;i.push(e);if(s==b){f=e.length,a=f==n.length;if(a)while(f--)if(!(a=cn(e[f],n[f],i)))break}else{if("constructor"in e!="constructor"in n||e.constructor!=n.constructor)return!1;for(var c in e)if(A.call(e,c)){f++;if(!(a=A.call(n,c)&&cn(e[c],n[c],i)))break}if(a){for(c in n)if(A.call(n,c)&&!(f--))break;a=!f}if(a&&r)while(++u<7){c=l[u];if(A.call(e,c)&&!(a=A.call(n,c)&&cn(e[c],n[c],i)))break}}return i.pop(),a}function hn(e){return H(e)&&_.call(e)==x}function pn(e){return _.call(e)==S}function dn(e){return g[typeof e]&&e!==null}function vn(e){return _.call(e)==x&&e!=+e}function mn(e){return e===null}function gn(e){return _.call(e)==x}function yn(e){return _.call(e)==T}function bn(e){return _.call(e)==N}function wn(e){return e===t}function Sn(e){var t,n=0,r=L.apply(C,arguments),i=r.length,s={};while(++n<i)t=r[n],t in e&&(s[t]=e[t]);return s}function xn(e){var t=_.call(e);return t==b||t==N?e.length:En(e).length}function Nn(e){return e==null?"":(e+"").replace(a,Y)}function Cn(e){return e}function kn(e){ft(nn(e),function(t){var n=I[t]=e[t];q.prototype[t]=function(){var e=[this._wrapped];arguments.length&&O.apply(e,arguments);var t=n.apply(I,e);return this._chain&&(t=new q(t),t._chain=!0),t}})}function Ln(){return e._=s,this}function An(e,t){if(!e)return null;var n=e[t];return _.call(n)==S?e[t]():n}function On(e,t,n){n||(n={});var r,i=I.templateSettings,s=n.escape,o=n.evaluate,a=n.interpolate,l=n.variable;return s==null&&(s=i.escape),o==null&&(o=i.evaluate),a==null&&(a=i.interpolate),s&&(e=e.replace(s,nt)),a&&(e=e.replace(a,rt)),o&&(e=e.replace(o,it)),e="__p='"+e.replace(f,G).replace(u,Q)+"';\n",p.length=0,l||(l=i.variable,e="with ("+l+" || {}) {\n"+e+"\n}\n"),e="function("+l+") {\n"+"var __p, __t, __j = Array.prototype.join;\n"+"function print() { __p += __j.call(arguments, '') }\n"+e+"return __p\n}",d&&(e+="\n//@ sourceURL=/lodash/template/source["+c++ +"]"),r=Function("_","return "+e)(I),t?r(t):(r.source=e,r)}function Mn(e,t,n){var r=-1;if(n)while(++r<e)t.call(n,r);else while(++r<e)t(r)}function _n(e){var t=i++;return e?e+t:t}function Dn(e){return e=new q(e),e._chain=!0,e}function Pn(e,t){return t(e),e}function Hn(){return this._chain=!0,this}function Bn(){return this._wrapped}var n=typeof exports=="object"&&exports&&(typeof global=="object"&&global&&global==global.global&&(e=global),exports),r=!{valueOf:0}.propertyIsEnumerable("valueOf"),i=0,s=e._,o=RegExp("^"+({}.valueOf+"").replace(/[.*+?^=!:${}()|[\]\/\\]/g,"\\$&").replace(/valueOf|for [^\]]+/g,".+?")+"$"),u=/__token__(\d+)/g,a=/[&<"']/g,f=/['\n\r\t\u2028\u2029\\]/g,l=["constructor","hasOwnProperty","isPrototypeOf","propertyIsEnumerable","toLocaleString","toString","valueOf"],c=0,h="__token__",p=[];try{var d=(Function("//@")(),!0)}catch(v){}var m={"&":"&amp;","<":"&lt;",'"':"&quot;","'":"&#x27;"},g={"boolean":!1,"function":!0,object:!0,number:!1,string:!1,"undefined":!1},y={"\\":"\\","'":"'","\n":"n","\r":"r","	":"t","\u2028":"u2028","\u2029":"u2029"},b="[object Array]",w="[object Boolean]",E="[object Date]",S="[object Function]",x="[object Number]",T="[object RegExp]",N="[object String]",C=Array.prototype,k=Object.prototype,L=C.concat,A=k.hasOwnProperty,O=C.push,M=C.slice,_=k.toString,D=o.test(D=M.bind)&&/\n|Opera/.test(D+_.call(e.opera))&&D,P=o.test(P=Array.isArray)&&P,H=e.isFinite,B=o.test(B=Object.keys)&&B,j=e.clearTimeout,F=e.setTimeout;I.templateSettings={escape:/<%-([\s\S]+?)%>/g,evaluate:/<%([\s\S]+?)%>/g,interpolate:/<%=([\s\S]+?)%>/g,variable:"obj"};var R=On("var index, result<% if (init) { %> = <%= init %><% } %>;\n<%= exit %>;\n<%= top %>;\n<% if (arrayBranch) { %>var length = <%= firstArg %>.length; index = -1;  <% if (objectBranch) { %>\nif (length === length >>> 0) {<% } %>\n  <%= arrayBranch.beforeLoop %>;\n  while (<%= arrayBranch.loopExp %>) {\n    <%= arrayBranch.inLoop %>;\n  }  <% if (objectBranch) { %>\n}\n<% }}if (objectBranch) {  if (arrayBranch) { %>else {\n<% }  if (!hasDontEnumBug) { %>  var skipProto = typeof <%= iteratedObject %> == 'function';\n<% } %>  <%= objectBranch.beforeLoop %>;\n  for (<%= objectBranch.loopExp %>) {  \n<%  if (hasDontEnumBug) {    if (useHas) { %>    if (<%= hasExp %>) {\n  <% } %>    <%= objectBranch.inLoop %>;<%    if (useHas) { %>\n    }<% }  }  else {  %>    if (!(skipProto && index == 'prototype')<% if (useHas) { %> && <%= hasExp %><% } %>) {\n      <%= objectBranch.inLoop %>;\n    }  <% } %>\n  }  <% if (hasDontEnumBug) { %>\n  var ctor = <%= iteratedObject %>.constructor;\n  <% for (var k = 0; k < 7; k++) { %>\n  index = '<%= shadowed[k] %>';\n  if (<%      if (shadowed[k] == 'constructor') {        %>!(ctor && ctor.prototype === <%= iteratedObject %>) && <%      } %><%= hasExp %>) {\n    <%= objectBranch.inLoop %>;\n  }<%     }   }   if (arrayBranch) { %>\n}<% }} %>\n<%= bottom %>;\nreturn result"),U={args:"collection, callback, thisArg",init:"collection",top:"if (!callback) {\n  callback = identity\n}\nelse if (thisArg) {\n  callback = iteratorBind(callback, thisArg)\n}",inLoop:"callback(collection[index], index, collection)"},z={init:"true",inLoop:"if (!callback(collection[index], index, collection)) return !result"},W={args:"object",init:"object",top:"for (var source, sourceIndex = 1, length = arguments.length; sourceIndex < length; sourceIndex++) {\n  source = arguments[sourceIndex];\n"+(r?"  if (source) {":""),loopExp:"index in source",useHas:!1,inLoop:"object[index] = source[index]",bottom:(r?"  }\n":"")+"}"},X={init:"[]",inLoop:"callback(collection[index], index, collection) && result.push(collection[index])"},V={top:"if (thisArg) callback = iteratorBind(callback, thisArg)"},$={inLoop:{object:U.inLoop}},J={init:"",exit:"if (!collection) return []",beforeLoop:{array:"result = Array(length)",object:"result = []"},inLoop:{array:"result[index] = callback(collection[index], index, collection)",object:"result.push(callback(collection[index], index, collection))"}},tt=K({args:"object",exit:"if (!objectTypes[typeof object] || object === null) throw TypeError()",init:"[]",inLoop:"result.push(index)"}),st=K({args:"collection, target",init:"false",inLoop:"if (collection[index] === target) return true"}),ot=K(U,z),ut=K(U,X),at=K(U,V,{init:"",inLoop:"if (callback(collection[index], index, collection)) return collection[index]"}),ft=K(U,V),lt=K(J,{args:"collection, methodName",top:"var args = slice.call(arguments, 2),\n    isFunc = typeof methodName == 'function'",inLoop:{array:"result[index] = (isFunc ? methodName : collection[index][methodName]).apply(collection[index], args)",object:"result.push((isFunc ? methodName : collection[index][methodName]).apply(collection[index], args))"}}),ct=K(U,J),ht=K(J,{args:"collection, property",inLoop:{array:"result[index] = collection[index][property]",object:"result.push(collection[index][property])"}}),pt=K({args:"collection, callback, accumulator, thisArg",init:"accumulator",top:"var noaccum = arguments.length < 3;\nif (thisArg) callback = iteratorBind(callback, thisArg)",beforeLoop:{array:"if (noaccum) result = collection[++index]"},inLoop:{array:"result = callback(result, collection[index], index, collection)",object:"result = noaccum\n  ? (noaccum = false, collection[index])\n  : callback(result, collection[index], index, collection)"}}),vt=K(U,X,{inLoop:"!"+X.inLoop}),mt=K(U,z,{init:"false",inLoop:z.inLoop.replace("!","")}),Yt=K(W,{inLoop:"if (object[index] == undefined)"+W.inLoop}),Zt=K(W),en=K(U,V,$,{useHas:!1}),tn=K(U,V,$),nn=K({args:"object",init:"[]",useHas:!1,inLoop:"if (toString.call(object[index]) == funcClass) result.push(index)",bottom:"result.sort()"}),sn=function(e){return _.call(e)=="[object Arguments]"};sn(arguments)||(sn=function(e){return!!e&&!!A.call(e,"callee")});var on=P||function(e){return _.call(e)==b},ln=K({args:"value",init:"true",top:"var className = toString.call(value);\nif (className == arrayClass || className == stringClass) return !value.length",inLoop:{object:"return false"}}),En=B?function(e){return typeof e=="function"?tt(e):B(e)}:tt,Tn=K({args:"object",init:"[]",inLoop:"result.push(object[index])"});I.VERSION="0.3.2",I.after=It,I.bind=qt,I.bindAll=Rt,I.chain=Dn,I.clone=Gt,I.compact=yt,I.compose=Ut,I.contains=st,I.debounce=zt,I.defaults=Yt,I.defer=Xt,I.delay=Wt,I.difference=bt,I.escape=Nn,I.every=ot,I.extend=Zt,I.filter=ut,I.find=at,I.first=wt,I.flatten=Et,I.forEach=ft,I.forIn=en,I.forOwn=tn,I.functions=nn,I.groupBy=St,I.has=rn,I.identity=Cn,I.indexOf=xt,I.initial=Tt,I.intersection=Nt,I.invoke=lt,I.isArguments=sn,I.isArray=on,I.isBoolean=un,I.isDate=an,I.isElement=fn,I.isEmpty=ln,I.isEqual=cn,I.isFinite=hn,I.isFunction=pn,I.isNaN=vn,I.isNull=mn,I.isNumber=gn,I.isObject=dn,I.isRegExp=yn,I.isString=bn,I.isUndefined=wn,I.keys=En,I.last=Ct,I.lastIndexOf=kt,I.map=ct,I.max=Lt,I.memoize=Vt,I.min=At,I.mixin=kn,I.noConflict=Ln,I.once=$t,I.partial=Jt,I.pick=Sn,I.pluck=ht,I.range=Ot,I.reduce=pt,I.reduceRight=dt,I.reject=vt,I.rest=Mt,I.result=An,I.shuffle=_t,I.size=xn,I.some=mt,I.sortBy=Dt,I.sortedIndex=Pt,I.tap=Pn,I.template=On,I.throttle=Kt,I.times=Mn,I.toArray=gt,I.union=Ht,I.uniq=Bt,I.uniqueId=_n,I.values=Tn,I.without=jt,I.wrap=Qt,I.zip=Ft,I.all=ot,I.any=mt,I.collect=ct,I.detect=at,I.each=ft,I.foldl=pt,I.foldr=dt,I.head=wt,I.include=st,I.inject=pt,I.methods=nn,I.select=ut,I.tail=Mt,I.take=wt,I.unique=Bt,I._iteratorTemplate=R,I._shimKeys=tt,q.prototype=I.prototype,kn(I),q.prototype.chain=Hn,q.prototype.value=Bn,ft(["pop","push","reverse","shift","sort","splice","unshift"],function(e){var t=C[e];q.prototype[e]=function(){var e=this._wrapped;return t.apply(e,arguments),e.length===0&&delete e[0],this._chain&&(e=new q(e),e._chain=!0),e}}),ft(["concat","join","slice"],function(e){var t=C[e];q.prototype[e]=function(){var e=this._wrapped,n=t.apply(e,arguments);return this._chain&&(n=new q(n),n._chain=!0),n}}),typeof define=="function"&&typeof define.amd=="object"&&define.amd?(e._=I,define("underscore",[],function(){return I})):n?typeof module=="object"&&module&&module.exports==n?(module.exports=I)._=I:n._=I:e._=I}(this),function(){var e=this,t=e.Backbone,n=Array.prototype.slice,r=Array.prototype.splice,i;typeof exports!="undefined"?i=exports:i=e.Backbone={},i.VERSION="0.9.2";var s=e._;!s&&typeof require!="undefined"&&(s=require("underscore"));var o=e.jQuery||e.Zepto||e.ender;i.setDomLibrary=function(e){o=e},i.noConflict=function(){return e.Backbone=t,this},i.emulateHTTP=!1,i.emulateJSON=!1;var u=/\s+/,a=i.Events={on:function(e,t,n){var r,i,s,o,a;if(!t)return this;e=e.split(u),r=this._callbacks||(this._callbacks={});while(i=e.shift())a=r[i],s=a?a.tail:{},s.next=o={},s.context=n,s.callback=t,r[i]={tail:o,next:a?a.next:s};return this},off:function(e,t,n){var r,i,o,a,f,l;if(!(i=this._callbacks))return;if(!(e||t||n))return delete this._callbacks,this;e=e?e.split(u):s.keys(i);while(r=e.shift()){o=i[r],delete i[r];if(!o||!t&&!n)continue;a=o.tail;while((o=o.next)!==a)f=o.callback,l=o.context,(t&&f!==t||n&&l!==n)&&this.on(r,f,l)}return this},trigger:function(e){var t,r,i,s,o,a,f;if(!(i=this._callbacks))return this;a=i.all,e=e.split(u),f=n.call(arguments,1);while(t=e.shift()){if(r=i[t]){s=r.tail;while((r=r.next)!==s)r.callback.apply(r.context||this,f)}if(r=a){s=r.tail,o=[t].concat(f);while((r=r.next)!==s)r.callback.apply(r.context||this,o)}}return this}};a.bind=a.on,a.unbind=a.off;var f=i.Model=function(e,t){var n;e||(e={}),t&&t.parse&&(e=this.parse(e));if(n=C(this,"defaults"))e=s.extend({},n,e);t&&t.collection&&(this.collection=t.collection),this.attributes={},this._escapedAttributes={},this.cid=s.uniqueId("c"),this.changed={},this._silent={},this._pending={},this.set(e,{silent:!0}),this.changed={},this._silent={},this._pending={},this._previousAttributes=s.clone(this.attributes),this.initialize.apply(this,arguments)};s.extend(f.prototype,a,{changed:null,_silent:null,_pending:null,idAttribute:"id",initialize:function(){},toJSON:function(e){return s.clone(this.attributes)},get:function(e){return this.attributes[e]},escape:function(e){var t;if(t=this._escapedAttributes[e])return t;var n=this.get(e);return this._escapedAttributes[e]=s.escape(n==null?"":""+n)},has:function(e){return this.get(e)!=null},set:function(e,t,n){var r,i,o;s.isObject(e)||e==null?(r=e,n=t):(r={},r[e]=t),n||(n={});if(!r)return this;r instanceof f&&(r=r.attributes);if(n.unset)for(i in r)r[i]=void 0;if(!this._validate(r,n))return!1;this.idAttribute in r&&(this.id=r[this.idAttribute]);var u=n.changes={},a=this.attributes,l=this._escapedAttributes,c=this._previousAttributes||{};for(i in r){o=r[i];if(!s.isEqual(a[i],o)||n.unset&&s.has(a,i))delete l[i],(n.silent?this._silent:u)[i]=!0;n.unset?delete a[i]:a[i]=o,!s.isEqual(c[i],o)||s.has(a,i)!=s.has(c,i)?(this.changed[i]=o,n.silent||(this._pending[i]=!0)):(delete this.changed[i],delete this._pending[i])}return n.silent||this.change(n),this},unset:function(e,t){return(t||(t={})).unset=!0,this.set(e,null,t)},clear:function(e){return(e||(e={})).unset=!0,this.set(s.clone(this.attributes),e)},fetch:function(e){e=e?s.clone(e):{};var t=this,n=e.success;return e.success=function(r,i,s){if(!t.set(t.parse(r,s),e))return!1;n&&n(t,r)},e.error=i.wrapError(e.error,t,e),(this.sync||i.sync).call(this,"read",this,e)},save:function(e,t,n){var r,o;s.isObject(e)||e==null?(r=e,n=t):(r={},r[e]=t),n=n?s.clone(n):{};if(n.wait){if(!this._validate(r,n))return!1;o=s.clone(this.attributes)}var u=s.extend({},n,{silent:!0});if(r&&!this.set(r,n.wait?u:n))return!1;var a=this,f=n.success;n.success=function(e,t,i){var o=a.parse(e,i);n.wait&&(delete n.wait,o=s.extend(r||{},o));if(!a.set(o,n))return!1;f?f(a,e):a.trigger("sync",a,e,n)},n.error=i.wrapError(n.error,a,n);var l=this.isNew()?"create":"update",c=(this.sync||i.sync).call(this,l,this,n);return n.wait&&this.set(o,u),c},destroy:function(e){e=e?s.clone(e):{};var t=this,n=e.success,r=function(){t.trigger("destroy",t,t.collection,e)};if(this.isNew())return r(),!1;e.success=function(i){e.wait&&r(),n?n(t,i):t.trigger("sync",t,i,e)},e.error=i.wrapError(e.error,t,e);var o=(this.sync||i.sync).call(this,"delete",this,e);return e.wait||r(),o},url:function(){var e=C(this,"urlRoot")||C(this.collection,"url")||k();return this.isNew()?e:e+(e.charAt(e.length-1)=="/"?"":"/")+encodeURIComponent(this.id)},parse:function(e,t){return e},clone:function(){return new this.constructor(this.attributes)},isNew:function(){return this.id==null},change:function(e){e||(e={});var t=this._changing;this._changing=!0;for(var n in this._silent)this._pending[n]=!0;var r=s.extend({},e.changes,this._silent);this._silent={};for(var n in r)this.trigger("change:"+n,this,this.get(n),e);if(t)return this;while(!s.isEmpty(this._pending)){this._pending={},this.trigger("change",this,e);for(var n in this.changed){if(this._pending[n]||this._silent[n])continue;delete this.changed[n]}this._previousAttributes=s.clone(this.attributes)}return this._changing=!1,this},hasChanged:function(e){return arguments.length?s.has(this.changed,e):!s.isEmpty(this.changed)},changedAttributes:function(e){if(!e)return this.hasChanged()?s.clone(this.changed):!1;var t,n=!1,r=this._previousAttributes;for(var i in e){if(s.isEqual(r[i],t=e[i]))continue;(n||(n={}))[i]=t}return n},previous:function(e){return!arguments.length||!this._previousAttributes?null:this._previousAttributes[e]},previousAttributes:function(){return s.clone(this._previousAttributes)},isValid:function(){return!this.validate(this.attributes)},_validate:function(e,t){if(t.silent||!this.validate)return!0;e=s.extend({},this.attributes,e);var n=this.validate(e,t);return n?(t&&t.error?t.error(this,n,t):this.trigger("error",this,n,t),!1):!0}});var l=i.Collection=function(e,t){t||(t={}),t.model&&(this.model=t.model),t.comparator&&(this.comparator=t.comparator),this._reset(),this.initialize.apply(this,arguments),e&&this.reset(e,{silent:!0,parse:t.parse})};s.extend(l.prototype,a,{model:f,initialize:function(){},toJSON:function(e){return this.map(function(t){return t.toJSON(e)})},add:function(e,t){var n,i,o,u,a,f,l={},c={},h=[];t||(t={}),e=s.isArray(e)?e.slice():[e];for(n=0,o=e.length;n<o;n++){if(!(u=e[n]=this._prepareModel(e[n],t)))throw new Error("Can't add an invalid model to a collection");a=u.cid,f=u.id;if(l[a]||this._byCid[a]||f!=null&&(c[f]||this._byId[f])){h.push(n);continue}l[a]=c[f]=u}n=h.length;while(n--)e.splice(h[n],1);for(n=0,o=e.length;n<o;n++)(u=e[n]).on("all",this._onModelEvent,this),this._byCid[u.cid]=u,u.id!=null&&(this._byId[u.id]=u);this.length+=o,i=t.at!=null?t.at:this.models.length,r.apply(this.models,[i,0].concat(e)),this.comparator&&this.sort({silent:!0});if(t.silent)return this;for(n=0,o=this.models.length;n<o;n++){if(!l[(u=this.models[n]).cid])continue;t.index=n,u.trigger("add",u,this,t)}return this},remove:function(e,t){var n,r,i,o;t||(t={}),e=s.isArray(e)?e.slice():[e];for(n=0,r=e.length;n<r;n++){o=this.getByCid(e[n])||this.get(e[n]);if(!o)continue;delete this._byId[o.id],delete this._byCid[o.cid],i=this.indexOf(o),this.models.splice(i,1),this.length--,t.silent||(t.index=i,o.trigger("remove",o,this,t)),this._removeReference(o)}return this},push:function(e,t){return e=this._prepareModel(e,t),this.add(e,t),e},pop:function(e){var t=this.at(this.length-1);return this.remove(t,e),t},unshift:function(e,t){return e=this._prepareModel(e,t),this.add(e,s.extend({at:0},t)),e},shift:function(e){var t=this.at(0);return this.remove(t,e),t},get:function(e){return e==null?void 0:this._byId[e.id!=null?e.id:e]},getByCid:function(e){return e&&this._byCid[e.cid||e]},at:function(e){return this.models[e]},where:function(e){return s.isEmpty(e)?[]:this.filter(function(t){for(var n in e)if(e[n]!==t.get(n))return!1;return!0})},sort:function(e){e||(e={});if(!this.comparator)throw new Error("Cannot sort a set without a comparator");var t=s.bind(this.comparator,this);return this.comparator.length==1?this.models=this.sortBy(t):this.models.sort(t),e.silent||this.trigger("reset",this,e),this},pluck:function(e){return s.map(this.models,function(t){return t.get(e)})},reset:function(e,t){e||(e=[]),t||(t={});for(var n=0,r=this.models.length;n<r;n++)this._removeReference(this.models[n]);return this._reset(),this.add(e,s.extend({silent:!0},t)),t.silent||this.trigger("reset",this,t),this},fetch:function(e){e=e?s.clone(e):{},e.parse===undefined&&(e.parse=!0);var t=this,n=e.success;return e.success=function(r,i,s){t[e.add?"add":"reset"](t.parse(r,s),e),n&&n(t,r)},e.error=i.wrapError(e.error,t,e),(this.sync||i.sync).call(this,"read",this,e)},create:function(e,t){var n=this;t=t?s.clone(t):{},e=this._prepareModel(e,t);if(!e)return!1;t.wait||n.add(e,t);var r=t.success;return t.success=function(i,s,o){t.wait&&n.add(i,t),r?r(i,s):i.trigger("sync",e,s,t)},e.save(null,t),e},parse:function(e,t){return e},chain:function(){return s(this.models).chain()},_reset:function(e){this.length=0,this.models=[],this._byId={},this._byCid={}},_prepareModel:function(e,t){t||(t={});if(e instanceof f)e.collection||(e.collection=this);else{var n=e;t.collection=this,e=new this.model(n,t),e._validate(e.attributes,t)||(e=!1)}return e},_removeReference:function(e){this==e.collection&&delete e.collection,e.off("all",this._onModelEvent,this)},_onModelEvent:function(e,t,n,r){if((e=="add"||e=="remove")&&n!=this)return;e=="destroy"&&this.remove(t,r),t&&e==="change:"+t.idAttribute&&(delete this._byId[t.previous(t.idAttribute)],this._byId[t.id]=t),this.trigger.apply(this,arguments)}});var c=["forEach","each","map","reduce","reduceRight","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","max","min","sortBy","sortedIndex","toArray","size","first","initial","rest","last","without","indexOf","shuffle","lastIndexOf","isEmpty","groupBy"];s.each(c,function(e){l.prototype[e]=function(){return s[e].apply(s,[this.models].concat(s.toArray(arguments)))}});var h=i.Router=function(e){e||(e={}),e.routes&&(this.routes=e.routes),this._bindRoutes(),this.initialize.apply(this,arguments)},p=/:\w+/g,d=/\*\w+/g,v=/[-[\]{}()+?.,\\^$|#\s]/g;s.extend(h.prototype,a,{initialize:function(){},route:function(e,t,n){return i.history||(i.history=new m),s.isRegExp(e)||(e=this._routeToRegExp(e)),n||(n=this[t]),i.history.route(e,s.bind(function(r){var s=this._extractParameters(e,r);n&&n.apply(this,s),this.trigger.apply(this,["route:"+t].concat(s)),i.history.trigger("route",this,t,s)},this)),this},navigate:function(e,t){i.history.navigate(e,t)},_bindRoutes:function(){if(!this.routes)return;var e=[];for(var t in this.routes)e.unshift([t,this.routes[t]]);for(var n=0,r=e.length;n<r;n++)this.route(e[n][0],e[n][1],this[e[n][1]])},_routeToRegExp:function(e){return e=e.replace(v,"\\$&").replace(p,"([^/]+)").replace(d,"(.*?)"),new RegExp("^"+e+"$")},_extractParameters:function(e,t){return e.exec(t).slice(1)}});var m=i.History=function(){this.handlers=[],s.bindAll(this,"checkUrl")},g=/^[#\/]/,y=/msie [\w.]+/;m.started=!1,s.extend(m.prototype,a,{interval:50,getHash:function(e){var t=e?e.location:window.location,n=t.href.match(/#(.*)$/);return n?n[1]:""},getFragment:function(e,t){if(e==null)if(this._hasPushState||t){e=window.location.pathname;var n=window.location.search;n&&(e+=n)}else e=this.getHash();return e.indexOf(this.options.root)||(e=e.substr(this.options.root.length)),e.replace(g,"")},start:function(e){if(m.started)throw new Error("Backbone.history has already been started");m.started=!0,this.options=s.extend({},{root:"/"},this.options,e),this._wantsHashChange=this.options.hashChange!==!1,this._wantsPushState=!!this.options.pushState,this._hasPushState=!!(this.options.pushState&&window.history&&window.history.pushState);var t=this.getFragment(),n=document.documentMode,r=y.exec(navigator.userAgent.toLowerCase())&&(!n||n<=7);r&&(this.iframe=o('<iframe src="javascript:0" tabindex="-1" />').hide().appendTo("body")[0].contentWindow,this.navigate(t)),this._hasPushState?o(window).bind("popstate",this.checkUrl):this._wantsHashChange&&"onhashchange"in window&&!r?o(window).bind("hashchange",this.checkUrl):this._wantsHashChange&&(this._checkUrlInterval=setInterval(this.checkUrl,this.interval)),this.fragment=t;var i=window.location,u=i.pathname==this.options.root;if(this._wantsHashChange&&this._wantsPushState&&!this._hasPushState&&!u)return this.fragment=this.getFragment(null,!0),window.location.replace(this.options.root+"#"+this.fragment),!0;this._wantsPushState&&this._hasPushState&&u&&i.hash&&(this.fragment=this.getHash().replace(g,""),window.history.replaceState({},document.title,i.protocol+"//"+i.host+this.options.root+this.fragment));if(!this.options.silent)return this.loadUrl()},stop:function(){o(window).unbind("popstate",this.checkUrl).unbind("hashchange",this.checkUrl),clearInterval(this._checkUrlInterval),m.started=!1},route:function(e,t){this.handlers.unshift({route:e,callback:t})},checkUrl:function(e){var t=this.getFragment();t==this.fragment&&this.iframe&&(t=this.getFragment(this.getHash(this.iframe)));if(t==this.fragment)return!1;this.iframe&&this.navigate(t),this.loadUrl()||this.loadUrl(this.getHash())},loadUrl:function(e){var t=this.fragment=this.getFragment(e),n=s.any(this.handlers,function(e){if(e.route.test(t))return e.callback(t),!0});return n},navigate:function(e,t){if(!m.started)return!1;if(!t||t===!0)t={trigger:t};var n=(e||"").replace(g,"");if(this.fragment==n)return;this._hasPushState?(n.indexOf(this.options.root)!=0&&(n=this.options.root+n),this.fragment=n,window.history[t.replace?"replaceState":"pushState"]({},document.title,n)):this._wantsHashChange?(this.fragment=n,this._updateHash(window.location,n,t.replace),this.iframe&&n!=this.getFragment(this.getHash(this.iframe))&&(t.replace||this.iframe.document.open().close(),this._updateHash(this.iframe.location,n,t.replace))):window.location.assign(this.options.root+e),t.trigger&&this.loadUrl(e)},_updateHash:function(e,t,n){n?e.replace(e.toString().replace(/(javascript:|#).*$/,"")+"#"+t):e.hash=t}});var b=i.View=function(e){this.cid=s.uniqueId("view"),this._configure(e||{}),this._ensureElement(),this.initialize.apply(this,arguments),this.delegateEvents()},w=/^(\S+)\s*(.*)$/,E=["model","collection","el","id","attributes","className","tagName"];s.extend(b.prototype,a,{tagName:"div",$:function(e){return this.$el.find(e)},initialize:function(){},render:function(){return this},remove:function(){return this.$el.remove(),this},make:function(e,t,n){var r=document.createElement(e);return t&&o(r).attr(t),n&&o(r).html(n),r},setElement:function(e,t){return this.$el&&this.undelegateEvents(),this.$el=e instanceof o?e:o(e),this.el=this.$el[0],t!==!1&&this.delegateEvents(),this},delegateEvents:function(e){if(!e&&!(e=C(this,"events")))return;this.undelegateEvents();for(var t in e){var n=e[t];s.isFunction(n)||(n=this[e[t]]);if(!n)throw new Error('Method "'+e[t]+'" does not exist');var r=t.match(w),i=r[1],o=r[2];n=s.bind(n,this),i+=".delegateEvents"+this.cid,o===""?this.$el.bind(i,n):this.$el.delegate(o,i,n)}},undelegateEvents:function(){this.$el.unbind(".delegateEvents"+this.cid)},_configure:function(e){this.options&&(e=s.extend({},this.options,e));for(var t=0,n=E.length;t<n;t++){var r=E[t];e[r]&&(this[r]=e[r])}this.options=e},_ensureElement:function(){if(!this.el){var e=C(this,"attributes")||{};this.id&&(e.id=this.id),this.className&&(e["class"]=this.className),this.setElement(this.make(this.tagName,e),!1)}else this.setElement(this.el,!1)}});var S=function(e,t){var n=N(this,e,t);return n.extend=this.extend,n};f.extend=l.extend=h.extend=b.extend=S;var x={create:"POST",update:"PUT","delete":"DELETE",read:"GET"};i.sync=function(e,t,n){var r=x[e];n||(n={});var u={type:r,dataType:"json"};return n.url||(u.url=C(t,"url")||k()),!n.data&&t&&(e=="create"||e=="update")&&(u.contentType="application/json",u.data=JSON.stringify(t.toJSON())),i.emulateJSON&&(u.contentType="application/x-www-form-urlencoded",u.data=u.data?{model:u.data}:{}),i.emulateHTTP&&(r==="PUT"||r==="DELETE")&&(i.emulateJSON&&(u.data._method=r),u.type="POST",u.beforeSend=function(e){e.setRequestHeader("X-HTTP-Method-Override",r)}),u.type!=="GET"&&!i.emulateJSON&&(u.processData=!1),o.ajax(s.extend(u,n))},i.wrapError=function(e,t,n){return function(r,i){i=r===t?i:r,e?e(t,i,n):t.trigger("error",t,i,n)}};var T=function(){},N=function(e,t,n){var r;return t&&t.hasOwnProperty("constructor")?r=t.constructor:r=function(){e.apply(this,arguments)},s.extend(r,e),T.prototype=e.prototype,r.prototype=new T,t&&s.extend(r.prototype,t),n&&s.extend(r,n),r.prototype.constructor=r,r.__super__=e.prototype,r},C=function(e,t){return!e||!e[t]?null:s.isFunction(e[t])?e[t]():e[t]},k=function(){throw new Error('A "url" property or function must be specified')}}.call(this),define("backbone",["underscore","jquery"],function(e){return function(){var t,n;return t||e.Backbone}}(this)),function(){var e,t,n,r,i=Array.prototype.slice,s=function(e,t){return function(){return e.apply(t,arguments)}};if(!Array.prototype.forEach)throw new Error("Deferred requires Array.forEach");r=this,n=function(t){return t instanceof Deferred||t instanceof e},t=function(e){var t;return e?(t=[],e.forEach(function(n){if(n)return typeof n=="function"?t.push(n):e.forEach(function(e){if(typeof e=="function")return t.push(e)})}),t):[]},e=function(){function e(e){this._deferred=e}return e.prototype._deferred=null,e.prototype.always=function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=this._deferred).always.apply(t,e),this},e.prototype.done=function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=this._deferred).done.apply(t,e),this},e.prototype.fail=function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=this._deferred).fail.apply(t,e),this},e.prototype.pipe=function(e,t){return this._deferred.pipe(e,t)},e.prototype.state=function(){return this._deferred.state()},e.prototype.then=function(e,t){return this._deferred.then(e,t),this},e}(),r.Deferred=function(){function o(e){this.then=s(this.then,this),this.resolveWith=s(this.resolveWith,this),this.resolve=s(this.resolve,this),this.rejectWith=s(this.rejectWith,this),this.reject=s(this.reject,this),this.promise=s(this.promise,this),this.progress=s(this.progress,this),this.pipe=s(this.pipe,this),this.notifyWith=s(this.notifyWith,this),this.notify=s(this.notify,this),this.fail=s(this.fail,this),this.done=s(this.done,this),this.always=s(this.always,this),this._state="pending",typeof e=="function"&&e.call(this,this)}return o.prototype.always=function(){var e,n,r,s=this;return e=1<=arguments.length?i.call(arguments,0):[],e.length===0?this:(n=t(e),this._state==="pending"?(this._alwaysCallbacks||(this._alwaysCallbacks=[]),(r=this._alwaysCallbacks).push.apply(r,n)):n.forEach(function(e){return e.apply(s._context,s._withArguments)}),this)},o.prototype.done=function(){var e,n,r,s=this;return e=1<=arguments.length?i.call(arguments,0):[],e.length===0?this:(n=t(e),this._state==="resolved"?n.forEach(function(e){return e.apply(s._context,s._withArguments)}):this._state==="pending"&&(this._doneCallbacks||(this._doneCallbacks=[]),(r=this._doneCallbacks).push.apply(r,n)),this)},o.prototype.fail=function(){var e,n,r,s=this;return e=1<=arguments.length?i.call(arguments,0):[],e.length===0?this:(n=t(e),this._state==="rejected"?n.forEach(function(e){return e.apply(s._context,s._withArguments)}):this._state==="pending"&&(this._failCallbacks||(this._failCallbacks=[]),(r=this._failCallbacks).push.apply(r,n)),this)},o.prototype.notify=function(){var e;return e=1<=arguments.length?i.call(arguments,0):[],this.notifyWith.apply(this,[r].concat(i.call(e))),this},o.prototype.notifyWith=function(){var e,t,n;return t=arguments[0],e=2<=arguments.length?i.call(arguments,1):[],this._state!=="pending"?this:((n=this._progressCallbacks)!=null&&n.forEach(function(n){return n.apply(t,e)}),this)},o.prototype.pipe=function(e,t){var r;return r=new o,this.done(function(){var t,s,o;return t=1<=arguments.length?i.call(arguments,0):[],e!=null?(s=e.apply(this,t),n(s)?s.done(function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=r.resolveWith).call.apply(t,[r,this].concat(i.call(e)))}).fail(function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=r.rejectWith).call.apply(t,[r,this].concat(i.call(e)))}):r.resolveWith.call(r,this,s)):(o=r.resolveWith).call.apply(o,[r,this].concat(i.call(t)))}),this.fail(function(){var e,s,o,u;return e=1<=arguments.length?i.call(arguments,0):[],t!=null?(s=t.apply(this,e),n(s)?s.done(function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=r.resolveWith).call.apply(t,[r,this].concat(i.call(e)))}).fail(function(){var e,t;return e=1<=arguments.length?i.call(arguments,0):[],(t=r.rejectWith).call.apply(t,[r,this].concat(i.call(e)))}):r.rejectWith.call(r,this,s),(o=r.rejectWith).call.apply(o,[r,this].concat(i.call(e)))):(u=r.rejectWith).call.apply(u,[r,this].concat(i.call(e)))}),r.promise()},o.prototype.progress=function(){var e,n,r;return e=1<=arguments.length?i.call(arguments,0):[],e.length===0||this._state!=="pending"?this:(n=t(e),this._progressCallbacks||(this._progressCallbacks=[]),(r=this._progressCallbacks).push.apply(r,n),this)},o.prototype.promise=function(){return this._promise||(this._promise=new e(this))},o.prototype.reject=function(){var e;return e=1<=arguments.length?i.call(arguments,0):[],this.rejectWith.apply(this,[r].concat(i.call(e))),this},o.prototype.rejectWith=function(){var e,t,n,r,s=this;return t=arguments[0],e=2<=arguments.length?i.call(arguments,1):[],this._state!=="pending"?this:(this._state="rejected",this._withArguments=e,this._context=t,(n=this._failCallbacks)!=null&&n.forEach(function(t){return t.apply(s._context,e)}),(r=this._alwaysCallbacks)!=null&&r.forEach(function(t){return t.apply(s._context,e)}),this)},o.prototype.resolve=function(){var e;return e=1<=arguments.length?i.call(arguments,0):[],this.resolveWith.apply(this,[r].concat(i.call(e))),this},o.prototype.resolveWith=function(){var e,t,n,r,s=this;return t=arguments[0],e=2<=arguments.length?i.call(arguments,1):[],this._state!=="pending"?this:(this._state="resolved",this._context=t,this._withArguments=e,(n=this._doneCallbacks)!=null&&n.forEach(function(t){return t.apply(s._context,e)}),(r=this._alwaysCallbacks)!=null&&r.forEach(function(t){return t.apply(s._context,e)}),this)},o.prototype.state=function(){return this._state},o.prototype.then=function(e,t,n){return this.done(e),this.fail(t),this.progress(n),this},o}(),r.Deferred.when=function(){var e,t,n,r;return n=1<=arguments.length?i.call(arguments,0):[],n.length===0?(new Deferred).resolve().promise():n.length===1?n[0].promise():(t=new Deferred,r=0,e=[],n.forEach(function(s,o){return s.done(function(){var s;s=1<=arguments.length?i.call(arguments,0):[],r+=1,e[o]=s;if(r===n.length)return t.resolve.apply(t,e)}).fail(function(){var e;return e=1<=arguments.length?i.call(arguments,0):[],t.rejectWith.apply(t,[this].concat(i.call(e)))})}),t.promise())},function(){var e,t;e=window.Zepto;if(!e||e.Deferred)return;e.Deferred=function(){return new Deferred}}()}.call(this),define("standalone_deferred",["jquery"],function(){}),Backbone.ChildViewContainer=function(e,t){var n=function(e){this._views={},this._indexByModel={},this._indexByCollection={},this._indexByCustom={},this._updateLength(),this._addInitialViews(e)};t.extend(n.prototype,{add:function(e,t){var n=e.cid;this._views[n]=e,e.model&&(this._indexByModel[e.model.cid]=n),e.collection&&(this._indexByCollection[e.collection.cid]=n),t&&(this._indexByCustom[t]=n),this._updateLength()},findByModel:function(e){var t=this._indexByModel[e.cid];return this.findByCid(t)},findByCollection:function(e){var t=this._indexByCollection[e.cid];return this.findByCid(t)},findByCustom:function(e){var t=this._indexByCustom[e];return this.findByCid(t)},findByIndex:function(e){return t.values(this._views)[e]},findByCid:function(e){return this._views[e]},remove:function(e){var t=e.cid;e.model&&delete this._indexByModel[e.model.cid],e.collection&&delete this._indexByCollection[e.collection.cid];var n;for(var r in this._indexByCustom)if(this._indexByCustom.hasOwnProperty(r)&&this._indexByCustom[r]===t){n=r;break}n&&delete this._indexByCustom[n],delete this._views[t],this._updateLength()},call:function(e,t){t=Array.prototype.slice.call(arguments,1),this.apply(e,t)},apply:function(e,n){var r;n=n||[],t.each(this._views,function(r,i){t.isFunction(r[e])&&r[e].apply(r,n)})},_updateLength:function(){this.length=t.size(this._views)},_addInitialViews:function(e){if(!e)return;var t,n,r=e.length;for(n=0;n<r;n++)t=e[n],this.add(t)}});var r=["forEach","each","map","find","detect","filter","select","reject","every","all","some","any","include","contains","invoke","toArray","first","initial","rest","last","without","isEmpty","pluck"];return t.each(r,function(e){n.prototype[e]=function(){var n=t.values(this._views),r=[n].concat(t.toArray(arguments));return t[e].apply(t,r)}}),n}(Backbone,_),Backbone.EventBinder=function(e,t){function r(e){if(t.isUndefined(e)||t.isNull(e))throw new Error("Can't bindTo undefined");return e.jquery?n.jquery:n["default"]}var n={"default":{bindTo:function(e,t,n,r){r=r||this,e.on(t,n,r);var i={type:"default",obj:e,eventName:t,callback:n,context:r};return i},unbindFrom:function(e){e.obj.off(e.eventName,e.callback,e.context)}},jquery:{bindTo:function(e,n,r,i){i=i||this,r=t(r).bind(i),e.on(n,r);var s={type:"jquery",obj:e,eventName:n,callback:r,context:i};return s},unbindFrom:function(e){e.obj.off(e.eventName,e.callback)}}},i=function(){this._eventBindings=[]};return i.extend=e.View.extend,t.extend(i.prototype,{bindTo:function(){var e=arguments[0],t=r(e),n=Array.prototype.slice.apply(arguments),i=t.bindTo.apply(this,n);return this._eventBindings.push(i),i},unbindFrom:function(e){var r=Array.prototype.slice.apply(arguments);n[e.type].unbindFrom.apply(this,r),this._eventBindings=t.reject(this._eventBindings,function(t){return t===e})},unbindAll:function(){var e=t.map(this._eventBindings,t.identity);t.each(e,this.unbindFrom,this)}}),i}(Backbone,_),Backbone.Wreqr=function(e,t,n){"option strict";var r={};return r.Handlers=function(e,t){var n=function(){this._handlers={}};return n.extend=e.Model.extend,t.extend(n.prototype,{addHandler:function(e,t,n){var r={callback:t,context:n};this._handlers[e]=r},getHandler:function(e){var t=this._handlers[e];if(!t)throw new Error("Handler not found for '"+e+"'");return function(){var e=Array.prototype.slice.apply(arguments);return t.callback.apply(t.context,e)}},removeHandler:function(e){delete this._handlers[e]},removeAllHandlers:function(){this._handlers={}}}),n}(e,n),r.Commands=function(e){return e.Handlers.extend({execute:function(){var e=arguments[0],t=Array.prototype.slice.call(arguments,1);this.getHandler(e).apply(this,t)}})}(r),r.RequestResponse=function(e){return e.Handlers.extend({request:function(){var e=arguments[0],t=Array.prototype.slice.call(arguments,1);return this.getHandler(e).apply(this,t)}})}(r),r.EventAggregator=function(e,t){var n=function(){};return n.extend=e.Model.extend,t.extend(n.prototype,e.Events),n}(e,n),r}(Backbone,Backbone.Marionette,_),Backbone.Marionette=Marionette=function(e,t,n){var r={},i=Array.prototype.slice;return r.extend=e.Model.extend,r.getOption=function(e,t){if(!e||!t)return;var n;return e.options&&e.options[t]?n=e.options[t]:n=e[t],n},r.createObject=function(){function t(){}var e;return typeof Object.create=="function"?e=Object.create:e=function(e){t.prototype=e;var n=new t;return t.prototype=null,n},e}(),r.triggerMethod=function(){var e=Array.prototype.slice.apply(arguments),n=e[0],r=n.split(":"),i,s,o="on";for(var u=0;u<r.length;u++)i=r[u],s=i.charAt(0).toUpperCase(),o+=s+i.slice(1);this.trigger.apply(this,e);if(t.isFunction(this[o]))return e.shift(),this[o].apply(this,e)},r.MonitorDOMRefresh=function(){function e(e){e._isShown=!0,r(e)}function n(e){e._isRendered=!0,r(e)}function r(e){e._isShown&&e._isRendered&&t.isFunction(e.triggerMethod)&&e.triggerMethod("dom:refresh")}return function(t){t.bindTo(t,"show",function(){e(t)}),t.bindTo(t,"render",function(){n(t)})}}(),r.EventBinder=e.EventBinder.extend(),r.addEventBinder=function(e){var n=new r.EventBinder;e.eventBinder=n,e.bindTo=function(t,r,i,s){s=s||e,n.bindTo(t,r,i,s)},e.unbindFrom=t.bind(n.unbindFrom,n),e.unbindAll=t.bind(n.unbindAll,n)},r.EventAggregator=e.Wreqr.EventAggregator.extend({constructor:function(){r.addEventBinder(this);var t=Array.prototype.slice.apply(arguments);e.Wreqr.EventAggregator.prototype.constructor.apply(this,t)}}),r.bindEntityEvents=function(){function e(e,n,r,i){var s=i.split(/\s+/);t.each(s,function(t){var i=e[t];if(!i)throw new Error("Method '"+t+"' was configured as an event handler, but does not exist.");e.bindTo(n,r,i,e)})}function n(e,t,n,r){e.bindTo(t,n,r,e)}return function(r,i,s){if(!i||!s)return;t.each(s,function(s,o){t.isFunction(s)?n(r,i,o,s):e(r,i,o,s)})}}(),r.Callbacks=function(){this._deferred=n.Deferred(),this._callbacks=[]},t.extend(r.Callbacks.prototype,{add:function(e,t){this._callbacks.push({cb:e,ctx:t}),this._deferred.done(function(n,r){t&&(n=t),e.call(n,r)})},run:function(e,t){this._deferred.resolve(t,e)},reset:function(){var e=this,r=this._callbacks;this._deferred=n.Deferred(),this._callbacks=[],t.each(r,function(t){e.add(t.cb,t.ctx)})}}),r.Controller=function(e){this.triggerMethod=r.triggerMethod,this.options=e||{},r.addEventBinder(this),t.isFunction(this.initialize)&&this.initialize(this.options)},r.Controller.extend=r.extend,t.extend(r.Controller.prototype,e.Events,{close:function(){this.unbindAll(),this.triggerMethod("close"),this.unbind()}}),r.Region=function(e){this.options=e||{},r.addEventBinder(this),this.el=r.getOption(this,"el");if(!this.el){var t=new Error("An 'el' must be specified for a region.");throw t.name="NoElError",t}if(this.initialize){var n=Array.prototype.slice.apply(arguments);this.initialize.apply(this,n)}},t.extend(r.Region,{buildRegion:function(e,t){var n=typeof e=="string",r=typeof e.selector=="string",i=typeof e.regionType=="undefined",s=typeof e=="function";if(!s&&!n&&!r)throw new Error("Region must be specified as a Region type, a selector string or an object with selector property");var o,u;n&&(o=e),e.selector&&(o=e.selector),s&&(u=e),!s&&i&&(u=t),e.regionType&&(u=e.regionType);var a=new u({el:o});return a}}),t.extend(r.Region.prototype,e.Events,{show:function(e){this.ensureEl(),this.close(),e.render(),this.open(e),r.triggerMethod.call(e,"show"),r.triggerMethod.call(this,"show",e),this.currentView=e},ensureEl:function(){if(!this.$el||this.$el.length===0)this.$el=this.getEl(this.el)},getEl:function(e){return n(e)},open:function(e){this.$el.empty().append(e.el)},close:function(){var e=this.currentView;if(!e||e.isClosed)return;e.close&&e.close(),r.triggerMethod.call(this,"close"),delete this.currentView},attachView:function(e){this.currentView=e},reset:function(){this.close(),delete this.$el}}),r.Region.extend=r.extend,r.TemplateCache=function(e){this.templateId=e},t.extend(r.TemplateCache,{templateCaches:{},get:function(e){var t=this,n=this.templateCaches[e];return n||(n=new r.TemplateCache(e),this.templateCaches[e]=n),n.load()},clear:function(){var e,t=Array.prototype.slice.apply(arguments),n=t.length;if(n>0)for(e=0;e<n;e++)delete this.templateCaches[t[e]];else this.templateCaches={}}}),t.extend(r.TemplateCache.prototype,{load:function(){var e=this;if(this.compiledTemplate)return this.compiledTemplate;var t=this.loadTemplate(this.templateId);return this.compiledTemplate=this.compileTemplate(t),this.compiledTemplate},loadTemplate:function(e){var t=n(e).html();if(!t||t.length===0){var r="Could not find template: '"+e+"'",i=new Error(r);throw i.name="NoTemplateError",i}return t},compileTemplate:function(e){return t.template(e)}}),r.Renderer={render:function(e,t){var n=typeof e=="function"?e:r.TemplateCache.get(e),i=n(t);return i}},r.View=e.View.extend({constructor:function(){t.bindAll(this,"render"),r.addEventBinder(this);var n=Array.prototype.slice.apply(arguments);e.View.prototype.constructor.apply(this,n),r.bindEntityEvents(this,this.model,r.getOption(this,"modelEvents")),r.bindEntityEvents(this,this.collection,r.getOption(this,"collectionEvents")),r.MonitorDOMRefresh(this),this.bindTo(this,"show",this.onShowCalled,this)},triggerMethod:r.triggerMethod,getTemplate:function(){return r.getOption(this,"template")},mixinTemplateHelpers:function(e){e=e||{};var n=this.templateHelpers;return t.isFunction(n)&&(n=n.call(this)),t.extend(e,n)},configureTriggers:function(){if(!this.triggers)return;var e=this,n={},r=t.result(this,"triggers");return t.each(r,function(t,r){n[r]=function(n){n&&n.preventDefault&&n.preventDefault(),n&&n.stopPropagation&&n.stopPropagation(),e.trigger(t)}}),n},delegateEvents:function(n){n=n||this.events,t.isFunction(n)&&(n=n.call(this));var r={},i=this.configureTriggers();t.extend(r,n,i),e.View.prototype.delegateEvents.call(this,r)},onShowCalled:function(){},close:function(){if(this.isClosed)return;var e=this.triggerMethod("before:close");if(e===!1)return;this.isClosed=!0,this.remove(),this.triggerMethod("close"),this.unbindAll()},bindUIElements:function(){if(!this.ui)return;var e=this;this.uiBindings||(this.uiBindings=this.ui),this.ui={},t.each(t.keys(this.uiBindings),function(t){var n=e.uiBindings[t];e.ui[t]=e.$(n)})}}),r.ItemView=r.View.extend({constructor:function(){var e=Array.prototype.slice.apply(arguments);r.View.prototype.constructor.apply(this,e),this.initialEvents&&this.initialEvents()},serializeData:function(){var e={};return this.model?e=this.model.toJSON():this.collection&&(e={items:this.collection.toJSON()}),e},render:function(){this.isClosed=!1,this.triggerMethod("before:render",this),this.triggerMethod("item:before:render",this);var e=this.serializeData();e=this.mixinTemplateHelpers(e);var t=this.getTemplate(),n=r.Renderer.render(t,e);return this.$el.html(n),this.bindUIElements(),this.triggerMethod("render",this),this.triggerMethod("item:rendered",this),this},close:function(){if(this.isClosed)return;this.triggerMethod("item:before:close");var e=Array.prototype.slice.apply(arguments);r.View.prototype.close.apply(this,e),this.triggerMethod("item:closed")}}),r.CollectionView=r.View.extend({itemViewEventPrefix:"itemview",constructor:function(e){this.initChildViewStorage(),this.onShowCallbacks=new r.Callbacks;var t=Array.prototype.slice.apply(arguments);r.View.prototype.constructor.apply(this,t),this.initialEvents()},initialEvents:function(){this.collection&&(this.bindTo(this.collection,"add",this.addChildView,this),this.bindTo(this.collection,"remove",this.removeItemView,this),this.bindTo(this.collection,"reset",this.render,this))},addChildView:function(e,t,n){this.closeEmptyView();var r=this.getItemView(e),i;return n&&n.index?i=n.index:i=0,this.addItemView(e,r,i)},onShowCalled:function(){this.onShowCallbacks.run()},triggerBeforeRender:function(){this.triggerMethod("before:render",this),this.triggerMethod("collection:before:render",this)},triggerRendered:function(){this.triggerMethod("render",this),this.triggerMethod("collection:rendered",this)},render:function(){return this.isClosed=!1,this.triggerBeforeRender(),this.closeEmptyView(),this.closeChildren(),this.collection&&this.collection.length>0?this.showCollection():this.showEmptyView(),this.triggerRendered(),this},showCollection:function(){var e=this,t;this.collection.each(function(n,r){t=e.getItemView(n),e.addItemView(n,t,r)})},showEmptyView:function(){var t=r.getOption(this,"emptyView");if(t&&!this._showingEmptyView){this._showingEmptyView=!0;var n=new e.Model;this.addItemView(n,t,0)}},closeEmptyView:function(){this._showingEmptyView&&(this.closeChildren(),delete this._showingEmptyView)},getItemView:function(e){var t=r.getOption(this,"itemView");if(!t){var n=new Error("An `itemView` must be specified");throw n.name="NoItemViewError",n}return t},addItemView:function(e,n,i){var s=this,o=r.getOption(this,"itemViewOptions");t.isFunction(o)&&(o=o.call(this,e));var u=this.buildItemView(e,n,o);this.addChildViewEventForwarding(u),this.triggerMethod("before:item:added",u),this.children.add(u);var a=this.renderItemView(u,i);return this.triggerMethod("after:item:added",u),u.onShow&&this.onShowCallbacks.add(u.onShow,u),a},addChildViewEventForwarding:function(e){var t=r.getOption(this,"itemViewEventPrefix"),n=this.bindTo(e,"all",function(){var n=i.call(arguments);n[0]=t+":"+n[0],n.splice(1,0,e),this.triggerMethod.apply(this,n)},this);this._childBindings=this._childBindings||{},this._childBindings[e.cid]=n},renderItemView:function(e,t){e.render(),this.appendHtml(this,e,t)},buildItemView:function(e,n,r){var i=t.extend({model:e},r),s=new n(i);return s},removeItemView:function(e){var t=this.children.findByModel(e);if(t){var n=this._childBindings[t.cid];n&&(this.unbindFrom(n),delete this._childBindings[t.cid]),t.close&&t.close(),this.children.remove(t)}(!this.collection||this.collection.length===0)&&this.showEmptyView(),this.triggerMethod("item:removed",t)},appendHtml:function(e,t,n){e.$el.append(t.el)},initChildViewStorage:function(){this.children=new e.ChildViewContainer},close:function(){if(this.isClosed)return;this.triggerMethod("collection:before:close"),this.closeChildren(),this.triggerMethod("collection:closed");var e=Array.prototype.slice.apply(arguments);r.View.prototype.close.apply(this,e)},closeChildren:function(){var e=this;this.children.apply("close"),this.initChildViewStorage()}}),r.CompositeView=r.CollectionView.extend({constructor:function(e){var t=Array.prototype.slice.apply(arguments);r.CollectionView.apply(this,t),this.itemView=this.getItemView()},initialEvents:function(){this.collection&&(this.bindTo(this.collection,"add",this.addChildView,this),this.bindTo(this.collection,"remove",this.removeItemView,this),this.bindTo(this.collection,"reset",this.renderCollection,this))},getItemView:function(e){var t=r.getOption(this,"itemView")||this.constructor;if(!t){var n=new Error("An `itemView` must be specified");throw n.name="NoItemViewError",n}return t},serializeData:function(){var e={};return this.model&&(e=this.model.toJSON()),e},render:function(){this.isClosed=!1,this.resetItemViewContainer();var e=this.renderModel();return this.$el.html(e),this.bindUIElements(),this.triggerMethod("composite:model:rendered"),this.renderCollection(),this.triggerMethod("composite:rendered"),this},renderCollection:function(){var e=Array.prototype.slice.apply(arguments);r.CollectionView.prototype.render.apply(this,e),this.triggerMethod("composite:collection:rendered")},renderModel:function(){var e={};e=this.serializeData(),e=this.mixinTemplateHelpers(e);var t=this.getTemplate();return r.Renderer.render(t,e)},appendHtml:function(e,t){var n=this.getItemViewContainer(e);n.append(t.el)},getItemViewContainer:function(e){if("$itemViewContainer"in e)return e.$itemViewContainer;var n;if(e.itemViewContainer){var r=t.result(e,"itemViewContainer");n=e.$(r);if(n.length<=0){var i=new Error("The specified `itemViewContainer` was not found: "+e.itemViewContainer);throw i.name="ItemViewContainerMissingError",i}}else n=e.$el;return e.$itemViewContainer=n,n},resetItemViewContainer:function(){this.$itemViewContainer&&delete this.$itemViewContainer}}),r.Layout=r.ItemView.extend({regionType:r.Region,constructor:function(){this._firstRender=!0,this.initializeRegions();var t=Array.prototype.slice.apply(arguments);e.Marionette.ItemView.apply(this,t)},render:function(){this._firstRender?this._firstRender=!1:(this.closeRegions(),this.reInitializeRegions());var e=Array.prototype.slice.apply(arguments),t=r.ItemView.prototype.render.apply(this,e);return t},close:function(){if(this.isClosed)return;this.closeRegions(),this.destroyRegions();var t=Array.prototype.slice.apply(arguments);e.Marionette.ItemView.prototype.close.apply(this,t)},initializeRegions:function(){this.regionManagers||(this.regionManagers={});var e=this,n=this.regions||{};t.each(n,function(t,n){var i=r.Region.buildRegion(t,e.regionType);i.getEl=function(t){return e.$(t)},e.regionManagers[n]=i,e[n]=i})},reInitializeRegions:function(){this.regionManagers&&t.size(this.regionManagers)===0?this.initializeRegions():t.each(this.regionManagers,function(e){e.reset()})},closeRegions:function(){var e=this;t.each(this.regionManagers,function(e,t){e.close()})},destroyRegions:function(){var e=this;t.each(this.regionManagers,function(t,n){delete e[n]}),this.regionManagers={}}}),r.AppRouter=e.Router.extend({constructor:function(t){var n=Array.prototype.slice.apply(arguments);e.Router.prototype.constructor.apply(this,n),this.options=t;if(this.appRoutes){var i=r.getOption(this,"controller");this.processAppRoutes(i,this.appRoutes)}},processAppRoutes:function(e,n){var r,i,s,o,u,a=[],f=this;for(s in n)n.hasOwnProperty(s)&&a.unshift([s,n[s]]);o=a.length;for(u=0;u<o;u++){s=a[u][0],i=a[u][1],r=e[i];if(!r){var l="Method '"+i+"' was not found on the controller",c=new Error(l);throw c.name="NoMethodError",c}r=t.bind(r,e),f.route(s,i,r)}}}),r.Application=function(n){this.initCallbacks=new r.Callbacks,this.vent=new r.EventAggregator,this.commands=new e.Wreqr.Commands,this.reqres=new e.Wreqr.RequestResponse,this.submodules={},t.extend(this,n),r.addEventBinder(this),this.triggerMethod=r.triggerMethod},t.extend(r.Application.prototype,e.Events,{execute:function(){var e=Array.prototype.slice.apply(arguments);this.commands.execute.apply(this.commands,e)},request:function(){var e=Array.prototype.slice.apply(arguments);return this.reqres.request.apply(this.reqres,e)},addInitializer:function(e){this.initCallbacks.add(e)},start:function(e){this.triggerMethod("initialize:before",e),this.initCallbacks.run(e,this),this.triggerMethod("initialize:after",e),this.triggerMethod("start",e)},addRegions:function(e){var n=this;t.each(e,function(e,t){var i=r.Region.buildRegion(e,r.Region);n[t]=i})},removeRegion:function(e){this[e].close(),delete this[e]},module:function(e,t){var n=i.call(arguments);return n.unshift(this),r.Module.create.apply(r.Module,n)}}),r.Application.extend=r.extend,r.Module=function(e,t){this.moduleName=e,this.submodules={},this._setupInitializersAndFinalizers(),this.config={},this.config.app=t,r.addEventBinder(this),this.triggerMethod=r.triggerMethod},t.extend(r.Module.prototype,e.Events,{addInitializer:function(e){this._initializerCallbacks.add(e)},addFinalizer:function(e){this._finalizerCallbacks.add(e)},start:function(e){if(this._isInitialized)return;t.each(this.submodules,function(t){var n=!0;t.config&&t.config.options&&(n=t.config.options.startWithParent),n&&t.start(e)}),this.triggerMethod("before:start",e),this._initializerCallbacks.run(e,this),this._isInitialized=!0,this.triggerMethod("start",e)},stop:function(){if(!this._isInitialized)return;this._isInitialized=!1,r.triggerMethod.call(this,"before:stop"),t.each(this.submodules,function(e){e.stop()}),this._finalizerCallbacks.run(),this._initializerCallbacks.reset(),this._finalizerCallbacks.reset(),r.triggerMethod.call(this,"stop")},addDefinition:function(e,t){this._runModuleDefinition(e,t)},_runModuleDefinition:function(i,s){if(!i)return;var o=t.flatten([this,this.config.app,e,r,n,t,s]);i.apply(this,o)},_setupInitializersAndFinalizers:function(){this._initializerCallbacks=new r.Callbacks,this._finalizerCallbacks=new r.Callbacks}}),t.extend(r.Module,{create:function(e,n,r){var s=this,o=e;n=n.split(".");var u=i.apply(arguments);u.splice(0,3);var a=n.length;return t.each(n,function(t,n){var i=n===a-1,f=n===0,l=s._getModuleDefinition(o,t,e);i&&(l.config.options=s._getModuleOptions(l,o,r),l.config.options.hasDefinition&&l.addDefinition(l.config.options.definition,u)),f&&i&&s._configureStartWithApp(e,l),o=l}),o},_configureStartWithApp:function(e,t){if(t.config.startWithAppIsConfigured)return;e.addInitializer(function(e){t.config.options.startWithParent&&t.start(e)}),t.config.startWithAppIsConfigured=!0},_getModuleDefinition:function(e,t,n){var i=e[t];return i||(i=new r.Module(t,n),e[t]=i,e.submodules[t]=i),i},_getModuleOptions:function(e,n,r){var i=!0;e.config.options&&!e.config.options.startWithParent&&(i=!1);var s={startWithParent:i,hasDefinition:!!r};return s.hasDefinition?(t.isFunction(r)?s.definition=r:(s.hasDefinition=!!r.define,s.definition=r.define,r.hasOwnProperty("startWithParent")&&(s.startWithParent=r.startWithParent)),s):s}}),r}(Backbone,_,$||window.jQuery||window.Zepto||window.ender),define("marionette",["backbone","standalone_deferred"],function(e){return function(){var t,n;return t||e.Backbone.Marionette}}(this));var Handlebars={};Handlebars.VERSION="1.0.beta.6",Handlebars.helpers={},Handlebars.partials={},Handlebars.registerHelper=function(e,t,n){n&&(t.not=n),this.helpers[e]=t},Handlebars.registerPartial=function(e,t){this.partials[e]=t},Handlebars.registerHelper("helperMissing",function(e){if(arguments.length===2)return undefined;throw new Error("Could not find property '"+e+"'")});var toString=Object.prototype.toString,functionType="[object Function]";Handlebars.registerHelper("blockHelperMissing",function(e,t){var n=t.inverse||function(){},r=t.fn,i="",s=toString.call(e);s===functionType&&(e=e.call(this));if(e===!0)return r(this);if(e===!1||e==null)return n(this);if(s==="[object Array]"){if(e.length>0)for(var o=0,u=e.length;o<u;o++)i+=r(e[o]);else i=n(this);return i}return r(e)}),Handlebars.registerHelper("each",function(e,t){var n=t.fn,r=t.inverse,i="";if(e&&e.length>0)for(var s=0,o=e.length;s<o;s++)i+=n(e[s]);else i=r(this);return i}),Handlebars.registerHelper("if",function(e,t){var n=toString.call(e);return n===functionType&&(e=e.call(this)),!e||Handlebars.Utils.isEmpty(e)?t.inverse(this):t.fn(this)}),Handlebars.registerHelper("unless",function(e,t){var n=t.fn,r=t.inverse;return t.fn=r,t.inverse=n,Handlebars.helpers["if"].call(this,e,t)}),Handlebars.registerHelper("with",function(e,t){return t.fn(e)}),Handlebars.registerHelper("log",function(e){Handlebars.log(e)});var handlebars=function(){var e={trace:function(){},yy:{},symbols_:{error:2,root:3,program:4,EOF:5,statements:6,simpleInverse:7,statement:8,openInverse:9,closeBlock:10,openBlock:11,mustache:12,partial:13,CONTENT:14,COMMENT:15,OPEN_BLOCK:16,inMustache:17,CLOSE:18,OPEN_INVERSE:19,OPEN_ENDBLOCK:20,path:21,OPEN:22,OPEN_UNESCAPED:23,OPEN_PARTIAL:24,params:25,hash:26,param:27,STRING:28,INTEGER:29,BOOLEAN:30,hashSegments:31,hashSegment:32,ID:33,EQUALS:34,pathSegments:35,SEP:36,$accept:0,$end:1},terminals_:{2:"error",5:"EOF",14:"CONTENT",15:"COMMENT",16:"OPEN_BLOCK",18:"CLOSE",19:"OPEN_INVERSE",20:"OPEN_ENDBLOCK",22:"OPEN",23:"OPEN_UNESCAPED",24:"OPEN_PARTIAL",28:"STRING",29:"INTEGER",30:"BOOLEAN",33:"ID",34:"EQUALS",36:"SEP"},productions_:[0,[3,2],[4,3],[4,1],[4,0],[6,1],[6,2],[8,3],[8,3],[8,1],[8,1],[8,1],[8,1],[11,3],[9,3],[10,3],[12,3],[12,3],[13,3],[13,4],[7,2],[17,3],[17,2],[17,2],[17,1],[25,2],[25,1],[27,1],[27,1],[27,1],[27,1],[26,1],[31,2],[31,1],[32,3],[32,3],[32,3],[32,3],[21,1],[35,3],[35,1]],performAction:function(t,n,r,i,s,o,u){var a=o.length-1;switch(s){case 1:return o[a-1];case 2:this.$=new i.ProgramNode(o[a-2],o[a]);break;case 3:this.$=new i.ProgramNode(o[a]);break;case 4:this.$=new i.ProgramNode([]);break;case 5:this.$=[o[a]];break;case 6:o[a-1].push(o[a]),this.$=o[a-1];break;case 7:this.$=new i.InverseNode(o[a-2],o[a-1],o[a]);break;case 8:this.$=new i.BlockNode(o[a-2],o[a-1],o[a]);break;case 9:this.$=o[a];break;case 10:this.$=o[a];break;case 11:this.$=new i.ContentNode(o[a]);break;case 12:this.$=new i.CommentNode(o[a]);break;case 13:this.$=new i.MustacheNode(o[a-1][0],o[a-1][1]);break;case 14:this.$=new i.MustacheNode(o[a-1][0],o[a-1][1]);break;case 15:this.$=o[a-1];break;case 16:this.$=new i.MustacheNode(o[a-1][0],o[a-1][1]);break;case 17:this.$=new i.MustacheNode(o[a-1][0],o[a-1][1],!0);break;case 18:this.$=new i.PartialNode(o[a-1]);break;case 19:this.$=new i.PartialNode(o[a-2],o[a-1]);break;case 20:break;case 21:this.$=[[o[a-2]].concat(o[a-1]),o[a]];break;case 22:this.$=[[o[a-1]].concat(o[a]),null];break;case 23:this.$=[[o[a-1]],o[a]];break;case 24:this.$=[[o[a]],null];break;case 25:o[a-1].push(o[a]),this.$=o[a-1];break;case 26:this.$=[o[a]];break;case 27:this.$=o[a];break;case 28:this.$=new i.StringNode(o[a]);break;case 29:this.$=new i.IntegerNode(o[a]);break;case 30:this.$=new i.BooleanNode(o[a]);break;case 31:this.$=new i.HashNode(o[a]);break;case 32:o[a-1].push(o[a]),this.$=o[a-1];break;case 33:this.$=[o[a]];break;case 34:this.$=[o[a-2],o[a]];break;case 35:this.$=[o[a-2],new i.StringNode(o[a])];break;case 36:this.$=[o[a-2],new i.IntegerNode(o[a])];break;case 37:this.$=[o[a-2],new i.BooleanNode(o[a])];break;case 38:this.$=new i.IdNode(o[a]);break;case 39:o[a-2].push(o[a]),this.$=o[a-2];break;case 40:this.$=[o[a]]}},table:[{3:1,4:2,5:[2,4],6:3,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],24:[1,15]},{1:[3]},{5:[1,16]},{5:[2,3],7:17,8:18,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,19],20:[2,3],22:[1,13],23:[1,14],24:[1,15]},{5:[2,5],14:[2,5],15:[2,5],16:[2,5],19:[2,5],20:[2,5],22:[2,5],23:[2,5],24:[2,5]},{4:20,6:3,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],24:[1,15]},{4:21,6:3,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,4],22:[1,13],23:[1,14],24:[1,15]},{5:[2,9],14:[2,9],15:[2,9],16:[2,9],19:[2,9],20:[2,9],22:[2,9],23:[2,9],24:[2,9]},{5:[2,10],14:[2,10],15:[2,10],16:[2,10],19:[2,10],20:[2,10],22:[2,10],23:[2,10],24:[2,10]},{5:[2,11],14:[2,11],15:[2,11],16:[2,11],19:[2,11],20:[2,11],22:[2,11],23:[2,11],24:[2,11]},{5:[2,12],14:[2,12],15:[2,12],16:[2,12],19:[2,12],20:[2,12],22:[2,12],23:[2,12],24:[2,12]},{17:22,21:23,33:[1,25],35:24},{17:26,21:23,33:[1,25],35:24},{17:27,21:23,33:[1,25],35:24},{17:28,21:23,33:[1,25],35:24},{21:29,33:[1,25],35:24},{1:[2,1]},{6:30,8:4,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],22:[1,13],23:[1,14],24:[1,15]},{5:[2,6],14:[2,6],15:[2,6],16:[2,6],19:[2,6],20:[2,6],22:[2,6],23:[2,6],24:[2,6]},{17:22,18:[1,31],21:23,33:[1,25],35:24},{10:32,20:[1,33]},{10:34,20:[1,33]},{18:[1,35]},{18:[2,24],21:40,25:36,26:37,27:38,28:[1,41],29:[1,42],30:[1,43],31:39,32:44,33:[1,45],35:24},{18:[2,38],28:[2,38],29:[2,38],30:[2,38],33:[2,38],36:[1,46]},{18:[2,40],28:[2,40],29:[2,40],30:[2,40],33:[2,40],36:[2,40]},{18:[1,47]},{18:[1,48]},{18:[1,49]},{18:[1,50],21:51,33:[1,25],35:24},{5:[2,2],8:18,9:5,11:6,12:7,13:8,14:[1,9],15:[1,10],16:[1,12],19:[1,11],20:[2,2],22:[1,13],23:[1,14],24:[1,15]},{14:[2,20],15:[2,20],16:[2,20],19:[2,20],22:[2,20],23:[2,20],24:[2,20]},{5:[2,7],14:[2,7],15:[2,7],16:[2,7],19:[2,7],20:[2,7],22:[2,7],23:[2,7],24:[2,7]},{21:52,33:[1,25],35:24},{5:[2,8],14:[2,8],15:[2,8],16:[2,8],19:[2,8],20:[2,8],22:[2,8],23:[2,8],24:[2,8]},{14:[2,14],15:[2,14],16:[2,14],19:[2,14],20:[2,14],22:[2,14],23:[2,14],24:[2,14]},{18:[2,22],21:40,26:53,27:54,28:[1,41],29:[1,42],30:[1,43],31:39,32:44,33:[1,45],35:24},{18:[2,23]},{18:[2,26],28:[2,26],29:[2,26],30:[2,26],33:[2,26]},{18:[2,31],32:55,33:[1,56]},{18:[2,27],28:[2,27],29:[2,27],30:[2,27],33:[2,27]},{18:[2,28],28:[2,28],29:[2,28],30:[2,28],33:[2,28]},{18:[2,29],28:[2,29],29:[2,29],30:[2,29],33:[2,29]},{18:[2,30],28:[2,30],29:[2,30],30:[2,30],33:[2,30]},{18:[2,33],33:[2,33]},{18:[2,40],28:[2,40],29:[2,40],30:[2,40],33:[2,40],34:[1,57],36:[2,40]},{33:[1,58]},{14:[2,13],15:[2,13],16:[2,13],19:[2,13],20:[2,13],22:[2,13],23:[2,13],24:[2,13]},{5:[2,16],14:[2,16],15:[2,16],16:[2,16],19:[2,16],20:[2,16],22:[2,16],23:[2,16],24:[2,16]},{5:[2,17],14:[2,17],15:[2,17],16:[2,17],19:[2,17],20:[2,17],22:[2,17],23:[2,17],24:[2,17]},{5:[2,18],14:[2,18],15:[2,18],16:[2,18],19:[2,18],20:[2,18],22:[2,18],23:[2,18],24:[2,18]},{18:[1,59]},{18:[1,60]},{18:[2,21]},{18:[2,25],28:[2,25],29:[2,25],30:[2,25],33:[2,25]},{18:[2,32],33:[2,32]},{34:[1,57]},{21:61,28:[1,62],29:[1,63],30:[1,64],33:[1,25],35:24},{18:[2,39],28:[2,39],29:[2,39],30:[2,39],33:[2,39],36:[2,39]},{5:[2,19],14:[2,19],15:[2,19],16:[2,19],19:[2,19],20:[2,19],22:[2,19],23:[2,19],24:[2,19]},{5:[2,15],14:[2,15],15:[2,15],16:[2,15],19:[2,15],20:[2,15],22:[2,15],23:[2,15],24:[2,15]},{18:[2,34],33:[2,34]},{18:[2,35],33:[2,35]},{18:[2,36],33:[2,36]},{18:[2,37],33:[2,37]}],defaultActions:{16:[2,1],37:[2,23],53:[2,21]},parseError:function(t,n){throw new Error(t)},parse:function(t){function d(e){r.length=r.length-2*e,i.length=i.length-e,s.length=s.length-e}function v(){var e;return e=n.lexer.lex()||1,typeof e!="number"&&(e=n.symbols_[e]||e),e}var n=this,r=[0],i=[null],s=[],o=this.table,u="",a=0,f=0,l=0,c=2,h=1;this.lexer.setInput(t),this.lexer.yy=this.yy,this.yy.lexer=this.lexer,typeof this.lexer.yylloc=="undefined"&&(this.lexer.yylloc={});var p=this.lexer.yylloc;s.push(p),typeof this.yy.parseError=="function"&&(this.parseError=this.yy.parseError);var m,g,y,b,w,E,S={},x,T,N,C;for(;;){y=r[r.length-1],this.defaultActions[y]?b=this.defaultActions[y]:(m==null&&(m=v()),b=o[y]&&o[y][m]);if(typeof b=="undefined"||!b.length||!b[0])if(!l){C=[];for(x in o[y])this.terminals_[x]&&x>2&&C.push("'"+this.terminals_[x]+"'");var k="";this.lexer.showPosition?k="Parse error on line "+(a+1)+":\n"+this.lexer.showPosition()+"\nExpecting "+C.join(", ")+", got '"+this.terminals_[m]+"'":k="Parse error on line "+(a+1)+": Unexpected "+(m==1?"end of input":"'"+(this.terminals_[m]||m)+"'"),this.parseError(k,{text:this.lexer.match,token:this.terminals_[m]||m,line:this.lexer.yylineno,loc:p,expected:C})}if(b[0]instanceof Array&&b.length>1)throw new Error("Parse Error: multiple actions possible at state: "+y+", token: "+m);switch(b[0]){case 1:r.push(m),i.push(this.lexer.yytext),s.push(this.lexer.yylloc),r.push(b[1]),m=null,g?(m=g,g=null):(f=this.lexer.yyleng,u=this.lexer.yytext,a=this.lexer.yylineno,p=this.lexer.yylloc,l>0&&l--);break;case 2:T=this.productions_[b[1]][1],S.$=i[i.length-T],S._$={first_line:s[s.length-(T||1)].first_line,last_line:s[s.length-1].last_line,first_column:s[s.length-(T||1)].first_column,last_column:s[s.length-1].last_column},E=this.performAction.call(S,u,f,a,this.yy,b[1],i,s);if(typeof E!="undefined")return E;T&&(r=r.slice(0,-1*T*2),i=i.slice(0,-1*T),s=s.slice(0,-1*T)),r.push(this.productions_[b[1]][0]),i.push(S.$),s.push(S._$),N=o[r[r.length-2]][r[r.length-1]],r.push(N);break;case 3:return!0}}return!0}},t=function(){var e={EOF:1,parseError:function(t,n){if(!this.yy.parseError)throw new Error(t);this.yy.parseError(t,n)},setInput:function(e){return this._input=e,this._more=this._less=this.done=!1,this.yylineno=this.yyleng=0,this.yytext=this.matched=this.match="",this.conditionStack=["INITIAL"],this.yylloc={first_line:1,first_column:0,last_line:1,last_column:0},this},input:function(){var e=this._input[0];this.yytext+=e,this.yyleng++,this.match+=e,this.matched+=e;var t=e.match(/\n/);return t&&this.yylineno++,this._input=this._input.slice(1),e},unput:function(e){return this._input=e+this._input,this},more:function(){return this._more=!0,this},pastInput:function(){var e=this.matched.substr(0,this.matched.length-this.match.length);return(e.length>20?"...":"")+e.substr(-20).replace(/\n/g,"")},upcomingInput:function(){var e=this.match;return e.length<20&&(e+=this._input.substr(0,20-e.length)),(e.substr(0,20)+(e.length>20?"...":"")).replace(/\n/g,"")},showPosition:function(){var e=this.pastInput(),t=(new Array(e.length+1)).join("-");return e+this.upcomingInput()+"\n"+t+"^"},next:function(){if(this.done)return this.EOF;this._input||(this.done=!0);var e,t,n,r;this._more||(this.yytext="",this.match="");var i=this._currentRules();for(var s=0;s<i.length;s++){t=this._input.match(this.rules[i[s]]);if(t){r=t[0].match(/\n.*/g),r&&(this.yylineno+=r.length),this.yylloc={first_line:this.yylloc.last_line,last_line:this.yylineno+1,first_column:this.yylloc.last_column,last_column:r?r[r.length-1].length-1:this.yylloc.last_column+t[0].length},this.yytext+=t[0],this.match+=t[0],this.matches=t,this.yyleng=this.yytext.length,this._more=!1,this._input=this._input.slice(t[0].length),this.matched+=t[0],e=this.performAction.call(this,this.yy,this,i[s],this.conditionStack[this.conditionStack.length-1]);if(e)return e;return}}if(this._input==="")return this.EOF;this.parseError("Lexical error on line "+(this.yylineno+1)+". Unrecognized text.\n"+this.showPosition(),{text:"",token:null,line:this.yylineno})},lex:function(){var t=this.next();return typeof t!="undefined"?t:this.lex()},begin:function(t){this.conditionStack.push(t)},popState:function(){return this.conditionStack.pop()},_currentRules:function(){return this.conditions[this.conditionStack[this.conditionStack.length-1]].rules},topState:function(){return this.conditionStack[this.conditionStack.length-2]},pushState:function(t){this.begin(t)}};return e.performAction=function(t,n,r,i){var s=i;switch(r){case 0:n.yytext.slice(-1)!=="\\"&&this.begin("mu"),n.yytext.slice(-1)==="\\"&&(n.yytext=n.yytext.substr(0,n.yyleng-1),this.begin("emu"));if(n.yytext)return 14;break;case 1:return 14;case 2:return this.popState(),14;case 3:return 24;case 4:return 16;case 5:return 20;case 6:return 19;case 7:return 19;case 8:return 23;case 9:return 23;case 10:return n.yytext=n.yytext.substr(3,n.yyleng-5),this.popState(),15;case 11:return 22;case 12:return 34;case 13:return 33;case 14:return 33;case 15:return 36;case 16:break;case 17:return this.popState(),18;case 18:return this.popState(),18;case 19:return n.yytext=n.yytext.substr(1,n.yyleng-2).replace(/\\"/g,'"'),28;case 20:return 30;case 21:return 30;case 22:return 29;case 23:return 33;case 24:return n.yytext=n.yytext.substr(1,n.yyleng-2),33;case 25:return"INVALID";case 26:return 5}},e.rules=[/^[^\x00]*?(?=(\{\{))/,/^[^\x00]+/,/^[^\x00]{2,}?(?=(\{\{))/,/^\{\{>/,/^\{\{#/,/^\{\{\//,/^\{\{\^/,/^\{\{\s*else\b/,/^\{\{\{/,/^\{\{&/,/^\{\{![\s\S]*?\}\}/,/^\{\{/,/^=/,/^\.(?=[} ])/,/^\.\./,/^[\/.]/,/^\s+/,/^\}\}\}/,/^\}\}/,/^"(\\["]|[^"])*"/,/^true(?=[}\s])/,/^false(?=[}\s])/,/^[0-9]+(?=[}\s])/,/^[a-zA-Z0-9_$-]+(?=[=}\s\/.])/,/^\[[^\]]*\]/,/^./,/^$/],e.conditions={mu:{rules:[3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,21,22,23,24,25,26],inclusive:!1},emu:{rules:[2],inclusive:!1},INITIAL:{rules:[0,1,26],inclusive:!0}},e}();return e.lexer=t,e}();typeof require!="undefined"&&typeof exports!="undefined"&&(exports.parser=handlebars,exports.parse=function(){return handlebars.parse.apply(handlebars,arguments)},exports.main=function(t){if(!t[1])throw new Error("Usage: "+t[0]+" FILE");if(typeof process!="undefined")var n=require("fs").readFileSync(require("path").join(process.cwd(),t[1]),"utf8");else var r=require("file").path(require("file").cwd()),n=r.join(t[1]).read({charset:"utf-8"});return exports.parser.parse(n)},typeof module!="undefined"&&require.main===module&&exports.main(typeof process!="undefined"?process.argv.slice(1):require("system").args)),Handlebars.Parser=handlebars,Handlebars.parse=function(e){return Handlebars.Parser.yy=Handlebars.AST,Handlebars.Parser.parse(e)},Handlebars.print=function(e){return(new Handlebars.PrintVisitor).accept(e)},Handlebars.logger={DEBUG:0,INFO:1,WARN:2,ERROR:3,level:3,log:function(e,t){}},Handlebars.log=function(e,t){Handlebars.logger.log(e,t)},function(){Handlebars.AST={},Handlebars.AST.ProgramNode=function(e,t){this.type="program",this.statements=e,t&&(this.inverse=new Handlebars.AST.ProgramNode(t))},Handlebars.AST.MustacheNode=function(e,t,n){this.type="mustache",this.id=e[0],this.params=e.slice(1),this.hash=t,this.escaped=!n},Handlebars.AST.PartialNode=function(e,t){this.type="partial",this.id=e,this.context=t};var e=function(e,t){if(e.original!==t.original)throw new Handlebars.Exception(e.original+" doesn't match "+t.original)};Handlebars.AST.BlockNode=function(t,n,r){e(t.id,r),this.type="block",this.mustache=t,this.program=n},Handlebars.AST.InverseNode=function(t,n,r){e(t.id,r),this.type="inverse",this.mustache=t,this.program=n},Handlebars.AST.ContentNode=function(e){this.type="content",this.string=e},Handlebars.AST.HashNode=function(e){this.type="hash",this.pairs=e},Handlebars.AST.IdNode=function(e){this.type="ID",this.original=e.join(".");var t=[],n=0;for(var r=0,i=e.length;r<i;r++){var s=e[r];s===".."?n++:s==="."||s==="this"?this.isScoped=!0:t.push(s)}this.parts=t,this.string=t.join("."),this.depth=n,this.isSimple=t.length===1&&n===0},Handlebars.AST.StringNode=function(e){this.type="STRING",this.string=e},Handlebars.AST.IntegerNode=function(e){this.type="INTEGER",this.integer=e},Handlebars.AST.BooleanNode=function(e){this.type="BOOLEAN",this.bool=e},Handlebars.AST.CommentNode=function(e){this.type="comment",this.comment=e}}(),Handlebars.Exception=function(e){var t=Error.prototype.constructor.apply(this,arguments);for(var n in t)t.hasOwnProperty(n)&&(this[n]=t[n]);this.message=t.message},Handlebars.Exception.prototype=new Error,Handlebars.SafeString=function(e){this.string=e},Handlebars.SafeString.prototype.toString=function(){return this.string.toString()},function(){var e={"<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#x27;","`":"&#x60;"},t=/&(?!\w+;)|[<>"'`]/g,n=/[&<>"'`]/,r=function(t){return e[t]||"&amp;"};Handlebars.Utils={escapeExpression:function(e){return e instanceof Handlebars.SafeString?e.toString():e==null||e===!1?"":n.test(e)?e.replace(t,r):e},isEmpty:function(e){return typeof e=="undefined"?!0:e===null?!0:e===!1?!0:Object.prototype.toString.call(e)==="[object Array]"&&e.length===0?!0:!1}}}(),Handlebars.Compiler=function(){},Handlebars.JavaScriptCompiler=function(){},function(e,t){e.OPCODE_MAP={appendContent:1,getContext:2,lookupWithHelpers:3,lookup:4,append:5,invokeMustache:6,appendEscaped:7,pushString:8,truthyOrFallback:9,functionOrFallback:10,invokeProgram:11,invokePartial:12,push:13,assignToHash:15,pushStringParam:16},e.MULTI_PARAM_OPCODES={appendContent:1,getContext:1,lookupWithHelpers:2,lookup:1,invokeMustache:3,pushString:1,truthyOrFallback:1,functionOrFallback:1,invokeProgram:3,invokePartial:1,push:1,assignToHash:1,pushStringParam:1},e.DISASSEMBLE_MAP={};for(var n in e.OPCODE_MAP){var r=e.OPCODE_MAP[n];e.DISASSEMBLE_MAP[r]=n}e.multiParamSize=function(t){return e.MULTI_PARAM_OPCODES[e.DISASSEMBLE_MAP[t]]},e.prototype={compiler:e,disassemble:function(){var t=this.opcodes,n,r,i=[],s,o,u;for(var a=0,f=t.length;a<f;a++){n=t[a];if(n==="DECLARE")o=t[++a],u=t[++a],i.push("DECLARE "+o+" = "+u);else{s=e.DISASSEMBLE_MAP[n];var l=e.multiParamSize(n),c=[];for(var h=0;h<l;h++)r=t[++a],typeof r=="string"&&(r='"'+r.replace("\n","\\n")+'"'),c.push(r);s=s+" "+c.join(" "),i.push(s)}}return i.join("\n")},guid:0,compile:function(e,t){this.children=[],this.depths={list:[]},this.options=t;var n=this.options.knownHelpers;this.options.knownHelpers={helperMissing:!0,blockHelperMissing:!0,each:!0,"if":!0,unless:!0,"with":!0,log:!0};if(n)for(var r in n)this.options.knownHelpers[r]=n[r];return this.program(e)},accept:function(e){return this[e.type](e)},program:function(e){var t=e.statements,n;this.opcodes=[];for(var r=0,i=t.length;r<i;r++)n=t[r],this[n.type](n);return this.isSimple=i===1,this.depths.list=this.depths.list.sort(function(e,t){return e-t}),this},compileProgram:function(e){var t=(new this.compiler).compile(e,this.options),n=this.guid++;this.usePartial=this.usePartial||t.usePartial,this.children[n]=t;for(var r=0,i=t.depths.list.length;r<i;r++){depth=t.depths.list[r];if(depth<2)continue;this.addDepth(depth-1)}return n},block:function(e){var t=e.mustache,n,r,i,s,o=this.setupStackForMustache(t),u=this.compileProgram(e.program);e.program.inverse&&(s=this.compileProgram(e.program.inverse),this.declare("inverse",s)),this.opcode("invokeProgram",u,o.length,!!t.hash),this.declare("inverse",null),this.opcode("append")},inverse:function(e){var t=this.setupStackForMustache(e.mustache),n=this.compileProgram(e.program);this.declare("inverse",n),this.opcode("invokeProgram",null,t.length,!!e.mustache.hash),this.declare("inverse",null),this.opcode("append")},hash:function(e){var t=e.pairs,n,r;this.opcode("push","{}");for(var i=0,s=t.length;i<s;i++)n=t[i],r=n[1],this.accept(r),this.opcode("assignToHash",n[0])},partial:function(e){var t=e.id;this.usePartial=!0,e.context?this.ID(e.context):this.opcode("push","depth0"),this.opcode("invokePartial",t.original),this.opcode("append")},content:function(e){this.opcode("appendContent",e.string)},mustache:function(e){var t=this.setupStackForMustache(e);this.opcode("invokeMustache",t.length,e.id.original,!!e.hash),e.escaped&&!this.options.noEscape?this.opcode("appendEscaped"):this.opcode("append")},ID:function(e){this.addDepth(e.depth),this.opcode("getContext",e.depth),this.opcode("lookupWithHelpers",e.parts[0]||null,e.isScoped||!1);for(var t=1,n=e.parts.length;t<n;t++)this.opcode("lookup",e.parts[t])},STRING:function(e){this.opcode("pushString",e.string)},INTEGER:function(e){this.opcode("push",e.integer)},BOOLEAN:function(e){this.opcode("push",e.bool)},comment:function(){},pushParams:function(e){var t=e.length,n;while(t--)n=e[t],this.options.stringParams?(n.depth&&this.addDepth(n.depth),this.opcode("getContext",n.depth||0),this.opcode("pushStringParam",n.string)):this[n.type](n)},opcode:function(t,n,r,i){this.opcodes.push(e.OPCODE_MAP[t]),n!==undefined&&this.opcodes.push(n),r!==undefined&&this.opcodes.push(r),i!==undefined&&this.opcodes.push(i)},declare:function(e,t){this.opcodes.push("DECLARE"),this.opcodes.push(e),this.opcodes.push(t)},addDepth:function(e){if(e===0)return;this.depths[e]||(this.depths[e]=!0,this.depths.list.push(e))},setupStackForMustache:function(e){var t=e.params;return this.pushParams(t),e.hash&&this.hash(e.hash),this.ID(e.id),t}},t.prototype={nameLookup:function(e,n,r){return/^[0-9]+$/.test(n)?e+"["+n+"]":t.isValidJavaScriptVariableName(n)?e+"."+n:e+"['"+n+"']"},appendToBuffer:function(e){return this.environment.isSimple?"return "+e+";":"buffer += "+e+";"},initializeBuffer:function(){return this.quotedString("")},namespace:"Handlebars",compile:function(e,t,n,r){this.environment=e,this.options=t||{},this.name=this.environment.name,this.isChild=!!n,this.context=n||{programs:[],aliases:{self:"this"},registers:{list:[]}},this.preamble(),this.stackSlot=0,this.stackVars=[],this.compileChildren(e,t);var i=e.opcodes,s;this.i=0;for(u=i.length;this.i<u;this.i++)s=this.nextOpcode(0),s[0]==="DECLARE"?(this.i=this.i+2,this[s[1]]=s[2]):(this.i=this.i+s[1].length,this[s[0]].apply(this,s[1]));return this.createFunctionContext(r)},nextOpcode:function(t){var n=this.environment.opcodes,r=n[this.i+t],i,s,o,u;if(r==="DECLARE")return i=n[this.i+1],s=n[this.i+2],["DECLARE",i,s];i=e.DISASSEMBLE_MAP[r],o=e.multiParamSize(r),u=[];for(var a=0;a<o;a++)u.push(n[this.i+a+1+t]);return[i,u]},eat:function(e){this.i=this.i+e.length},preamble:function(){var e=[];this.useRegister("foundHelper");if(!this.isChild){var t=this.namespace,n="helpers = helpers || "+t+".helpers;";this.environment.usePartial&&(n=n+" partials = partials || "+t+".partials;"),e.push(n)}else e.push("");this.environment.isSimple?e.push(""):e.push(", buffer = "+this.initializeBuffer()),this.lastContext=0,this.source=e},createFunctionContext:function(e){var t=this.stackVars;this.isChild||(t=t.concat(this.context.registers.list)),t.length>0&&(this.source[1]=this.source[1]+", "+t.join(", "));if(!this.isChild){var n=[];for(var r in this.context.aliases)this.source[1]=this.source[1]+", "+r+"="+this.context.aliases[r]}this.source[1]&&(this.source[1]="var "+this.source[1].substring(2)+";"),this.isChild||(this.source[1]+="\n"+this.context.programs.join("\n")+"\n"),this.environment.isSimple||this.source.push("return buffer;");var i=this.isChild?["depth0","data"]:["Handlebars","depth0","helpers","partials","data"];for(var s=0,o=this.environment.depths.list.length;s<o;s++)i.push("depth"+this.environment.depths.list[s]);if(e)return i.push(this.source.join("\n  ")),Function.apply(this,i);var u="function "+(this.name||"")+"("+i.join(",")+") {\n  "+this.source.join("\n  ")+"}";return Handlebars.log(Handlebars.logger.DEBUG,u+"\n\n"),u},appendContent:function(e){this.source.push(this.appendToBuffer(this.quotedString(e)))},append:function(){var e=this.popStack();this.source.push("if("+e+" || "+e+" === 0) { "+this.appendToBuffer(e)+" }"),this.environment.isSimple&&this.source.push("else { "+this.appendToBuffer("''")+" }")},appendEscaped:function(){var e=this.nextOpcode(1),t="";this.context.aliases.escapeExpression="this.escapeExpression",e[0]==="appendContent"&&(t=" + "+this.quotedString(e[1][0]),this.eat(e)),this.source.push(this.appendToBuffer("escapeExpression("+this.popStack()+")"+t))},getContext:function(e){this.lastContext!==e&&(this.lastContext=e)},lookupWithHelpers:function(e,t){if(e){var n=this.nextStack();this.usingKnownHelper=!1;var r;!t&&this.options.knownHelpers[e]?(r=n+" = "+this.nameLookup("helpers",e,"helper"),this.usingKnownHelper=!0):t||this.options.knownHelpersOnly?r=n+" = "+this.nameLookup("depth"+this.lastContext,e,"context"):(this.register("foundHelper",this.nameLookup("helpers",e,"helper")),r=n+" = foundHelper || "+this.nameLookup("depth"+this.lastContext,e,"context")),r+=";",this.source.push(r)}else this.pushStack("depth"+this.lastContext)},lookup:function(e){var t=this.topStack();this.source.push(t+" = ("+t+" === null || "+t+" === undefined || "+t+" === false ? "+t+" : "+this.nameLookup(t,e,"context")+");")},pushStringParam:function(e){this.pushStack("depth"+this.lastContext),this.pushString(e)},pushString:function(e){this.pushStack(this.quotedString(e))},push:function(e){this.pushStack(e)},invokeMustache:function(e,t,n){this.populateParams(e,this.quotedString(t),"{}",null,n,function(e,t,n){this.usingKnownHelper||(this.context.aliases.helperMissing="helpers.helperMissing",this.context.aliases.undef="void 0",this.source.push("else if("+n+"=== undef) { "+e+" = helperMissing.call("+t+"); }"),e!==n&&this.source.push("else { "+e+" = "+n+"; }"))})},invokeProgram:function(e,t,n){var r=this.programExpression(this.inverse),i=this.programExpression(e);this.populateParams(t,null,i,r,n,function(e,t,n){this.usingKnownHelper||(this.context.aliases.blockHelperMissing="helpers.blockHelperMissing",this.source.push("else { "+e+" = blockHelperMissing.call("+t+"); }"))})},populateParams:function(e,t,n,r,i,s){var o=i||this.options.stringParams||r||this.options.data,u=this.popStack(),a,f=[],l,c,h;o?(this.register("tmp1",n),h="tmp1"):h="{ hash: {} }";if(o){var p=i?this.popStack():"{}";this.source.push("tmp1.hash = "+p+";")}this.options.stringParams&&this.source.push("tmp1.contexts = [];");for(var d=0;d<e;d++)l=this.popStack(),f.push(l),this.options.stringParams&&this.source.push("tmp1.contexts.push("+this.popStack()+");");r&&(this.source.push("tmp1.fn = tmp1;"),this.source.push("tmp1.inverse = "+r+";")),this.options.data&&this.source.push("tmp1.data = data;"),f.push(h),this.populateCall(f,u,t||u,s,n!=="{}")},populateCall:function(e,t,n,r,i){var s=["depth0"].concat(e).join(", "),o=["depth0"].concat(n).concat(e).join(", "),u=this.nextStack();if(this.usingKnownHelper)this.source.push(u+" = "+t+".call("+s+");");else{this.context.aliases.functionType='"function"';var a=i?"foundHelper && ":"";this.source.push("if("+a+"typeof "+t+" === functionType) { "+u+" = "+t+".call("+s+"); }")}r.call(this,u,o,t),this.usingKnownHelper=!1},invokePartial:function(e){params=[this.nameLookup("partials",e,"partial"),"'"+e+"'",this.popStack(),"helpers","partials"],this.options.data&&params.push("data"),this.pushStack("self.invokePartial("+params.join(", ")+");")},assignToHash:function(e){var t=this.popStack(),n=this.topStack();this.source.push(n+"['"+e+"'] = "+t+";")},compiler:t,compileChildren:function(e,t){var n=e.children,r,i;for(var s=0,o=n.length;s<o;s++){r=n[s],i=new this.compiler,this.context.programs.push("");var u=this.context.programs.length;r.index=u,r.name="program"+u,this.context.programs[u]=i.compile(r,t,this.context)}},programExpression:function(e){if(e==null)return"self.noop";var t=this.environment.children[e],n=t.depths.list,r=[t.index,t.name,"data"];for(var i=0,s=n.length;i<s;i++)depth=n[i],depth===1?r.push("depth0"):r.push("depth"+(depth-1));return n.length===0?"self.program("+r.join(", ")+")":(r.shift(),"self.programWithDepth("+r.join(", ")+")")},register:function(e,t){this.useRegister(e),this.source.push(e+" = "+t+";")},useRegister:function(e){this.context.registers[e]||(this.context.registers[e]=!0,this.context.registers.list.push(e))},pushStack:function(e){return this.source.push(this.nextStack()+" = "+e+";"),"stack"+this.stackSlot},nextStack:function(){return this.stackSlot++,this.stackSlot>this.stackVars.length&&this.stackVars.push("stack"+this.stackSlot),"stack"+this.stackSlot},popStack:function(){return"stack"+this.stackSlot--},topStack:function(){return"stack"+this.stackSlot},quotedString:function(e){return'"'+e.replace(/\\/g,"\\\\").replace(/"/g,'\\"').replace(/\n/g,"\\n").replace(/\r/g,"\\r")+'"'}};var i="break else new var case finally return void catch for switch while continue function this with default if throw delete in try do instanceof typeof abstract enum int short boolean export interface static byte extends long super char final native synchronized class float package throws const goto private transient debugger implements protected volatile double import public let yield".split(" "),s=t.RESERVED_WORDS={};for(var o=0,u=i.length;o<u;o++)s[i[o]]=!0;t.isValidJavaScriptVariableName=function(e){return!t.RESERVED_WORDS[e]&&/^[a-zA-Z_$][0-9a-zA-Z_$]+$/.test(e)?!0:!1}}(Handlebars.Compiler,Handlebars.JavaScriptCompiler),Handlebars.precompile=function(e,t){t=t||{};var n=Handlebars.parse(e),r=(new Handlebars.Compiler).compile(n,t);return(new Handlebars.JavaScriptCompiler).compile(r,t)},Handlebars.compile=function(e,t){function r(){var n=Handlebars.parse(e),r=(new Handlebars.Compiler).compile(n,t),i=(new Handlebars.JavaScriptCompiler).compile(r,t,undefined,!0);return Handlebars.template(i)}t=t||{};var n;return function(e,t){return n||(n=r()),n.call(this,e,t)}},Handlebars.VM={template:function(e){var t={escapeExpression:Handlebars.Utils.escapeExpression,invokePartial:Handlebars.VM.invokePartial,programs:[],program:function(e,t,n){var r=this.programs[e];return n?Handlebars.VM.program(t,n):r?r:(r=this.programs[e]=Handlebars.VM.program(t),r)},programWithDepth:Handlebars.VM.programWithDepth,noop:Handlebars.VM.noop};return function(n,r){return r=r||{},e.call(t,Handlebars,n,r.helpers,r.partials,r.data)}},programWithDepth:function(e,t,n){var r=Array.prototype.slice.call(arguments,2);return function(n,i){return i=i||{},e.apply(this,[n,i.data||t].concat(r))}},program:function(e,t){return function(n,r){return r=r||{},e(n,r.data||t)}},noop:function(){return""},invokePartial:function(e,t,n,r,i,s){options={helpers:r,partials:i,data:s};if(e===undefined)throw new Handlebars.Exception("The partial "+t+" could not be found");if(e instanceof Function)return e(n,options);if(!Handlebars.compile)throw new Handlebars.Exception("The partial "+t+" could not be compiled when running in runtime-only mode");return i[t]=Handlebars.compile(e),i[t](n,options)}},Handlebars.template=Handlebars.VM.template,define("handlebars",function(e){return function(){var t,n;return t||e.Handlebars}}(this)),define("backstrapp/templateLoader",["jquery","underscore","handlebars"],function(e,t,n){return{fetchTemplate:function(t){var r=window.JST=window.JST||{},i;if(r[t])return n.template(r[t]);i="assets/templates/"+t+".html";var s;return e.ajax({url:i,type:"get",dataType:"text",cache:!1,global:!1,async:!1,success:function(e){r[t]=e,s=e}}),s}}}),define("backstrapp/backstrappMarionette",["underscore","backbone","marionette","handlebars","./templateLoader"],function(e,t,n,r,i){var s={},o=t.Marionette;return s.Marionette=o,s.Layout=o.Layout,s.Region=o.Region,o.Region.prototype.log=function(e,t,n,r){if(s.app.debug!==!0)return;n=n||{name:"defaultEffect"};var i="region --- "+r.toUpperCase()+" (with "+n.name+")";t&&t.template&&(i=t.cid+"::"+t.template+" --- "+r.toUpperCase()+" (with "+n.name+")"),t&&t.itemView&&(i=t.cid+"::"+t.itemView.prototype.template+"_Collection"+" --- "+t.collection.length+" ITEMS "+r.toUpperCase()+" (with "+n.name+")"),s.app.log("info",i,e)},o.View.prototype.log=function(e,t){if(s.app.debug!==!0)return;var n="";this.template&&(n=e.cid+"::"+this.template+" --- "+t.toUpperCase()),this.itemView&&(n=e.cid+"::"+this.itemView.prototype.template+"_Collection"+" --- "+this.collection.length+" ITEMS "+t.toUpperCase()),s.app.log("info",n,e)},s.Layout=o.Layout.extend({constructor:function(){var e=this;arguments.length>0&&arguments[0].parent&&(this.parent=arguments[0].parent,this.parent.on("item:before:close",function(){e.close()})),o.Layout.prototype.constructor.apply(this,arguments),this.log(this,"constructed"),this.bindTo(this,"show",function(){e.log(e,"showed")},this)},render:function(){var e=o.Layout.prototype.render.apply(this);return this.log(this,"rendered"),e},close:function(){o.Layout.prototype.close.apply(this),this.log(this,"closed")}}),s.ItemView=o.ItemView.extend({constructor:function(){var e=this;arguments.length>0&&arguments[0].parent&&(this.parent=arguments[0].parent,this.parent.on("item:before:close",function(){e.close()})),o.ItemView.prototype.constructor.apply(this,arguments),this.log(this,"constructed"),this.bindTo(this,"show",function(){e.log(e,"showed")},this)},render:function(){var e=o.ItemView.prototype.render.apply(this);return this.log(this,"rendered"),e},close:function(){o.ItemView.prototype.close.apply(this),this.log(this,"closed")}}),s.CollectionView=o.CollectionView.extend({constructor:function(){var e=this;arguments.length>0&&arguments[0].parent&&(this.parent=arguments[0].parent,this.parent.on("item:before:close",function(){e.close()})),o.CollectionView.prototype.constructor.apply(this,arguments),this.log(this,"constructed"),this.bindTo(this,"show",function(){e.log(e,"showed")},this)},render:function(){var e=o.CollectionView.prototype.render.apply(this);return this.log(this,"rendered"),e},close:function(){o.CollectionView.prototype.close.apply(this),this.log(this,"closed")}}),s.CompositeView=o.CompositeView,o.Application.prototype.origStart=o.Application.prototype.start,e.extend(o.Application.prototype,{asyncInitializers:[],addAsyncInitializer:function(e){this.asyncInitializers.push(e)},start:function(e,t){function r(){n--,!n&&t&&t()}typeof e=="function"&&(t=e,e={}),e=e||{};var n=this.asyncInitializers.length;for(var i=0,s=n;i<s;i++)this.asyncInitializers[i](e,r);this.origStart(e)}}),s.app=new o.Application,s.app.store=new t.Model,s.app.log=function(e,t,n){if(s.app.debug!==!0)return;window.console&&window.console.log&&console.log(e.toUpperCase()+":: "+t)},s.renderer=o.Renderer,t.Marionette.TemplateCache.prototype.loadTemplate=function(e){var t=this;return i.fetchTemplate(e)},t.Marionette.TemplateCache.prototype.compileTemplate=function(t){var n=e.isFunction(t)?t:r.compile(t);return n},s.renderer.renderTemplate=function(e,t){if(!e)return null;typeof e=="string"&&(e=o.TemplateCache.get(e));var n=e(t);return n},s}),define("backstrapp/baseCollection",["underscore","backbone"],function(e,t){var n=t.Collection.extend({fetchNew:function(n){n=n||{};var r=this,i=n.success;return n.success=function(t,s,o){e(r.parse(t,o)).each(function(e){r.get(e.id)||r.add(e,{silent:!0})}),n.silent||r.trigger("reset",r,n),i&&i(r,t)},(this.sync||t.sync).call(this,"read",this,n)},getOrCreate:function(e,t){t=t||!0;var n=this.get(e);return n||(n=new this.model({id:e}),t&&this.add(n)),n}});return n}),define("backstrapp/baseModel",["underscore","backbone"],function(e,t){var n=t.Model.extend({fetchNew:function(n){n=n||{};var r=this,i=n.success;return n.success=function(t,s,o){e(r.parse(t,o)).each(function(e){r.get(e.id)||r.add(e,{silent:!0})}),n.silent||r.trigger("reset",r,n),i&&i(r,t)},(this.sync||t.sync).call(this,"read",this,n)}});return n}),define("backstrapp/baseController",["underscore","backbone"],function(e,t){var n=t.Model.extend({navigate:function(n,r,i){e.isArray(r)||(i=r||{},r=[]),i=i||{};if(this[n])this[n].apply(this,r);else{i.trigger=!0;for(var s=0,o=r.length;s<o;s++)n=n+"/"+r[s]}t.history.navigate(n,i)}});return n}),define("backstrapp/baseRouter",["underscore","backbone","marionette"],function(e,t,n){var r=t.Marionette.AppRouter.extend({});return r}),define("backstrapp/effects/vendorPrefix",[],function(){var e,t=/^(Moz|Webkit|Khtml|O|ms|Icab)(?=[A-Z])/,n=document.getElementsByTagName("script")[0];if("WebkitOpacity"in n.style)e="Webkit";else if("KhtmlOpacity"in n.style)e="Khtml";else for(var r in n.style)if(t.test(r)){e=r.match(t)[0];break}return e.toLowerCase()||""}),define("backstrapp/effects/Effect",["./vendorPrefix"],function(e){var t=function(n){n&&_.extend(this,n),this.vendorPrefix=e,this.vendorPrefix=="moz"||this.vendorPrefix==""?this.transitionEndEvent="transitionend":this.vendorPrefix=="ms"?this.transitionEndEvent="MSTransitionEnd":this.transitionEndEvent=this.vendorPrefix+"TransitionEnd"},n=function(){};return t.extend=function(e,r){var i=function(){t.apply(this,arguments)};return _.extend(i,t),n.prototype=t.prototype,i.prototype=new n,e&&_.extend(i.prototype,e),r&&_.extend(i,r),i.prototype.constructor=i,i.__super__=t.prototype,i},t}),define("backstrapp/effects/SlideEffect",["./Effect"],function(e){var t=e.extend({name:"SlideEffect",direction:"left",fromViewTransitionProps:{duration:.4,easing:"ease-out",delay:0},toViewTransitionProps:{duration:.4,easing:"ease-out",delay:0},play:function(e,t,n,r){var i,s=this,o=t&&t.$el,u=e&&e.$el,a=0,f,l=s.vendorPrefix==""?"transform":["-"+s.vendorPrefix,"-","transform"].join(""),c=s.vendorPrefix==""?"transition":["-"+s.vendorPrefix,"-","transition"].join(""),h=function(e){if(a>=0){a--;var t=$(e.target);t.css(l,""),t.css(c,""),o&&o[0]==e.target&&(o.css("left",0),s.addedPositionCSS&&(o.css("position",""),o.css("width",""),o.removeClass("stackPositioned"),s.addedPositionCSS=!1)),a==0&&n&&(i&&clearTimeout(i),n.call(r))}};u&&(a++,u.one(s.transitionEndEvent,h),u.css("left",0),u.css(c,[l," ",s.fromViewTransitionProps.duration,"s ",s.fromViewTransitionProps.easing," ",s.fromViewTransitionProps.delay,"s"].join(""))),o&&(a++,o.one(s.transitionEndEvent,h),o.css("left",s.direction=="left"?r.$el.width():-r.$el.width()),o.css(c,[l," ",s.toViewTransitionProps.duration,"s ",s.toViewTransitionProps.easing," ",s.toViewTransitionProps.delay,"s"].join("")),t.pushCSS=t.pushCSS||{},t.allowAutoStackPositioning&&!t.pushCSS.position&&!t.pushCSS.width&&(s.addedPositionCSS=!0,o.css({position:"relative",width:"100%"}),o.addClass("stackPositioned")),o.css(t.pushCSS),r.$el.css("width"),o.css("visibility","visible"));if(u||o)r.$el.css("width"),f="translate3d("+(s.direction=="left"?-r.$el.width():r.$el.width())+"px, 0, 0)";var p=Math.max(s.fromViewTransitionProps.duration,s.toViewTransitionProps.duration)+Math.max(s.fromViewTransitionProps.delay,s.toViewTransitionProps.delay);i=setTimeout(function(){a>0&&(a=-1,s.log("warn","Warning "+s.transitionEndEvent+" didn't trigger in expected time!",s),o&&(o.off(s.transitionEndEvent,h),o.css(c,""),o.css(l,""),o.css("left",0),s.addedPositionCSS&&(o.css("position",""),o.css("width",""),o.removeClass("stackPositioned"),s.addedPositionCSS=!1)),u&&(u.off(s.transitionEndEvent,h),u.css(c,""),u.css(l,"")),n.call(r))},p*1.5*1e3);var d;u&&o?d=u.add(o):o?d=o:u&&(d=u),d&&d.css(l,f)}});return t}),define("backstrapp/stackNavigator",["backbone","./effects/SlideEffect"],function(e,t){function n(e,t){e.__backStackRendered__?(e.$el.css({visibility:"hidden"}),e.$el.css("display","none")):(e.stackNavigator=t,typeof e.destructionPolicy=="undefined"&&(e.destructionPolicy="auto"),t.css=t.css||{},t.css.visibility="hidden",e.$el.css(t.css),t.$el.append(e.el)),e.$el.css("display","block"),e.destructionPolicy!="never"&&t.$el.append(e.el),e.__backStackRendered__||(e.render.call(e),e.__backStackRendered__=!0)}function r(e,t,n){return _.extend({type:e,cancelable:_.isUndefined(n)?!1:n,preventDefault:function(){this.cancelable&&(this.isDefaultPrevented=function(){return!0})},isDefaultPrevented:function(){return!1},trigger:function(e){return e.trigger(this.type,this),this}},t)}function i(e,i,s,o){n(i.instance,this),o=o||this.defaultPushTransition||(this.defaultPushTransition=new t({direction:"left"})),o.play(e?e.instance:null,i.instance,function(){var t=s>0?this.viewsStack.splice(this.viewsStack.length-s,s):e?[e]:null;t!=null&&_.each(t,function(e){r("viewDeactivate",{target:e.instance}).trigger(e.instance),e.instance.destructionPolicy!="never"&&e.instance.$el.remove()},this),this.viewsStack.push(i),this.activeView=i.instance,r("viewActivate",{target:i.instance}).trigger(i.instance),r("viewChanged",{target:this}).trigger(this),c.call(this)},this)}function s(e,i,s,o){i&&(i.instance=i.instance?i.instance:new i.viewClass(i.options),n(i.instance,this)),o=o||this.defaultPopTransition||(this.defaultPopTransition=new t({direction:"right"})),o.play(e.instance,i?i.instance:null,function(){var e=this.viewsStack.splice(this.viewsStack.length-s,s);_.each(e,function(e){r("viewDeactivate",{target:e.instance}).trigger(e.instance),e.instance.destructionPolicy!="never"&&e.instance.$el.remove()},this),i?(this.activeView=i.instance,r("viewActivate",{target:i.instance}).trigger(i.instance)):this.activeView=null,r("viewChanged",{target:this}).trigger(this),c.call(this)},this)}function o(e,t,n){var s=_.last(this.viewsStack),o=_.isFunction(e)?new e(n):e,u={instance:o,viewClass:o.constructor,options:n},a=r("viewChanging",{action:"push",fromViewClass:s?s.viewClass:null,fromView:s?s.instance:null,toViewClass:u.viewClass,toView:u.instance},!0).trigger(this);if(a.isDefaultPrevented())return null;i.call(this,s,u,0,t)}function u(e){if(this.viewsStack.length==0)throw new Error("Popping from an empty stack!");var t=_.last(this.viewsStack),n=this.viewsStack.length>1?this.viewsStack[this.viewsStack.length-2]:null,i=r("viewChanging",{action:"pop",fromViewClass:t.viewClass,fromView:t.instance,toViewClass:n?n.viewClass:null,toView:n?n.instance:null},!0).trigger(this);if(i.isDefaultPrevented())return;s.call(this,t,n,1,e)}function a(e){if(this.viewsStack.length==0)throw new Error("Popping from an empty stack!");var t=_.last(this.viewsStack),n=r("viewChanging",{action:"popAll",fromViewClass:t.viewClass,fromView:t.instance,toViewClass:null,toView:null},!0).trigger(this);if(n.isDefaultPrevented())return;s.call(this,t,null,this.viewsStack.length,e)}function f(e,t,n){if(this.viewsStack.length==0)throw new Error("Replacing on an empty stack!");var s=_.last(this.viewsStack),o=_.isFunction(e)?new e(t):e,u={instance:o,viewClass:o.constructor,options:t},a=r("viewChanging",{action:"replace",fromViewClass:s.viewClass,fromView:s.instance,toViewClass:u.viewClass,toView:u.instance},!0).trigger(this);if(a.isDefaultPrevented())return null;i.call(this,s,u,1,n)}function l(e,t,n){if(this.viewsStack.length==0)throw new Error("Replacing on an empty stack!");var s=_.last(this.viewsStack),o=_.isFunction(e)?new e(t):e,u={instance:o,viewClass:o.constructor,options:t},a=r("viewChanging",{action:"replaceAll",fromViewClass:s.viewClass,fromView:s.instance,toViewClass:u.viewClass,toView:u.instance},!0).trigger(this);if(a.isDefaultPrevented())return null;i.call(this,s,u,this.viewsStack.length,n)}function c(){this.actionsQueue.splice(0,1);if(this.actionsQueue.length>0){var e=this.actionsQueue[0],t=Array.prototype.slice.call(e.args);switch(e.fn){case"pushView":o.apply(this,t);break;case"popView":u.apply(this,t);break;case"popAll":a.apply(this,t);break;case"replaceView":f.apply(this,t);break;case"replaceAll":l.apply(this,t)}}}var h=e.View.extend({viewsStack:null,activeView:null,defaultPushTransition:null,defaultPopTransition:null,actionsQueue:null,initialize:function(e){this.viewsStack=[],this.actionsQueue=[],e.popTransition&&(this.defaultPopTransition=e.popTransition),e.pushTransition&&(this.defaultPushTransition=e.pushTransition),this.css=e.css||{}},pushView:function(e,t,n){this.actionsQueue.push({fn:"pushView",args:arguments}),this.actionsQueue.length==1&&o.call(this,e,t,n)},popView:function(e){this.actionsQueue.push({fn:"popView",args:arguments}),this.actionsQueue.length==1&&u.call(this,e)},popAll:function(e){this.actionsQueue.push({fn:"popAll",args:arguments}),this.actionsQueue.length==1&&a.call(this,e)},replaceView:function(e,t,n){this.actionsQueue.push({fn:"replaceView",args:arguments}),this.actionsQueue.length==1&&f.call(this,e,t,n)},replaceAll:function(e,t,n){this.actionsQueue.push({fn:"replaceAll",args:arguments}),this.actionsQueue.length==1&&l.call(this,e,t,n)}});return h}),define("backstrapp/stackRegion",["underscore","backbone","marionette","./stackNavigator"],function(e,t,n,r){var i=t.Marionette.Region.extend({initialize:function(e){this.stackNavigator=new r({el:this.el,css:e.css||{}}),this.name=e.name,this.$el=$(this.el),this.$el.addClass("hidden"),this.isHidden=!0},push:function(e,t){this.isHidden&&this.show(),this.stackNavigator.pushView(e,t),this.log(this,e,t,"pushed to "+this.name)},pop:function(e,t){this.stackNavigator.popView(t),this.log(this,e,t,"poped from "+this.name)},show:function(e){if(!this.isHidden)return;e?e.play(null,this,function(){this.$el.show()},this):this.$el.show(),this.$el.removeClass("hidden"),this.isHidden=!1,this.log(this,null,e,"showed "+this.name)},hide:function(e){if(this.isHidden)return;e?e.play(this,null,function(){this.$el.hide()},this):this.$el.hide(),this.$el.addClass("hidden"),this.isHidden=!0,this.log(this,null,e,"hidden "+this.name)}});return i}),define("backstrapp/effects/FadeEffect",["./Effect"],function(e){var t=e.extend({name:"FadeEffect",fromViewTransitionProps:{duration:.4,easing:"linear",delay:.1},toViewTransitionProps:{duration:.4,easing:"linear",delay:.1},play:function(e,t,n,r){var i=this,s=t&&t.$el,o=e&&e.$el,u,a=0,f=i.vendorPrefix==""?"transition":["-"+i.vendorPrefix.toLowerCase(),"-","transition"].join(""),l=function(e){a>=0&&(a--,$(e.target).css(f,""),a==0&&n&&(u&&clearTimeout(u),o&&o.css("opacity",1),n.call(r)))};o&&(a++,o.one(i.transitionEndEvent,l),o.css("opacity",1),o.css("display")==="none"&&o.show(),o.css(f,["opacity ",i.fromViewTransitionProps.duration,"s ",i.fromViewTransitionProps.easing," ",i.fromViewTransitionProps.delay,"s"].join(""))),s&&(a++,s.one(i.transitionEndEvent,l),s.css("opacity",.01),s.css("display")==="none"&&s.show(),s.css(f,["opacity ",i.toViewTransitionProps.duration,"s ",i.toViewTransitionProps.easing," ",i.toViewTransitionProps.delay,"s"].join("")),s.css("visibility","visible")),r.$el.css("width");var c=Math.max(i.fromViewTransitionProps.duration,i.toViewTransitionProps.duration)+Math.max(i.fromViewTransitionProps.delay,i.toViewTransitionProps.delay);u=setTimeout(function(){a>0&&(a=-1,i.log("warn","Warning "+i.transitionEndEvent+" didn't trigger in expected time!",i),s&&(s.off(i.transitionEndEvent,l),s.css(f,""),s.css("opacity",1)),o&&(o.off(i.transitionEndEvent,l),o.css(f,""),o.css("opacity",0)),n.call(r))},c*1.5*1e3),s&&s.css("opacity",1),o&&o.css("opacity",.01)}});return t}),define("backstrapp/effects/NoEffect",["./Effect"],function(e){var t=e.extend({name:"NoEffect"});return t.prototype.play=function(e,t,n,r){var i=t&&t.$el,s=e&&e.$el;i!=s&&(i&&(i.css(i.pushCSS||{display:"block"}),i.css("visibility","visible")),s&&s.css("display","none")),n.call(r)},t}),define("backstrapp/effects/StackEffect",["./Effect"],function(e){var t=e.extend({name:"StackEffect",direction:"left",fromViewTransitionProps:{duration:.4,easing:"ease-out",delay:.4},toViewTransitionProps:{duration:.4,easing:"ease-out",delay:0},play:function(e,t,n,r){var i,s=this,o=t&&t.$el,u=e&&e.$el,a=0,f,l=s.vendorPrefix==""?"transform":["-"+s.vendorPrefix,"-","transform"].join(""),c=s.vendorPrefix==""?"transition":["-"+s.vendorPrefix,"-","transition"].join(""),h=function(e){if(a>=0){a--;var t=$(e.target);t.css(l,""),t.css(c,""),o&&o[0]==e.target&&o.css("left",0),a==0&&n&&(i&&clearTimeout(i),n.call(r))}};o&&s.direction==="left"?(a++,o.one(s.transitionEndEvent,h),o.css("left",s.direction=="left"?r.$el.width():-r.$el.width()),o.css(c,[l," ",s.toViewTransitionProps.duration,"s ",s.toViewTransitionProps.easing," ",s.toViewTransitionProps.delay,"s"].join("")),o.css("visibility","visible"),o.css("z-index","100")):o.css("visibility","visible"),u&&s.direction==="right"&&(a++,u.one(s.transitionEndEvent,h),u.css("left",0),u.css(c,[l," ",s.fromViewTransitionProps.duration,"s ",s.fromViewTransitionProps.easing," ",s.fromViewTransitionProps.delay,"s"].join("")));if(u||o)r.$el.css("width"),f="translate3d("+(s.direction=="left"?-r.$el.width():r.$el.width())+"px, 0, 0)";var p=Math.max(s.fromViewTransitionProps.duration,s.toViewTransitionProps.duration)+Math.max(s.fromViewTransitionProps.delay,s.toViewTransitionProps.delay);i=setTimeout(function(){a>0&&(a=-1,s.log("warn","Warning "+s.transitionEndEvent+" didn't trigger in expected time!",s),o&&(o.off(s.transitionEndEvent,h),o.css(c,""),o.css(l,""),o.css("left",0)),u&&(u.css("visibility","hidden"),u.off(s.transitionEndEvent,h),u.css(c,""),u.css(l,"")),n.call(r))},p*1.5*1e3),s.direction==="left"?o&&o.css(l,f):u&&u.css(l,f)}});return t}),define("backstrapp/stackEffects",["underscore","./effects/FadeEffect","./effects/NoEffect","./effects/SlideEffect","./effects/StackEffect"],function(e,t,n,r,i){var s={noEffect:new n,slide:new r,slideReverse:new r({direction:"right"}),fade:new t,stack:new i};return s.noEffect.reverse=new n,s.slide.reverse=new r({direction:"right"}),s.slideReverse.reverse=new r({direction:"left"}),s.fade.reverse=new t,s.stack.reverse=new i({direction:"right"}),s}),define("backstrapp/stackManager",["backbone","underscore","./stackEffects"],function(e,t,n){var r={init:function(e){var t=this;this.ns=e,this.app=e.app,this.app.stack=this,this.app.stack.effects=n,this.app.push=function(e){t.push(e)},this.app.pop=function(e){t.pop(e)}},stackRegions:[],viewStack:[],addStackRegion:function(e,t,n){n=n||{},n.el=t,n.name=e,this.app[e]=new this.ns.StackRegion(n),this.stackRegions.push(e)},push:function(n){var r=this,i=this.viewStack[this.viewStack.length-1]||{views:{}};n.effects=n.effects||{},n.fragment=e.history.fragment,t.each(n.views,function(e,t,i){e!=="keep"&&r.app[t]&&r.app[t].push&&r.app[t].push(e,n.effects[t]||e.pushEffect)});var s=t.difference(this.stackRegions,t.keys(n.views));t.each(s,function(e){var t=i.views[e]&&i.views[e].popEffect,s=n.effects[e]||t||null;r.app[e]&&r.app[e].hide&&r.app[e].hide(s&&s.reverse)}),this.viewStack.push(n)},pop:function(n){var r=this,i=this.viewStack[this.viewStack.length-1],s=this.viewStack[this.viewStack.length-2]||{views:{}};n=n||{},t.defaults(n,this.viewStack.pop()),n.effects=n.effects||{},e.history.navigate(s.fragment||"",{trigger:!1}),t.each(n.views,function(e,t,i){var s=n.effects[t]||e.popEffect||{};e!=="keep"&&r.app[t]&&r.app[t].pop&&r.app[t].pop(e,s&&s.reverse)});var o=t.difference(t.keys(i.views),t.keys(s.views));t.each(o,function(e){var t=n.effects[e]||i.views[e].popEffect||null;s.views[e]!=="keep"&&r.app[e]&&r.app[e].hide&&r.app[e].hide(t&&t.reverse)});var u=t.keys(s.views);t.each(u,function(e){var t=n.effects[e]||s.views[e].pushEffect||null;r.app[e]&&r.app[e].show&&r.app[e].show(t)})}};return r}),define("backstrapp/appSettings",["underscore","./effects/vendorPrefix"],function(e,t){var n={init:function(e){var n=e.app;n.vendorPrefix=t,n.vendorPrefixCSS=t?"-"+t+"-":"",n.isMobile=navigator.userAgent.match(/(iPad|iPhone|Android)/),n.isUIWebView=/(iPhone|iPod|iPad).*AppleWebKit(?!.*Safari)/i.test(navigator.userAgent)}};return n}),define("backstrapp/qs",["underscore","backbone"],function(e,t){function i(e){e.split("&").forEach(function(e){var t=e.split("="),n=t[1]?decodeURIComponent(t[1]):null;t.length>1&&r.setSerialized(t[0],n)})}var n=t.Model.extend({initialize:function(){this.params={}},deserialize:function(t,n){var r=this.params,i=r[t]&&r[t].deserialize||e.identity;return i(n)},serialize:function(t,n){var r=this.params,i=r[t]&&r[t].serialize||e.identity;return i(n)},setSerialized:function(e,t){o={},o[e]=this.deserialize(e,t),this.set(o)}}),r=new n;return originalGetFragment=t.History.prototype.getFragment,t.History.prototype.getFragment=function(){var e=originalGetFragment.apply(this,arguments),t=e.split("?"),n=t[1];return n&&i(n),t[0]},r}),define("backstrapp/backstrapp",["underscore","backbone","./backstrappMarionette","./baseCollection","./baseModel","./baseController","./baseRouter","./stackRegion","./stackManager","./appSettings","./qs","./effects/Effect"],function(e,t,n,r,i,s,o,u,a,f,l,c){t.sync=function(e,t,n){var r=h[e];if(r!=="GET")return n.success();origSync(e,t,n)};var h={create:"POST",update:"PUT","delete":"DELETE",read:"GET"},p=e.extend({},n);return a.init(p),f.init(p),p.Collection=r,p.Model=i,p.Controller=s,p.Router=o,p.StackRegion=u,p.qs=l,c.prototype.log=function(e,t,n){if(p.app.debug!==!0)return;p.app.log(e,t,n)},p}),!function(){var e,t=function(e){var t,n=document.querySelectorAll("a");for(;e&&e!==document;e=e.parentNode)for(t=n.length;t--;)if(n[t]===e)return e},n=function(){document.body.removeChild(r),e.style.display="none",e.removeEventListener("webkitTransitionEnd",n)},r=function(){var t=document.createElement("div");return t.classList.add("backdrop"),t.addEventListener("touchend",function(){e.addEventListener("webkitTransitionEnd",n),e.classList.remove("visible")}),t}(),i=function(n){var r=t(n.target);if(!r||!r.hash)return;e=document.querySelector(r.hash);if(!e||!e.classList.contains("popover"))return;return e};window.addEventListener("touchend",function(e){var t=i(e);if(!t)return;t.style.display="block",t.offsetHeight,t.classList.add("visible"),t.parentNode.appendChild(r)}),window.addEventListener("click",function(e){i(e)&&e.preventDefault()})}(),!function(){var e=function(e){var t,n=document.querySelectorAll(".segmented-controller li a");for(;e&&e!==document;e=e.parentNode)for(t=n.length;t--;)if(n[t]===e)return e};window.addEventListener("touchend",function(t){var n,r,i,s,o="active",u="."+o,a=e(t.target);if(!a)return;s=a.parentNode,n=s.parentNode.querySelector(u),n&&n.classList.remove(o),s.classList.add(o);if(!a.hash)return;i=document.querySelector(a.hash);if(!i)return;r=i.parentNode.querySelector(u),r&&r.classList.remove(o),i.classList.add(o)}),window.addEventListener("click",function(t){e(t.target)&&t.preventDefault()})}(),!function(){var e,t,n,r,i,s,o,u,a,f,l,c,h,p=function(e){var t,n=document.querySelectorAll(".slider ul");for(;e&&e!==document;e=e.parentNode)for(t=n.length;t--;)if(n[t]===e)return e},d=function(){var e=n.style.webkitTransform.match(/translate3d\(([^,]*)/);return parseInt(e?e[1]:0)},v=function(e){var t=e?r<0?"ceil":"floor":"round";l=Math[t](d()/(h/n.children.length)),l+=e,l=Math.min(l,0),l=Math.max(-(n.children.length-1),l)},m=function(r){n=p(r.target);if(!n)return;var i=n.querySelector("li");h=i.offsetWidth*n.children.length,c=undefined,f=n.offsetWidth,a=1,o=-(n.children.length-1),u=+(new Date),e=r.touches[0].pageX,t=r.touches[0].pageY,v(0),n.style["-webkit-transition-duration"]=0},g=function(u){if(u.touches.length>1||!n)return;r=u.touches[0].pageX-e,i=u.touches[0].pageY-t,e=u.touches[0].pageX,t=u.touches[0].pageY,typeof c=="undefined"&&(c=Math.abs(i)>Math.abs(r));if(c)return;s=r/a+d(),u.preventDefault(),a=l==0&&r>0?e/f+1.25:l==o&&r<0?Math.abs(e)/f+1.25:1,n.style.webkitTransform="translate3d("+s+"px,0,0)"},y=function(e){if(!n||c)return;v(+(new Date)-u<1e3&&Math.abs(r)>15?r<0?-1:1:0),s=l*f,n.style["-webkit-transition-duration"]=".2s",n.style.webkitTransform="translate3d("+s+"px,0,0)",e=new CustomEvent("slide",{detail:{slideNumber:Math.abs(l)},bubbles:!0,cancelable:!0}),n.parentNode.dispatchEvent(e)};window.addEventListener("touchstart",m),window.addEventListener("touchmove",g),window.addEventListener("touchend",y)}(),!function(){var e={},t=!1,n=!1,r=!1,i=function(e){var t,n=document.querySelectorAll(".toggle");for(;e&&e!==document;e=e.parentNode)for(t=n.length;t--;)if(n[t]===e)return e};window.addEventListener("touchstart",function(n){n=n.originalEvent||n,r=i(n.target);if(!r)return;var s=r.querySelector(".toggle-handle"),o=r.offsetWidth,u=s.offsetWidth,a=r.classList.contains("active")?o-u:0;e={pageX:n.touches[0].pageX-a,pageY:n.touches[0].pageY},t=!1,r.style["-webkit-transition-duration"]=0}),window.addEventListener("touchmove",function(i){i=i.originalEvent||i;if(i.touches.length>1)return;if(!r)return;var s=r.querySelector(".toggle-handle"),o=i.touches[0],u=r.offsetWidth,a=s.offsetWidth,f=u-a;t=!0,n=o.pageX-e.pageX;if(Math.abs(n)<Math.abs(o.pageY-e.pageY))return;i.preventDefault();if(n<0)return s.style.webkitTransform="translate3d(0,0,0)";if(n>f)return s.style.webkitTransform="translate3d("+f+"px,0,0)";s.style.webkitTransform="translate3d("+n+"px,0,0)",r.classList[n>u/2-a/2?"add":"remove"]("active")}),window.addEventListener("touchend",function(e){if(!r)return;var i=r.querySelector(".toggle-handle"),s=r.offsetWidth,o=i.offsetWidth,u=s-o,a=!t&&!r.classList.contains("active")||t&&n>s/2-o/2;a?i.style.webkitTransform="translate3d("+u+"px,0,0)":i.style.webkitTransform="translate3d(0,0,0)",r.classList[a?"add":"remove"]("active"),e=new CustomEvent("toggle",{detail:{isActive:a},bubbles:!0,cancelable:!0}),r.dispatchEvent(e),t=!1,r=!1})}(),define("ratchet",["jquery"],function(){}),define("preconditions",["ratchet"],function(){return{}}),define("namespace",["jquery","underscore","backstrapp/backstrapp","backbone","handlebars","preconditions"],function(e,t,n,r,i){var s=t.extend({modules:{},module:function(e){var n=t.extend({Views:{},Models:{},Collections:{}},e);return n.name&&n.append===!0&&(this.modules[n.name]=n),n}},n);return s}),define("modules/bars/title",["namespace"],function(e){var t=e.app,n=e.module();return n.Views.Title=e.ItemView.extend({tagName:"div",template:"bars/title",allowAutoStackPositioning:!0,initialize:function(t){t=t||{},this.model=this.model||new e.Model({title:t.title,back:t.back||"back",next:t.next||"next"})},events:{"click .back":"ui_back"},ui_back:function(e){e.preventDefault(),t.pop(this.options.backEffects)},onRender:function(){this.options.back===!1&&this.$(".back").hide(),this.options.next===!1&&this.$(".next").hide(),this.$(".back").addClass(this.options.backClass||"button-prev"),this.$(".next").addClass(this.options.nextClass||"button-next")}}),n}),define("modules/bars/segment",["namespace"],function(e){var t=e.app,n=e.module();n.Views.Segment=e.ItemView.extend({tagName:"div",template:"bars/segment",allowAutoStackPositioning:!0,pushCSS:function(){var e={};return e.display=t.vendorPrefixCSS+"box",e[t.vendorPrefixCSS+"box-orient"]="horizontal",e["box-sizing"]="border-box",e[t.vendorPrefixCSS+"box-flex"]="1",e}(),initialize:function(t){t=t||{},this.model=this.model||new e.Model({segments:t.segments,back:t.back||"back",next:t.next||"next"});if(t.inHeader){this.options.back=!1,this.options.next=!1;var n={};n["box-sizing"]="border-box",this.pushCSS=n}},events:{"click .back":"ui_back"},ui_back:function(e){e.preventDefault(),t.pop(this.options.backEffects)},onRender:function(){this.options.back===!1&&this.$(".back").hide(),this.options.next===!1&&this.$(".next").hide(),this.$(".back").addClass(this.options.backClass||"button"),this.$(".next").addClass(this.options.nextClass||"button");var e=new i(this.options.segments);e.render(),this.$(".segmented-controller").html(e.$el.html())}});var r=e.ItemView.extend({tagName:"li",template:"bars/segmentItem",initialize:function(e){},events:{"click .target":"ui_target"},ui_target:function(e){e.preventDefault(),Backbone.history.navigate(this.model.get("target"),{trigger:!0})},onRender:function(){this.model.get("active")&&this.$el.addClass("active")}}),i=e.CollectionView.extend({tagName:"ul",className:"segmented-controller",itemView:r,initialize:function(t){t=t||{},this.collection=this.collection||new e.Collection(t)}});return n}),define("modules/bars/tab",["backbone","namespace"],function(e,t){var n=t.app,r=t.module();return r.Views.TabItem=t.ItemView.extend({tagName:"li",template:"bars/tabItem",className:"tab-item",allowAutoStackPositioning:!0,initialize:function(e){},events:{"click .target":"ui_target"},ui_target:function(t){t.preventDefault(),e.history.navigate(this.model.get("target"),{trigger:!0})},onRender:function(){this.model.get("active")&&this.$el.addClass("active"),this.$(".icon").addClass(this.model.get("iconClass"))}}),r.Views.Tab=t.CollectionView.extend({tagName:"ul",className:"tab-inner",itemView:r.Views.TabItem,pushCSS:{display:"","box-sizing":"border-box"},initialize:function(e){e=e||{},this.collection=this.collection||new t.Collection(e)}}),r}),define("modules/bars/bars",["namespace","underscore","./title","./segment","./tab"],function(e,t,n,r,i){var s=e.app,o=e.module({name:"bars",append:!0});return t.extend(o.Views,n.Views),t.extend(o.Views,r.Views),t.extend(o.Views,i.Views),s.Bars=o.Views,o}),define("modules/demo/home",["namespace"],function(e){var t=e.app,n=e.module({name:"demo",append:!1}),r=e.Controller.extend({home:function(){t.push({views:{content:new n.Views.Main,title:new t.Bars.Title({title:"Welcome to Juggler",back:!1,next:!1})}})}});n.controller=new r;var i=e.Router.extend({appRoutes:{"":"home",home:"home"},controller:n.controller}),s=new i;n.Views.Main=e.ItemView.extend({tagName:"div",template:"demo/home",events:{},navToTransitions:function(e){e.preventDefault(),n.controller.navigate("transitions")},navToRegions:function(e){e.preventDefault(),n.controller.navigate("regions")}})}),define("modules/demo/transitions",["namespace"],function(e){var t=e.app,n=e.module(),r=e.Controller.extend({transitions:function(){t.push({views:{content:new n.Views.Main,title:new t.Bars.Title({title:"Page Transitions",next:!1}),tab:new t.Bars.Tab([{label:"Home",iconClass:"icon-home",target:"home"}])}})},"transition-slide":function(){t.push({effects:{title:t.stack.effects.noEffect},views:{content:new n.Views.TransitionDone,title:new t.Bars.Title({title:"Slide",next:!1})},tab:"keep"})},"transition-slide-reverse":function(){t.push({effects:{title:t.stack.effects.noEffect,content:t.stack.effects.slideReverse},views:{content:new n.Views.TransitionDone,title:new t.Bars.Title({title:"Slide-reverse",next:!1})},tab:"keep"})},"transition-fade":function(){t.push({effects:{title:t.stack.effects.noEffect,content:t.stack.effects.fade},views:{content:new n.Views.TransitionDone,title:new t.Bars.Title({title:"Fade",next:!1})},tab:"keep"})},"transition-stack":function(){t.push({effects:{title:t.stack.effects.noEffect,content:t.stack.effects.stack},views:{content:new n.Views.TransitionDone,title:new t.Bars.Title({title:"Stack",back:"back",next:!1})},tab:"keep"})},"transition-noeffect":function(){t.push({effects:{title:t.stack.effects.noEffect,content:t.stack.effects.noEffect},views:{content:new n.Views.TransitionDone,title:new t.Bars.Title({title:"NoEffect",back:"back",next:!1})},tab:"keep"})}});n.controller=new r;var i=e.Router.extend({appRoutes:{transitions:"transitions","transitions/transition-slide":"transition-slide","transitions/transition-slide-reverse":"transition-slide-reverse","transitions/transition-fade":"transition-fade","transitions/transition-stack":"transition-stack","transitions/transition-noeffect":"transition-noeffect"},controller:n.controller}),s=new i;n.Views.Main=e.ItemView.extend({tagName:"div",template:"demo/transitions",events:{},navToTransitionSlide:function(e){e.preventDefault(),n.controller.navigate("transition-slide")},navToTransitionFade:function(e){e.preventDefault(),n.controller.navigate("transition-fade")},navToTransitionStack:function(e){e.preventDefault(),n.controller.navigate("transition-stack")},navToTransitionNoEffect:function(e){e.preventDefault(),n.controller.navigate("transition-noeffect")}}),n.Views.TransitionDone=e.ItemView.extend({tagName:"div",template:"demo/done",events:{"click .back":"navPop"},navPop:function(e){e.preventDefault(),t.pop()}})}),define("modules/demo/regions",["namespace"],function(e){var t=e.app,n=e.module(),r=e.Controller.extend({regions:function(){t.push({views:{content:new n.Views.Main,title:new t.Bars.Title({title:"Page Regions",next:!1})}})},"region-title":function(){t.push({effects:{},views:{content:new n.Views.RegionDone,title:new t.Bars.Title({title:"Title with buttons",nextClass:"button"})}})},"region-titleSegmented":function(){t.push({effects:{},views:{content:new n.Views.RegionDone,title:new t.Bars.Segment({segments:[{label:"Home",target:"home",active:!0},{label:"Home2",target:"home"}]})}})},"region-header":function(){t.push({effects:{},views:{content:new n.Views.RegionDone,header:new t.Bars.Segment({inHeader:!0,segments:[{label:"Home",target:"home",active:!0},{label:"Home2",target:"home"}]})}})},"region-headerSecond":function(){t.push({effects:{},views:{content:new n.Views.RegionDone,header:new t.Bars.Segment({inHeader:!0,segments:[{label:"Home",target:"home",active:!0},{label:"Home2",target:"home"}]}),subheader:new n.Views.RegionSecondHeader}})},"region-tab":function(){t.push({effects:{},views:{content:new n.Views.RegionDone,tab:new t.Bars.Tab([{label:"Home",iconClass:"icon-home",target:"home"},{label:"Here",iconClass:"icon-arrow-up",active:!0}])}})}});n.controller=new r;var i=e.Router.extend({appRoutes:{regions:"regions","regions/title":"region-title","regions/titleSegmented":"region-titleSegmented","regions/header":"region-header","regions/headerSecond":"region-headerSecond","regions/tab":"region-tab"},controller:n.controller}),s=new i;n.Views.Main=e.ItemView.extend({tagName:"div",template:"demo/regions"}),n.Views.RegionDone=e.ItemView.extend({tagName:"div",template:"demo/done",events:{"click .back":"navPop"},navPop:function(e){e.preventDefault(),t.pop()}}),n.Views.RegionSecondHeader=e.ItemView.extend({tagName:"div",template:"demo/regionSecondHeader",allowAutoStackPositioning:!0,pushCSS:{"box-sizing":"border-box"}})}),define("modules/demo/ratchet",["namespace"],function(e){var t=e.app,n=e.module({name:"demo",append:!1}),r=e.Controller.extend({ratchet:function(){t.push({views:{content:new n.Views.Main,title:new t.Bars.Title({title:"Ratchet",next:!1})}})}});n.controller=new r;var i=e.Router.extend({appRoutes:{ratchet:"ratchet"},controller:n.controller}),s=new i;n.Views.Main=e.ItemView.extend({tagName:"div",template:"demo/ratchet",events:{"click .toggle":"onClickExampleToggle"},onClickExampleToggle:function(){this.$(".toggle").toggleClass("active")}})}),define("modules/demo/views",["namespace","underscore","./home","./transitions","./regions","./ratchet"],function(e,t){var n=e.app;return}),require(["namespace","jquery","backbone","modules/bars/bars","modules/demo/views"],function(e,t,n){var r=e.app;r.debug=!1,r.stack.addStackRegion("content",".content",{css:{position:"absolute",width:"100%"}}),r.stack.addStackRegion("title",".bar-title"),r.stack.addStackRegion("header",".bar-header"),r.stack.addStackRegion("subheader",".bar-header-secondary"),r.stack.addStackRegion("tab",".bar-tab"),r.addAsyncInitializer(function(e,t){r.isMobile&&r.isUIWebView?document.addEventListener("deviceready",t):t()}),r.start(function(){n.history.start()})}),define("main",function(){}),require.config({deps:["main"],paths:{libs:"../assets/js/libs",jquery:"../assets/js/libs/zepto-1.0rc1",jquery_noclickdelay:"../assets/js/libs/jquery-noclickdelay",standalone_deferred:"../assets/js/libs/standalone.deferred",underscore:"../assets/js/libs/lodash-0.3.2",handlebars:"../assets/js/libs/handlebars-1.0.0.beta.6",backbone:"../assets/js/libs/backbone-0.9.2",marionette:"../assets/js/libs/backbone.marionette-1.0.0rc2",ratchet:"../assets/js/libs/ratchet-1.0.0"},shim:{jquery:{deps:[],exports:"$"},jquery_noclickdelay:{deps:["jquery"]},standalone_deferred:{deps:["jquery"]},underscore:{deps:[],exports:"_"},handlebars:{deps:[],exports:"Handlebars"},marionette:{deps:["backbone","standalone_deferred"],exports:"Backbone.Marionette"},backbone:{deps:["underscore","jquery"],exports:"Backbone"},ratchet:{deps:["jquery"]}}}),define("config",function(){});