define([
  // Libs
  "jquery",
  "underscore",
  "backstrapp/backstrapp",
  "backbone",
  "handlebars",
  "preconditions"
],

function($, _, backstrapp, Backbone, Handlebars) {
  
  var ns = _.extend({

    modules: {},

    // Create a custom object with a nested Views object
    module: function(additionalProps) {
    var module = _.extend({ Views: {}, Models: {}, Collections: {} }, additionalProps);

    if (module.name && module.append === true) {
      this.modules[module.name] = module;
    }
    
    return module;
  }

  }, backstrapp);

  

  return ns;
});
