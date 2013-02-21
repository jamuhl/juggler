require([
  "namespace",

  // Libs
  "jquery",
  "backbone",

  "./settings",

  // Modules
  //"modules/data/appData",
  //"modules/translate/resourceSync",

  // common
  //"modules/common/common",
  //"modules/layout/layout",

  // pages
  "modules/bars/bars",
  "modules/demo/views"
],

function(ns, $, Backbone, settings) {

  // Shorthand the application namespace
  var app = ns.app;

  // init settings
  settings.init(ns);

  // regions
  // you could add regions like this app.addRegions({});
  // or use stackRegions for transitioning
  app.stack.addStackRegion('content', '.content', {
    css: { position:'absolute', width: '100%' }
  });

  app.stack.addStackRegion('title', '.bar-title');
  app.stack.addStackRegion('header', '.bar-header');
  app.stack.addStackRegion('subheader', '.bar-header-secondary');
  app.stack.addStackRegion('tab', '.bar-tab');

  // initialize
  app.addAsyncInitializer(function(options, done) {
    if (app.isPhoneGap) {
      // This is running on a device so waiting for deviceready event
      document.addEventListener('deviceready', done);
    } else {
      // On desktop don't have to wait for anything
      done();
    }
  });

  app.start(function() {
    Backbone.history.start(/*{ pushState: true }*/);
  });

});