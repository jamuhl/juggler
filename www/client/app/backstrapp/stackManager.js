define([
  'underscore',
  './stackEffects'
],

function(_, effects) {

  var stack = {

    init: function(ns) {
      var self = this;

      this.ns = ns;
      this.app = ns.app;

      this.app.stack = this;
      this.app.stack.effects = effects;

      this.app.push = function(container) { self.push(container); };
      this.app.pop = function(container) { self.pop(container); };
    },

    stackRegions: [],
    viewStack: [],

    addStackRegion: function(name, selector, options) {
      options = options || {};
      options.el = selector;

      this.app[name] = new this.ns.StackRegion(options);
      this.stackRegions.push(name);
    },

    push: function(container) {
      var self = this;

      container.effects = container.effects || {};

      // push views
      _.each(container.views, function(value, key, index) {
        if (value !== 'keep' && self.app[key] && self.app[key].push) self.app[key].push(value, container.effects[key] || value.pushEffect);
      });

      var toHide = _.difference(this.stackRegions, _.keys(container.views));
      _.each(toHide, function(key) {
        if (self.app[key] && self.app[key].hide) self.app[key].hide(container.effects[key]);
      });

      this.viewStack.push(container);

    },

    pop: function(container) {
      var self = this;

      container = container || {};
      _.defaults(container, this.viewStack.pop());
      container.effects = container.effects || {};

      var toShow = _.difference(_.keys(this.viewStack[0].views), _.keys(container.views));
      _.each(toShow, function(key) {
        if (self.app[key] && self.app[key].show) self.app[key].show(container.effects[key]);
      });

      // pop views
      _.each(container.views, function(value, key, index) {
        if (value !== 'keep' && self.app[key] && self.app[key].pop) self.app[key].pop((container.effects[key] ? container.effects[key].reverse : null )|| value.popEffect);
      });
    }

  };

  return stack;

});