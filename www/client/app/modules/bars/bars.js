define([
    'namespace',
    'underscore',
     './directional'
],

function(ns, _, directional) {
	var app = ns.app;

    // Create a new module
    var module = ns.module({ name: 'bars', append: true });

    _.extend(module.Views, directional.Views);

    // add shortcut
    app.Bars = module.Views;

    // Required, return the module for AMD compliance
    return module;
});