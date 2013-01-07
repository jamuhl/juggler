define([
    'namespace'
],

function(ns) {
	var app = ns.app;

    // Create a new module
    var module = ns.module({ name: 'bars', append: true });

    module.Views.Main = ns.ItemView.extend({
        tagName: 'div',
        template: 'bars/title',

        initialize: function(options) {
        },

        events: {
            //'click .next': 'next'
        },

        next: function(e) {
            e.preventDefault();

            module.controller.navigate('next');
        }
    });
});