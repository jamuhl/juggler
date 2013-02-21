define([
  'underscore'
],

function(_) {

  var appSettings = {

    init: function(ns) {
      var app = ns.app;

      // settings
      app.debug = true;

      // log device here
      if (app.debug) app.log('INFO', JSON.stringify(app.device, null, 2), app);
    }

  };



  return appSettings;

});