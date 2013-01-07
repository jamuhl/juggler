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
    "modules/bars/title",
    "modules/demo/home"
],

function(ns, $, Backbone) {

    // Shorthand the application namespace
    var app = ns.app;

    app.isMobile = navigator.userAgent.match(/(iPad|iPhone|Android)/);

    // turn on debugging
    app.debug = false;

    // regions
    app.addRegions({
        title: {
            selector: '.bar-title',
            regionType: ns.StackRegion
        }
    });
    app.content = new ns.StackRegion({
        el: '.content',
        css: { position:'absolute', width: '100%' }
    });

    // push/pop
    app.push = function(container) {
        _.each(container, function(value, key, index) {
            if (app[key] && app[key].push) app[key].push(value);
        });
    };
    app.pop = function() {
        app.content.pop();
        app.title.pop();
    };

    // initialize
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
        $('.content').html('');
        Backbone.history.start(/*{ pushState: true }*/);
    });

});
