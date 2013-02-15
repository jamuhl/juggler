define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module();

  var Controller = ns.Controller.extend({
    ratchet: function() {
      app.push({
        views: {
          content: new module.Views.Main(),
          title: new app.Bars.Title({
            title: 'Ratchet',
            next: false
          })
        }
      });
    }
  });
  module.controller = new Controller();

  var Router = ns.Router.extend({
    appRoutes: {
      'ratchet': 'ratchet'
    },
    
    controller: module.controller
  });
  var router = new Router();

  module.Views.Main = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/ratchet',

    events: {
      'click .toggle': 'onClickExampleToggle'
    },

    onClickExampleToggle: function() {
      // Simple example of how the on/off toggle switch works.
      // to support touch in desktop browser you might
      // want to include ratchet's fingerblast.js
      // https://github.com/maker/ratchet/tree/master/docs/js
      this.$('.toggle').toggleClass('active');
    }
  });

});