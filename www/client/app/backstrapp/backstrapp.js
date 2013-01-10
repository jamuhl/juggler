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
    './qs',
    './effects/Effect'
],

function(_, Backbone, BackstrappMarionette, 
    BaseCollection, BaseModel, BaseController, BaseRouter, 
    stackRegion, stackManager, appSettings, qs, effect) {

	// override Backbone sync
	Backbone.sync = function(method, model, options) {
        var type = methodMap[method];

        // __only change is here__ only allow get!
        if (type !== 'GET') {
            return options.success();
        } else {
            origSync(method, model, options);
        }
    };

    // Mappings from backbone to server methode.
    var methodMap = {
     'create': 'POST',
     'update': 'PUT',
     'delete': 'DELETE',
     'read': 'GET'
    };


    // bootstrap namespace
	var ns = _.extend({}, BackstrappMarionette);

    // init stackManager
    stackManager.init(ns);
    appSettings.init(ns);

	ns.Collection = BaseCollection;
	ns.Model = BaseModel;
	ns.Controller = BaseController;
	ns.Router = BaseRouter;
    ns.StackRegion = stackRegion;
	ns.qs = qs;

    effect.prototype.log = function(lvl, msg, obj) {
        if (ns.app.debug !== true) return;


        if (ns.app.log(lvl, msg, obj));
    };

	return ns;
});