// Set the require.js configuration for your application.
require.config({
  // Initialize the application with the main application file
  deps: ['main'],

  paths: {
    // JavaScript folders
    libs: '../assets/js/libs',

    // Libraries
    /*shimClassList: '../assets/js/libs/shim_classList',*/ // uncomment if running on non html5 browser aka android 2.x

    jquery: '../assets/js/libs/zepto-1.0rc1',
    jquery_noclickdelay: "../assets/js/libs/jquery-noclickdelay",
    standalone_deferred: '../assets/js/libs/standalone.deferred',

    underscore: '../assets/js/libs/lodash-0.3.2', // drop in replacement
    handlebars: "../assets/js/libs/handlebars-1.0.0-rc.3",

    backbone: "../assets/js/libs/backbone-0.9.2",
    marionette: "../assets/js/libs/backbone.marionette-1.0.0rc2",

    ratchet: "../assets/js/libs/ratchet-1.0.0"
  },

  shim: {
    /*shimClassList: {
      deps: []
    },*/ // uncomment if running on non html5 browser aka android 2.x

    jquery: {
      deps: [],
      exports: '$'
    },

    jquery_noclickdelay: {
      deps: ['jquery']
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
    },

    ratchet: {
      deps: ['jquery']
    }
  }
});
