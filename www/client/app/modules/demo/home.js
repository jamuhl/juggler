define([
    'namespace'
],

function(ns) {
	var app = ns.app;

    // Create a new module
    var module = ns.module({ name: 'demo', append: false });

    var Controller = ns.Controller.extend({
        home: function() {
            var view = new module.Views.Main();
            app.content.show(view);
        },

        next: function() {
            var view = new module.Views.Next();
            app.content.show(view);
        }
    });
    module.controller = new Controller();

    var Router = ns.Router.extend({
        appRoutes: {
            '': 'home',
            'home': 'home',
            'next': 'next'
        },
        
        controller: module.controller
    });
    var router = new Router();

    module.Views.Main = ns.ItemView.extend({
        tagName: 'div',
        template: 'home',

        initialize: function(options) {
        },

        events: {
            'click .next': 'next'
        },

        next: function(e) {
            e.preventDefault();

            module.controller.navigate('next');
        }
    });

    module.Views.Next = ns.ItemView.extend({
        tagName: 'div',
        template: 'next',

        initialize: function(options) {
        },

        events: {
            'click .back': 'back'
        },

        back: function(e) {
            e.preventDefault();

            // module.controller.navigate('home');
            app.content.back();
        }
    });
});