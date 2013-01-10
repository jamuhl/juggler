define([
  'namespace'
],

function(ns) {
  var app = ns.app;

  // Create a new module
  var module = ns.module();

  var Controller = ns.Controller.extend({
    regions: function() {
      app.push({
        views: {
          content: new module.Views.Main(),
          title: new app.Bars.Title({ title: 'Page Regions', next: false })
        }
      });
    },
    'region-title': function() {
      app.push({
        effects: {
          //title: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.RegionDone(),
          title: new app.Bars.Title({ title: 'Title with buttons', nextClass: 'button' })
        }
      });
    },
    'region-titleSegmented': function() {
      app.push({
        effects: {
          //title: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.RegionDone(),
          title: new app.Bars.Segment({
            segments: [
              { label: 'Home', target: 'home', active: true },
              { label: 'Home2', target: 'home' }
            ]          
          })
        }
      });
    },
    'region-header': function() {
      app.push({
        effects: {
          //title: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.RegionDone(),
          header: new app.Bars.Segment({
            inHeader: true,
            segments: [
              { label: 'Home', target: 'home', active: true },
              { label: 'Home2', target: 'home' }
            ]          
          })
        }
      });
    },
    'region-headerSecond': function() {
      app.push({
        effects: {
          //title: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.RegionDone(),
          header: new app.Bars.Segment({
            inHeader: true,
            segments: [
              { label: 'Home', target: 'home', active: true },
              { label: 'Home2', target: 'home' }
            ]          
          }),
          subheader: new module.Views.RegionSecondHeader()
        }
      });
    },
    'region-tab': function() {
      app.push({
        effects: {
          //title: app.stack.effects.noEffect
        },
        views: {
          content: new module.Views.RegionDone(),
          tab: new app.Bars.Tab([
            { label: 'Home', iconClass: 'icon-home', target: 'home' },
            { label: 'Here', iconClass: 'icon-arrow-up', active: true }
          ])
        }
      });
    }
  });
  module.controller = new Controller();

  var Router = ns.Router.extend({
    appRoutes: {
      'regions': 'regions',
      'regions/title': 'region-title',
      'regions/titleSegmented': 'region-titleSegmented',
      'regions/header': 'region-header',
      'regions/headerSecond': 'region-headerSecond',
      'regions/tab': 'region-tab'
    },
    
    controller: module.controller
  });
  var router = new Router();

  module.Views.Main = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/regions'
  });

  module.Views.RegionDone = ns.ItemView.extend({
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

  module.Views.RegionSecondHeader = ns.ItemView.extend({
    tagName: 'div',
    template: 'demo/regionSecondHeader',
    allowAutoStackPositioning: true,
    pushCSS: { 'box-sizing': 'border-box' }
  });

});