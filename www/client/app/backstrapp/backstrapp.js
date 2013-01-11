define([
  'underscore',
  'backbone',
  './backstrappMarionette',
  './baseCollection',
  './baseModel',
  './baseController',
  './baseRouter',
  './stackRegion',
  './stackManager',
  './appSettings',
  './effects/Effect'
],

function(_, Backbone, BackstrappMarionette, 
  BaseCollection, BaseModel, BaseController, BaseRouter, 
  stackRegion, stackManager, appSettings, effect) {

  // bootstrap namespace
  var ns = BackstrappMarionette;

  // init stackManager and app settings
  stackManager.init(ns);
  appSettings.init(ns);

  // shortcut most important objects
  ns.Collection = BaseCollection;
  ns.Model = BaseModel;
  ns.Controller = BaseController;
  ns.Router = BaseRouter;
  ns.StackRegion = stackRegion;

  // extend effect with a logging function
  effect.prototype.log = function(lvl, msg, obj) {
    if (ns.app.debug !== true) return;

    if (ns.app.log(lvl, msg, obj));
  };

  return ns;
});