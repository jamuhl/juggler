define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module();

  var Controller = ns.Controller.extend({
    transitions: function() {
      app.push({
        views: {
          content: new module.Views.Main(),
          title: new app.Bars.Title({
            title: 'Page Transitions',
            next: false
          }),
          tab: new app.Bars.Tab([
            {
              label: 'Home',
              iconClass: 'icon-home',
              target: 'home'
            }
          ])
        }
      });
    },
    'transition-slide': function() {
      app.push({
        effects: {
          title: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.TransitionDone(),
          title: new app.Bars.Title({
            title: 'Slide',
            next: false
          }),
          tab: 'keep'
        }
      });
    },
    'transition-slide-reverse': function() {
      app.push({
        effects: {
          title: app.stack.effects.noEffect,
          content: app.stack.effects.slideReverse
        },
        views: {
          content: new module.Views.TransitionDone(),
          title: new app.Bars.Title({
            title: 'Slide-reverse',
            next: false
          }),
          tab: 'keep'
        }
      });
    },
    'transition-fade': function() {
      app.push({
        effects: {
          title: app.stack.effects.noEffect,
          content: app.stack.effects.fade
        },
        views: {
          content: new module.Views.TransitionDone(),
          title: new app.Bars.Title({
            title: 'Fade',
            next: false
          }),
          tab: 'keep'
        }
      });
    },
    'transition-stack': function() {
      app.push({
        effects: {
          title: app.stack.effects.noEffect,
          content: app.stack.effects.stack
        },
        views: {
          content: new module.Views.TransitionDone(),
          title: new app.Bars.Title({
            title: 'Stack',
            back: 'back',
            next: false
          }),
          tab: 'keep'
        }
      });
    },
    'transition-noeffect': function() {
      app.push({
        effects: {
          title: app.stack.effects.noEffect,
          content: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.TransitionDone(),
          title: new app.Bars.Title({
            title: 'NoEffect',
            back: 'back',
            next: false
          }),
          tab: 'keep'
        }
      });
    }
  });
  module.controller = new Controller();

  var Router = ns.Router.extend({
    appRoutes: {
      'transitions': 'transitions',
      'transitions/transition-slide': 'transition-slide',
      'transitions/transition-slide-reverse': 'transition-slide-reverse',
      'transitions/transition-fade': 'transition-fade',
      'transitions/transition-stack': 'transition-stack',
      'transitions/transition-noeffect': 'transition-noeffect'
    },
    
    controller: module.controller
  });
  var router = new Router();

  module.Views.Main = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/transitions'
  });

  module.Views.TransitionDone = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/done',

    events: {
      'click .back': 'navPop'
    },

    navPop: function(e) {
      e.preventDefault();

      app.pop();
    }
  });

});