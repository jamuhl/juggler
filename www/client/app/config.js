// Set the require.js configuration for your application.
require.config({
    // Initialize the application with the main application file
    deps: ['main'],

    paths: {
        // JavaScript folders
        libs: '../assets/js/libs',

        // Libraries

        jquery: '../assets/js/libs/zepto-1.0rc1',
        standalone_deferred: '../assets/js/libs/standalone.deferred',

        underscore: '../assets/js/libs/lodash-0.3.2', // drop in replacement
        handlebars: "../assets/js/libs/handlebars-1.0.0.beta.6",

        backbone: "../assets/js/libs/backbone-0.9.2",
        //backbone_touch: "../assets/js/libs/backbone.touch-0.2",
        marionette: "../assets/js/libs/backbone.marionette-1.0.0rc2"
    },

    shim: {
        jquery: {
            deps: [],
            exports: '$'
        },

        standalone_deferred: {
            deps: ['jquery']
        }, 

        underscore: {
            deps: [],
            exports: '_'
        },

        handlebars: {
            deps: [],
            exports: 'Handlebars'
        },

        marionette: {
            deps: ['backbone', 'standalone_deferred'],
            exports: 'Backbone.Marionette'
        },

        backbone: {
            deps: ['underscore', 'jquery'],
            exports: 'Backbone'
        }
    }
});
