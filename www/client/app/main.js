require([
    "namespace",

    // Libs
    "jquery",
    "backbone",

    // Modules
    //"modules/data/appData",
    //"modules/translate/resourceSync",

    // common
    //"modules/common/common",
    //"modules/layout/layout",

    // pages
    "modules/demo/home"
],

function(ns, $, Backbone) {

    // Shorthand the application namespace
    var app = ns.app;

    app.isMobile = navigator.userAgent.match(/(iPad|iPhone|Android)/);

    // turn on debugging
    app.debug = false;

    app.store = new Backbone.Model();

    app.addRegions({
        content: '.content'
    });

    app.addAsyncInitializer(function(options, done) {
        if (app.isMobile) {
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
