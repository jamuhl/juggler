define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module({ name: 'demo', append: false });

  var Controller = ns.Controller.extend({
    transitions: function() {
      app.push({
        views: {
          content: new module.Views.Main(),
          title: new app.Bars.Segment({
            title: 'Page Transitions',
            back: 'back',
            next: false,
            segments: [
              {
                label: 'Home',
                target: 'home',
                active: true
              },
              {
                label: 'Home2',
                target: 'home'
              }
            ]
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
            back: 'back',
            next: false
          })
        },
        tab: 'keep'
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
            back: 'back',
            next: false
          })
        },
        tab: 'keep'
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
          })
        },
        tab: 'keep'
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
          })
        },
        tab: 'keep'
      });
    }
  });
  module.controller = new Controller();

  var Router = ns.Router.extend({
    appRoutes: {
      'transitions': 'transitions',
      'transition-slide': 'transition-slide',
      'transition-fade': 'transition-fade',
      'transition-stack': 'transition-stack',
      'transition-noeffect': 'transition-noeffect'
    },
    
    controller: module.controller
  });
  var router = new Router();

  module.Views.Main = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/transitions',

    events: {
      'click .transitionSlide': 'navToTransitionSlide',
      'click .transitionFade': 'navToTransitionFade',
      'click .transitionStack': 'navToTransitionStack',
      'click .transitionNoEffect': 'navToTransitionNoEffect'
    },

    navToTransitionSlide: function(e) {
      e.preventDefault();

      module.controller.navigate('transition-slide');
    },

    navToTransitionFade: function(e) {
      e.preventDefault();

      module.controller.navigate('transition-fade');
    },

    navToTransitionStack: function(e) {
      e.preventDefault();

      module.controller.navigate('transition-stack');
    },

    navToTransitionNoEffect: function(e) {
      e.preventDefault();

      module.controller.navigate('transition-noeffect');
    }
  });

  module.Views.TransitionDone = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/transition-done',

    events: {
      'click .back': 'navPop'
    },

    navPop: function(e) {
      e.preventDefault();

      app.pop();
    }
  });

});