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

      app.push({
        views: {
          content: view,
          title: new ns.modules.bars.Views.Main({
            model: new Backbone.Model({ title: 'home' })
          })
        }
      });
    },

    next: function() {
      var view = new module.Views.Next();

      app.push({
        effects: {
          content: app.stack.effects.fade
        },
        views: {
          content: view
          // , title: new ns.modules.bars.Views.Main({
          //   model: new Backbone.Model({ title: 'next' })
          // })
          , title: 'keep'
        }
      });
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
    template: 'demo/home',

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
    template: 'demo/next',

    popEffect: app.stack.effects.fade,

    initialize: function(options) {
    },

    events: {
      'click .back': 'back'
    },

    back: function(e) {
      e.preventDefault();

      // module.controller.navigate('home');
      app.pop({
        effects: {
          content: app.stack.effects.slide,
          title: app.stack.effects.fade
        }
      });
    }
  });
});