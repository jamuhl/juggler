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
      this.app.pop = function() { self.pop(); };
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

      // push views
      _.each(container.stacks, function(value, key, index) {
        if (self.app[key] && self.app[key].push) self.app[key].push(value, value.pushEffect);
      });

      var toHide = _.difference(this.stackRegions, _.keys(container.stacks));
      _.each(toHide, function(key) {
        if (self.app[key] && self.app[key].hide) self.app[key].hide();
      });

      this.viewStack.push(container);

    },

    pop: function() {
      var self = this;

      var container = this.viewStack.pop();

      var toShow = _.difference(this.stackRegions, _.keys(container.stacks));
      _.each(toShow, function(key) {
        if (self.app[key] && self.app[key].show) self.app[key].show();
      });

      // pop views
      _.each(container.stacks, function(value, key, index) {
        if (self.app[key] && self.app[key].pop) self.app[key].pop(value.popEffect);
      });
    }

  };

  return stack;

});