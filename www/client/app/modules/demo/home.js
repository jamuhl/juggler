define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module({ name: 'demo', append: false });

  var Controller = ns.Controller.extend({
    home: function() {
      app.push({
        views: {
          content: new module.Views.Main()//,
          // title: new app.Bars.Title({
          //   title: 'Welcome to Juggler',
          //   back: false,
          //   next: false
          // })
        }
      });
    }
  });
  module.controller = new Controller();

  var Router = ns.Router.extend({
    appRoutes: {
      '': 'home',
      'home': 'home'
    },
    
    controller: module.controller
  });
  var router = new Router();

  module.Views.Main = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/home'
  });

});