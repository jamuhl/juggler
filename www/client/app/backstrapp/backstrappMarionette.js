define([
  'underscore',  
  'backbone',
  'marionette',
  'handlebars',
  './templateLoader'
],

function(_, Backbone, Marionette, Handlebars, Loader) {

  var ns = {}
    , mario = Backbone.Marionette;

  // append to ns
  ns.Marionette = mario;

  // layout
  ns.Layout = mario.Layout;
  ns.CompositeView = mario.CompositeView;
  ns.Region = mario.Region;

  // add logging functions
  mario.Region.prototype.log = function(obj, view, transition, action) {
    if (ns.app.debug !== true) return;

    transition = transition || { name: 'defaultEffect' };

    var msg = 'region --- ' + action.toUpperCase() + ' (with ' + transition.name + ')';

    if (view && view.template) {
      msg = view.cid + '::' + view.template +
      ' --- ' + action.toUpperCase() + ' (with ' + transition.name + ')';
    }

    if (view && view.itemView) {
      msg = view.cid + '::' + view.itemView.prototype.template + '_Collection' + 
      ' --- ' + view.collection.length + ' ITEMS ' + action.toUpperCase() + ' (with ' + transition.name + ')';
    }

    if (ns.app.log('info', msg, obj));
  };

  mario.View.prototype.log = function(obj, action) {
    if (ns.app.debug !== true) return;

    var msg = '';

    if (this.template) {
      msg = obj.cid + '::' + this.template +
      ' --- ' + action.toUpperCase();
    }

    if (this.itemView) {
      msg = obj.cid + '::' + this.itemView.prototype.template + '_Collection' + 
      ' --- ' + this.collection.length + ' ITEMS ' + action.toUpperCase();
    }

    if (ns.app.log('info', msg, obj));
  };

  // extend objects with logging calls
  ns.Layout = mario.Layout.extend({
    constructor: function() {
      var self = this; 

      if (arguments.length > 0 && arguments[0].parent) {
        this.parent = arguments[0].parent;
        this.parent.on("item:before:close", function() {
          self.close();
        });
      } 

      mario.Layout.prototype.constructor.apply(this, arguments);
      this.log(this, 'constructed');

      this.bindTo(this, 'show', function() { self.log(self, 'showed'); }, this);
    },

    render: function() {
       var deferrer = mario.Layout.prototype.render.apply(this);
       this.log(this, 'rendered');
       return deferrer;
    },

    close: function() {
       mario.Layout.prototype.close.apply(this);
       this.log(this, 'closed');
    }
  });

  ns.ItemView = mario.ItemView.extend({
    constructor: function() {
      var self = this; 

      if (arguments.length > 0 && arguments[0].parent) {
        this.parent = arguments[0].parent;
        this.parent.on("item:before:close", function() {
          self.close();
        });
      } 

      mario.ItemView.prototype.constructor.apply(this, arguments);
      this.log(this, 'constructed');

      this.bindTo(this, 'show', function() { self.log(self, 'showed'); }, this);
    },

    render: function() {
       var deferrer = mario.ItemView.prototype.render.apply(this);
       this.log(this, 'rendered');
       return deferrer;
    },

    close: function() {
       mario.ItemView.prototype.close.apply(this);
       this.log(this, 'closed');
    }

  });
  
  ns.CollectionView = mario.CollectionView.extend({
    constructor: function() {
      var self = this; 

      if (arguments.length > 0 && arguments[0].parent) {
        this.parent = arguments[0].parent;
        this.parent.on("item:before:close", function() {
          self.close();
        });
      }

      mario.CollectionView.prototype.constructor.apply(this, arguments);
      this.log(this, 'constructed');

      this.bindTo(this, 'show', function() { self.log(self, 'showed'); }, this);
    },

    render: function() {
       var deferrer = mario.CollectionView.prototype.render.apply(this);
       this.log(this, 'rendered');
       return deferrer;
    },

    close: function() {
       mario.CollectionView.prototype.close.apply(this);
       this.log(this, 'closed');
    }
  });

  // add async initializers to app
  mario.Application.prototype.origStart = mario.Application.prototype.start;

  _.extend(mario.Application.prototype, {
    asyncInitializers: [],
    addAsyncInitializer: function(fn) {
      this.asyncInitializers.push(fn);
    },
    start: function(options, cb) {
      if (typeof options === 'function') {
        cb = options;
        options = {};
      }
      options = options || {};

      var todo = this.asyncInitializers.length;
      function done() {
        todo--;

        if (!todo && cb) cb(); 
      }

      // initAsyncs
      for (var i = 0, len = todo; i < len; i++) {
        this.asyncInitializers[i](options, done);
      }

      this.origStart(options);
    }
  });

  // add an App
  ns.app = new mario.Application();
  ns.app.store = new Backbone.Model();
  ns.app.log = function(lvl, msg, src) {
    if (ns.app.debug !== true) return;
    if (window.console && window.console.log) {
      console.log(lvl.toUpperCase() + ':: ' + msg);
    }
  };
  ns.app.navigate = function(route, options) {
    Backbone.history.navigate(route, options);
  };

  // override template rendering with our own implementation (dist -> JST, boil -> AJAX)
  Backbone.Marionette.TemplateCache.prototype.loadTemplate = function(templateId) {
    var self = this;

    return Loader.fetchTemplate(templateId);    
  };

  Backbone.Marionette.TemplateCache.prototype.compileTemplate = function(tmpl) {
    var ret = (_.isFunction(tmpl)) ? tmpl : Handlebars.compile(tmpl);
    return ret;
  };
  
  // shortcut to renderer
  ns.renderer = mario.Renderer;
  ns.renderer.renderTemplate = function (template, data) {
    if (!template) return null;
    if (typeof template == 'string') template = mario.TemplateCache.get(template);
    var rendering = template(data);
    return rendering;
  };

  return ns;

});