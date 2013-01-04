// Set the require.js configuration for your application.
require.config({
    // Initialize the application with the main application file
    deps: ['main'],

    paths: {
        // JavaScript folders
        libs: '../assets/js/libs',

        // Libraries

        jquery: '../assets/js/libs/jquery-1.7.2',
        underscore: '../assets/js/libs/lodash-0.3.2', // drop in replacement
        handlebars: "../assets/js/libs/handlebars-1.0.0.beta.6",

        backbone: "../assets/js/libs/backbone-0.9.2",
        marionette: "../assets/js/libs/backbone.marionette-0.9.5",
        marionette_async: "../assets/js/libs/backbone.marionette.async-0.9.5"
    },

    shim: {
        underscore: {
            deps: [],
            exports: '_'
        },

        handlebars: {
            deps: [],
            exports: 'Handlebars'
        },

        marionette: {
            deps: ['backbone'],
            exports: 'Backbone.Marionette'
        },

        marionette_async: {
            deps: ['backbone', 'marionette'],
            exports: 'Backbone.Marionette'
        },

        backbone: {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        }
    }
});
