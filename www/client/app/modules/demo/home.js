define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  var module = ns.module();

  var Controller = ns.Controller.extend({
    home: function() {
      app.push({
        views: {
          content: new module.Views.Main()
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